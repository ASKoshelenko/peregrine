"""FastAPI contract for Peregrine serving."""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel, Field

from peregrine import __version__
from peregrine.pipeline import observed_run


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


app = FastAPI(title="Peregrine", version=__version__)


@app.get("/healthz")
def healthz() -> dict[str, object]:
    """Return liveness and the contract boundary."""
    return {"ok": True, "version": __version__, "runtime": "offline-contract"}


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
        boundary="recorded contract predictions; real YOLO runtime is the next implementation slot",
    )


def _target_key(value: str) -> str:
    aliases = {
        "fp32": "x86_onnx_fp32",
        "onnx": "x86_onnx_fp32",
        "int8": "x86_tflite_int8",
        "tflite": "x86_tflite_int8",
        "arm64": "arm64_qemu_tflite_int8",
    }
    return aliases.get(value, value)
