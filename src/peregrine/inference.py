"""CPU ONNX inference used by the public image-upload demo."""

from __future__ import annotations

import hashlib
import importlib
import io
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps

MODEL_INPUT_SIZE = 640
MAX_IMAGE_PIXELS = 20_000_000
MAX_IMAGE_DIMENSION = 10_000
CLASS_NAMES = ("pallet", "carton")


class InferenceError(RuntimeError):
    """Raised when an uploaded image or model cannot satisfy the serving contract."""


@dataclass(frozen=True, slots=True)
class DetectionResult:
    """One decoded detection in source-image pixel coordinates."""

    label: str
    confidence: float
    box: tuple[float, float, float, float]


@dataclass(frozen=True, slots=True)
class InferenceResult:
    """Inference response plus the model lineage needed by the UI."""

    width: int
    height: int
    latency_ms: float
    model_sha256: str
    detections: tuple[DetectionResult, ...]


class OnnxDetector:
    """Small YOLOv8 ONNX adapter with deterministic preprocessing and class-aware NMS."""

    def __init__(self, model_path: Path) -> None:
        """Load a model once and bind it to the CPU execution provider."""
        if not model_path.is_file():
            raise InferenceError(f"model not found: {model_path}")
        try:
            ort = importlib.import_module("onnxruntime")
        except ImportError as error:
            raise InferenceError("onnxruntime is required for live inference") from error
        self._session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        self._input_name = str(self._session.get_inputs()[0].name)
        self.model_sha256 = _sha256_file(model_path)

    def predict(
        self, image_bytes: bytes, confidence: float = 0.25, iou_threshold: float = 0.45
    ) -> InferenceResult:
        """Decode an image, invoke ONNX Runtime, and return source-space boxes."""
        image = _decode_image(image_bytes)
        tensor, scale, pad_x, pad_y = _letterbox(image)
        started = time.perf_counter()
        raw = self._session.run(None, {self._input_name: tensor})[0]
        latency_ms = (time.perf_counter() - started) * 1000
        detections = _decode_yolov8(
            np.asarray(raw),
            image.width,
            image.height,
            scale,
            pad_x,
            pad_y,
            confidence,
            iou_threshold,
        )
        return InferenceResult(
            width=image.width,
            height=image.height,
            latency_ms=latency_ms,
            model_sha256=self.model_sha256,
            detections=tuple(detections),
        )


def _decode_image(payload: bytes) -> Image.Image:
    if not payload:
        raise InferenceError("image body is empty")
    try:
        image = Image.open(io.BytesIO(payload))
        if (
            image.width > MAX_IMAGE_DIMENSION
            or image.height > MAX_IMAGE_DIMENSION
            or image.width * image.height > MAX_IMAGE_PIXELS
        ):
            raise InferenceError("image dimensions exceed the 20 megapixel limit")
        image.load()
        return ImageOps.exif_transpose(image).convert("RGB")
    except InferenceError:
        raise
    except (OSError, ValueError) as error:
        raise InferenceError("body is not a decodable image") from error


def _letterbox(image: Image.Image) -> tuple[np.ndarray[Any, Any], float, float, float]:
    scale = min(MODEL_INPUT_SIZE / image.width, MODEL_INPUT_SIZE / image.height)
    resized_width = max(1, round(image.width * scale))
    resized_height = max(1, round(image.height * scale))
    resized = image.resize((resized_width, resized_height), Image.Resampling.BILINEAR)
    pad_x = (MODEL_INPUT_SIZE - resized_width) / 2
    pad_y = (MODEL_INPUT_SIZE - resized_height) / 2
    canvas = Image.new("RGB", (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE), (114, 114, 114))
    canvas.paste(resized, (round(pad_x), round(pad_y)))
    array = np.asarray(canvas, dtype=np.float32) / 255.0
    tensor = np.transpose(array, (2, 0, 1))[None, ...]
    return np.ascontiguousarray(tensor), scale, pad_x, pad_y


def _decode_yolov8(
    raw: np.ndarray[Any, Any],
    width: int,
    height: int,
    scale: float,
    pad_x: float,
    pad_y: float,
    confidence: float,
    iou_threshold: float,
) -> list[DetectionResult]:
    if raw.ndim != 3 or raw.shape[0] != 1:
        raise InferenceError(f"unexpected model output shape: {raw.shape}")
    predictions = raw[0]
    if predictions.shape[0] == 4 + len(CLASS_NAMES):
        predictions = predictions.T
    if predictions.ndim != 2 or predictions.shape[1] != 4 + len(CLASS_NAMES):
        raise InferenceError(f"unexpected YOLO output shape: {raw.shape}")

    candidates: list[DetectionResult] = []
    for row in predictions:
        class_id = int(np.argmax(row[4:]))
        score = float(row[4 + class_id])
        if score < confidence:
            continue
        center_x, center_y, box_width, box_height = (float(value) for value in row[:4])
        x1 = max(0.0, min(width, (center_x - box_width / 2 - pad_x) / scale))
        y1 = max(0.0, min(height, (center_y - box_height / 2 - pad_y) / scale))
        x2 = max(0.0, min(width, (center_x + box_width / 2 - pad_x) / scale))
        y2 = max(0.0, min(height, (center_y + box_height / 2 - pad_y) / scale))
        if x2 > x1 and y2 > y1:
            candidates.append(DetectionResult(CLASS_NAMES[class_id], score, (x1, y1, x2, y2)))
    return _class_aware_nms(candidates, iou_threshold)


def _class_aware_nms(
    candidates: list[DetectionResult], iou_threshold: float
) -> list[DetectionResult]:
    kept: list[DetectionResult] = []
    for candidate in sorted(candidates, key=lambda item: item.confidence, reverse=True):
        if all(
            candidate.label != accepted.label or _iou(candidate.box, accepted.box) <= iou_threshold
            for accepted in kept
        ):
            kept.append(candidate)
    return kept[:100]


def _iou(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    intersection_width = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    intersection_height = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    intersection = intersection_width * intersection_height
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - intersection
    return intersection / union if union else 0.0


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
