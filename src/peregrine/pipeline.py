"""Offline observed run for the Peregrine demo."""

from __future__ import annotations

import json
import platform
import statistics
import sys
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any

from peregrine import __version__
from peregrine.dataset import (
    DATASET,
    DATASET_VERSION,
    LABEL_SPACE_VERSION,
    Box,
    dataset_hash,
    split_counts,
)
from peregrine.gates import evaluate_release_gates
from peregrine.hashing import sha256_json
from peregrine.metrics import Prediction, map_proxy
from peregrine.observations import (
    ARM64_TFLITE_PREDICTIONS,
    FP32_PREDICTIONS,
    INT8_TFLITE_PREDICTIONS,
    LATENCY_MS,
    MODEL_SIZE_MB,
)

MODEL_NAME = "peregrine-yolov8n"
BASE_MODEL = "yolov8n-coco"
RUN_ID = "peregrine-local-2026-08-13-r01"


def observed_run() -> dict[str, Any]:
    """Run the deterministic local pipeline and return observed evidence."""
    started = time.perf_counter()
    eval_truth = {record.image_id: record.boxes for record in DATASET if record.split == "eval"}
    targets = {
        "x86_onnx_fp32": _target_metrics("x86_onnx_fp32", eval_truth, FP32_PREDICTIONS),
        "x86_tflite_int8": _target_metrics("x86_tflite_int8", eval_truth, INT8_TFLITE_PREDICTIONS),
        "arm64_tflite_int8": _target_metrics(
            "arm64_tflite_int8", eval_truth, ARM64_TFLITE_PREDICTIONS
        ),
    }
    run: dict[str, Any] = {
        "schema_version": "peregrine.observed.v2",
        "run_id": RUN_ID,
        "observed_at": "2026-08-13T00:00:00Z",
        "accuracy_basis": (
            "F1-based proxy on the synthetic contract set at a 0.25 confidence "
            "operating point — not COCO mAP"
        ),
        "pipeline_version": __version__,
        "model": {
            "name": MODEL_NAME,
            "base": BASE_MODEL,
            "license_note": (
                "YOLOv8/Ultralytics AGPL is acceptable for this demo; "
                "client work would evaluate Apache-2.0 alternatives."
            ),
            "parameters_m": 3.2,
        },
        "dataset_version": DATASET_VERSION,
        "label_space_version": LABEL_SPACE_VERSION,
        "dataset_hash": dataset_hash(),
        "split_counts": split_counts(),
        "targets": targets,
        "environment": _environment(),
        "cost": {
            "training_run_usd": 0.0,
            "training_run_note": (
                "local contract run; Vertex/Colab cost moves this field after a real GPU run"
            ),
        },
        "boundaries": {
            "accuracy": "contract-set mAP proxy, not COCO mAP and not a Roboflow/SKU-110K result",
            "arm64": "QEMU trend lane only; no physical device measurement",
            "serving": "FastAPI contract, no loaded YOLO runtime in the default offline path",
        },
        "lineage": {
            "source_commit": None,
            "budget_commit": None,
            "run_commit": None,
            "config_sha256": None,
            "dataset_fingerprint": dataset_hash(),
            "calibration_hash": None,
            "wandb_run": None,
        },
    }
    run["fingerprint"] = sha256_json(
        {"model": run["model"], "dataset_hash": run["dataset_hash"], "targets": run["targets"]}
    )
    run["release_verdict"] = evaluate_release_gates(run).to_dict()
    run["wall_clock_ms"] = round((time.perf_counter() - started) * 1000, 3)
    return run


def write_observed(path: Path) -> dict[str, Any]:
    """Write the observed run as stable JSON."""
    run = observed_run()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(run, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return run


def _target_metrics(
    name: str,
    truth: dict[str, tuple[Box, ...]],
    predictions: tuple[Prediction, ...],
) -> dict[str, Any]:
    metrics = map_proxy(truth, predictions)
    samples = sorted(LATENCY_MS[name])
    p50 = statistics.median(samples)
    p95 = samples[round((len(samples) - 1) * 0.95)]
    return {
        **metrics,
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "size_mb": MODEL_SIZE_MB[name],
        "predictions": [asdict(item) for item in predictions],
    }


def _environment() -> dict[str, str]:
    payload = {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "implementation": platform.python_implementation(),
    }
    return {**payload, "env_hash": sha256_json(payload)}
