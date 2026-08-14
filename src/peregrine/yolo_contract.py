"""Boundary for the future real YOLO lane.

The offline project does not import Ultralytics. This contract states what the heavy lane
must produce before the observed run can be promoted from proxy metrics to real YOLO metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, slots=True)
class ExportedArtifacts:
    """Artifacts expected from a real YOLO train/export run."""

    checkpoint: Path
    onnx_fp32: Path
    tflite_int8: Path
    calibration_manifest: Path
    materialized_config: Path


def required_artifact_names() -> tuple[str, ...]:
    """Return the mandatory handoff artifacts."""
    return ("best.pt", "model.onnx", "model_int8.tflite", "calibration.json", "config.yaml")
