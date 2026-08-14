"""FastAPI serving surface for recorded contracts and real uploaded-image inference."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from peregrine import __version__
from peregrine.inference import InferenceError, OnnxDetector
from peregrine.pipeline import observed_run

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
    run = observed_run()
    target_key = _target_key(request.target)
    target = run["targets"][target_key]
    detections: list[Detection] = []
    for item in target["predictions"]:
        if item["image_id"] == request.image_id:
            detections.append(
                Detection(
                    label=item["label"],
                    confidence=item["confidence"],
                    box=[item["x1"], item["y1"], item["x2"], item["y2"]],
                )
            )
    return PredictResponse(
        model_version=str(run["fingerprint"]),
        dataset_hash=str(run["dataset_hash"]),
        target=target_key,
        detections=detections,
        boundary=(
            "recorded contract predictions; use /api/predict for live uploaded-image inference"
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
