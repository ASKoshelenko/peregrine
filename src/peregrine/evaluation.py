"""Ultralytics evaluation adapter emitting a real evidence fragment."""

from __future__ import annotations

import hashlib
import importlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class EvaluationError(RuntimeError):
    """Raised when real model evaluation cannot satisfy its contract."""


def evaluate_model(
    weights: Path, data_yaml: Path, split: str, target: str, output: Path, device: str | None
) -> dict[str, Any]:
    """Evaluate one artifact with the shared Ultralytics protocol."""
    if split != "test":
        raise EvaluationError("real evidence requires the held-out test split")
    manifest_path = data_yaml.parent / "manifest.json"
    if not weights.is_file() or not data_yaml.is_file() or not manifest_path.is_file():
        raise EvaluationError("weights, data.yaml, and adjacent manifest.json are required")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    try:
        ultralytics = importlib.import_module("ultralytics")
    except ImportError as error:
        raise EvaluationError(
            "evaluation dependencies are missing; install the 'ml' extra"
        ) from error
    model = ultralytics.YOLO(str(weights))
    result = model.val(data=str(data_yaml), split=split, imgsz=640, device=device, plots=False)
    box = result.box
    images, instances = _split_counts(data_yaml.parent, split)
    fragment: dict[str, Any] = {
        "schema_version": 1,
        "kind": "eval",
        "target": target,
        "map50": float(box.map50),
        "map5095": float(box.map),
        "precision": float(box.mp),
        "recall": float(box.mr),
        "images": images,
        "instances": instances,
        "split": split,
        "weights_sha256": _sha256_file(weights),
        "data_fingerprint": str(manifest["fingerprint"]),
        "evaluator": f"ultralytics {ultralytics.__version__}",
        "observed_at": datetime.now(UTC).isoformat(),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(fragment, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return fragment


def _split_counts(root: Path, split: str) -> tuple[int, int]:
    images = list((root / split / "images").iterdir())
    labels = list((root / split / "labels").glob("*.txt"))
    instances = sum(len(path.read_text(encoding="utf-8").splitlines()) for path in labels)
    return len(images), instances


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
