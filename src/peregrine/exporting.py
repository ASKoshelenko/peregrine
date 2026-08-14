"""Ultralytics artifact export adapter with provenance fragments."""

from __future__ import annotations

import hashlib
import importlib
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class ExportError(RuntimeError):
    """Raised when a model artifact cannot be exported reproducibly."""


def export_model(
    weights: Path, export_format: str, output: Path, calibration: Path | None
) -> tuple[Path, dict[str, Any]]:
    """Export ONNX FP32 or TFLite INT8 and write its artifact fragment."""
    if not weights.is_file():
        raise ExportError(f"weights do not exist: {weights}")
    if export_format not in {"onnx", "tflite-int8"}:
        raise ExportError(f"unsupported export format: {export_format}")
    calibration_hash: str | None = None
    arguments: dict[str, object] = {"imgsz": 640}
    if export_format == "onnx":
        arguments.update({"format": "onnx", "nms": False})
        target = "x86_onnx_fp32"
        exporter_note = "Ultralytics ONNX; NMS excluded"
    else:
        if calibration is None or not calibration.is_file():
            raise ExportError("TFLite INT8 export requires calibration data.yaml")
        manifest = json.loads((calibration.parent / "manifest.json").read_text(encoding="utf-8"))
        calibration_hash = str(manifest["calibration_hash"])
        arguments.update({"format": "tflite", "int8": True, "data": str(calibration)})
        target = "x86_tflite_int8"
        exporter_note = "Ultralytics TFLite INT8; default per-channel weights"
    try:
        ultralytics = importlib.import_module("ultralytics")
    except ImportError as error:
        raise ExportError("export dependencies are missing; install the 'ml' extra") from error
    exported = Path(str(ultralytics.YOLO(str(weights)).export(**arguments)))
    if not exported.is_file():
        raise ExportError(f"exporter did not produce a file: {exported}")
    output.mkdir(parents=True, exist_ok=True)
    artifact = output / exported.name
    if exported.resolve() != artifact.resolve():
        shutil.copy2(exported, artifact)
    fragment: dict[str, Any] = {
        "schema_version": 1,
        "kind": "artifact",
        "target": target,
        "path": str(artifact),
        "sha256": _sha256_file(artifact),
        "size_mb": round(artifact.stat().st_size / 1_000_000, 2),
        "source_weights_sha256": _sha256_file(weights),
        "exporter": exporter_note,
        "exporter_version": str(ultralytics.__version__),
        "calibration_hash": calibration_hash,
        "observed_at": datetime.now(UTC).isoformat(),
    }
    fragment_path = output / f"artifact-{target}.json"
    fragment_path.write_text(
        json.dumps(fragment, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    return artifact, fragment


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
