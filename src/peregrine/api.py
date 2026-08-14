"""FastAPI serving surface for recorded contracts and real uploaded-image inference."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from peregrine import __version__
from peregrine.inference import InferenceError, OnnxDetector

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


class PredictRequest(BaseModel):
    """A minimal image request contract."""

    image_id: str = Field(examples=["wh-0005"])
    target: str = Field(default="x86_tflite_int8")


class Detection(BaseModel):
    """One detection returned by the contract endpoint."""

    label: str
    confidence: float
    box: list[float]


class PredictResponse(BaseModel):
    """Prediction response with lineage attached."""

    model_version: str
    dataset_hash: str
    target: str
    detections: list[Detection]
    boundary: str


class LiveImage(BaseModel):
    """Dimensions of the decoded source image."""

    width: int
    height: int


class LivePredictResponse(BaseModel):
    """Real ONNX inference response with per-request and model lineage."""

    runtime: str
    target: str
    model_sha256: str
    image: LiveImage
    inference_ms: float
    confidence_threshold: float
    detections: list[Detection]
    retention: str


class PlatformResponse(BaseModel):
    """Live deployment identity joined to the observed evidence lineage."""

    service: str
    revision: str
    region: str
    runtime: str
    model_sha256: str
    run_id: str
    dataset_fingerprint: str
    image_digest: str
    min_instances: int
    max_instances: int
    concurrency: int
    cpu: str
    memory: str


app = FastAPI(title="Peregrine", version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "PEREGRINE_CORS_ORIGINS",
            "http://127.0.0.1:8013,http://localhost:8013,https://peregrine.devopsdive.com",
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

_detector: OnnxDetector | None = None


@app.get("/healthz")
@app.get("/api/healthz")
def healthz() -> dict[str, object]:
    """Return liveness and the contract boundary."""
    return {
        "ok": True,
        "version": __version__,
        "runtime": "onnxruntime-cpu" if _model_path().is_file() else "offline-contract",
    }


@app.get("/readyz")
def readyz() -> dict[str, object]:
    """Load and verify the immutable model before declaring the revision ready."""
    try:
        detector = _get_detector()
    except InferenceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {"ready": True, "model_sha256": detector.model_sha256}


@app.get("/api/platform", response_model=PlatformResponse)
def platform() -> PlatformResponse:
    """Expose non-secret facts about the exact serving revision and its parents."""
    run = _observed_snapshot()
    detector = _get_detector()
    return PlatformResponse(
        service=os.getenv("K_SERVICE", "peregrine-local"),
        revision=os.getenv("K_REVISION", "local"),
        region=os.getenv("PEREGRINE_REGION", "us-central1"),
        runtime="ONNX Runtime · CPUExecutionProvider",
        model_sha256=detector.model_sha256,
        run_id=str(run["run_id"]),
        dataset_fingerprint=str(run["lineage"]["dataset_fingerprint"]),
        image_digest=os.getenv("PEREGRINE_IMAGE_DIGEST", "local-image"),
        min_instances=int(os.getenv("PEREGRINE_MIN_INSTANCES", "0")),
        max_instances=int(os.getenv("PEREGRINE_MAX_INSTANCES", "1")),
        concurrency=int(os.getenv("PEREGRINE_CONCURRENCY", "4")),
        cpu=os.getenv("PEREGRINE_CPU", "1"),
        memory=os.getenv("PEREGRINE_MEMORY", "1Gi"),
    )


@app.post("/api/predict", response_model=LivePredictResponse)
async def predict_image(
    request: Request,
    confidence: float = Query(default=0.25, ge=0.05, le=0.95),
) -> LivePredictResponse:
    """Run real ONNX inference on an in-memory JPEG, PNG, or WebP request body."""
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail="Use a JPEG, PNG, or WebP image.")
    declared_size = request.headers.get("content-length")
    if declared_size:
        try:
            if int(declared_size) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail="Image exceeds the 5 MiB limit.")
        except ValueError as error:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header.") from error
    payload = bytearray()
    async for chunk in request.stream():
        payload.extend(chunk)
        if len(payload) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds the 5 MiB limit.")
    try:
        result = _get_detector().predict(bytes(payload), confidence=confidence)
    except InferenceError as error:
        status_code = 503 if "model" in str(error) or "onnxruntime" in str(error) else 422
        raise HTTPException(status_code=status_code, detail=str(error)) from error
    return LivePredictResponse(
        runtime="ONNX Runtime · CPUExecutionProvider",
        target="x86_onnx_fp32",
        model_sha256=result.model_sha256,
        image=LiveImage(width=result.width, height=result.height),
        inference_ms=round(result.latency_ms, 3),
        confidence_threshold=confidence,
        detections=[
            Detection(label=item.label, confidence=item.confidence, box=list(item.box))
            for item in result.detections
        ],
        retention="processed in memory; image bytes are not retained",
    )


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    """Serve recorded contract predictions for an image id."""
    run = _observed_snapshot()
    target_key = _target_key(request.target)
    if target_key not in run["targets"]:
        raise HTTPException(status_code=404, detail="target is not present in observed evidence")
    return PredictResponse(
        model_version=str(run["fingerprint"]),
        dataset_hash=str(run["dataset_hash"]),
        target=target_key,
        detections=[],
        boundary=(
            "aggregate recorded evidence has no per-image predictions; "
            "use /api/predict for live uploaded-image inference"
        ),
    )


def _target_key(value: str) -> str:
    aliases = {
        "fp32": "x86_onnx_fp32",
        "onnx": "x86_onnx_fp32",
        "int8": "x86_tflite_int8",
        "tflite": "x86_tflite_int8",
        "arm64": "arm64_tflite_int8",
    }
    return aliases.get(value, value)


def _model_path() -> Path:
    return Path(os.getenv("PEREGRINE_MODEL_PATH", "models/best.onnx"))


def _observed_snapshot() -> dict[str, Any]:
    """Read the immutable deployed snapshot without re-evaluating repository-only gates."""
    path = _artifact_dir / "observed/latest.json"
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(status_code=503, detail="observed evidence is unavailable") from error
    if not isinstance(value, dict) or not isinstance(value.get("lineage"), dict):
        raise HTTPException(status_code=503, detail="observed evidence is invalid")
    return value


def _get_detector() -> OnnxDetector:
    global _detector
    if _detector is None:
        _detector = OnnxDetector(_model_path())
        expected = os.getenv("PEREGRINE_MODEL_SHA256")
        if expected and _detector.model_sha256 != expected:
            _detector = None
            raise InferenceError("model fingerprint does not match the deployed contract")
    return _detector


_artifact_dir = Path(os.getenv("PEREGRINE_ARTIFACT_DIR", "artifacts"))
_site_dir = Path(os.getenv("PEREGRINE_SITE_DIR", "site"))
if _artifact_dir.is_dir():
    app.mount("/artifacts", StaticFiles(directory=_artifact_dir), name="artifacts")
if _site_dir.is_dir():
    app.mount("/", StaticFiles(directory=_site_dir, html=True), name="site")
