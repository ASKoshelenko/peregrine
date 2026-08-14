"""Compose observed schema-v2 evidence from run-produced fragments."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any

import yaml

from peregrine.gates import evaluate_release_gates
from peregrine.hashing import sha256_json

FRAGMENT_KINDS = ("eval", "bench", "artifact")
FRAGMENT_FIELDS = {
    "eval": {
        "schema_version",
        "kind",
        "target",
        "map50",
        "map5095",
        "precision",
        "recall",
        "images",
        "instances",
        "split",
        "weights_sha256",
        "data_fingerprint",
        "evaluator",
        "observed_at",
    },
    "bench": {
        "schema_version",
        "kind",
        "target",
        "lane",
        "p50_ms",
        "p95_ms",
        "samples",
        "warmup",
        "threads",
        "host",
        "observed_at",
    },
    "artifact": {
        "schema_version",
        "kind",
        "target",
        "path",
        "sha256",
        "size_mb",
        "source_weights_sha256",
        "exporter",
        "exporter_version",
        "calibration_hash",
        "observed_at",
    },
}


class EvidenceBuildError(RuntimeError):
    """Raised when real evidence is incomplete or violates provenance rules."""


def build_real_run(fragments: Path, matrix_path: Path) -> dict[str, Any]:
    """Build one all-or-nothing real observed run from fragment files."""
    matrix = yaml.safe_load(matrix_path.read_text(encoding="utf-8"))
    targets = [str(target) for target in matrix["targets"]]
    loaded: dict[tuple[str, str], dict[str, Any]] = {}
    missing: list[str] = []
    for target in targets:
        for kind in FRAGMENT_KINDS:
            path = fragments / f"{kind}-{target}.json"
            if not path.is_file():
                missing.append(str(path))
                continue
            payload = json.loads(path.read_text(encoding="utf-8"))
            _validate_fragment(payload, kind, target)
            loaded[kind, target] = payload
    if missing:
        raise EvidenceBuildError("missing fragments: " + ", ".join(missing))

    budget_commit = _git("log", "-1", "--format=%H", "--", str(matrix_path))
    run_commit = _git("rev-parse", "HEAD")
    if budget_commit == run_commit:
        raise EvidenceBuildError("budget_commit equals run_commit; budgets must precede the run")
    ancestor = subprocess.run(
        ["git", "merge-base", "--is-ancestor", budget_commit, run_commit], check=False
    )
    if ancestor.returncode != 0:
        raise EvidenceBuildError("budget_commit is not an ancestor of run_commit")

    data_fingerprints = {loaded["eval", target]["data_fingerprint"] for target in targets}
    if len(data_fingerprints) != 1:
        raise EvidenceBuildError("eval fragments disagree on data_fingerprint")
    calibration_hashes = {
        loaded["artifact", target]["calibration_hash"]
        for target in targets
        if loaded["artifact", target]["calibration_hash"] is not None
    }
    target_payloads = {}
    for target in targets:
        evaluation = loaded["eval", target]
        benchmark = loaded["bench", target]
        artifact = loaded["artifact", target]
        target_payloads[target] = {
            "map50_proxy": evaluation["map50"],
            "map5095_proxy": evaluation["map5095"],
            "precision": evaluation["precision"],
            "recall": evaluation["recall"],
            "p50_ms": benchmark["p50_ms"],
            "p95_ms": benchmark["p95_ms"],
            "size_mb": artifact["size_mb"],
            "lane": benchmark["lane"],
            "host": benchmark["host"],
        }
    observed_at = max(str(payload["observed_at"]) for payload in loaded.values())
    test_images = {loaded["eval", target]["images"] for target in targets}
    if len(test_images) != 1:
        raise EvidenceBuildError("eval fragments disagree on test image count")
    run: dict[str, Any] = {
        "schema_version": "peregrine.observed.v2",
        "run_id": f"peregrine-real-{run_commit[:12]}",
        "observed_at": observed_at,
        "accuracy_basis": (
            "COCO mAP@0.50 / mAP@0.50:0.95, Ultralytics evaluator, "
            f"held-out test split (N={next(iter(test_images))})"
        ),
        "dataset_hash": next(iter(data_fingerprints)),
        "dataset_version": "mamgistics-v1",
        "label_space_version": "warehouse-assets-2-v1",
        "split_counts": {"test": next(iter(test_images))},
        "model": {
            "name": "peregrine-yolov8n",
            "base": "run-produced checkpoint",
            "license_note": "YOLOv8/Ultralytics model lane is AGPL-3.0.",
        },
        "targets": target_payloads,
        "environment": {"env_hash": sha256_json(target_payloads)},
        "lineage": {
            "source_commit": run_commit,
            "budget_commit": budget_commit,
            "run_commit": run_commit,
            "config_sha256": sha256_json(matrix),
            "dataset_fingerprint": next(iter(data_fingerprints)),
            "calibration_hash": (
                next(iter(calibration_hashes)) if len(calibration_hashes) == 1 else None
            ),
            "wandb_run": None,
        },
        "cost": {"training_run_usd": None, "training_run_note": "not yet observed"},
        "boundaries": {
            "accuracy": "held-out test evaluation from run-produced fragments",
            "arm64": "execution substrate is recorded per benchmark fragment",
            "serving": "device artifact evaluation; deployment is outside this phase",
        },
    }
    run["fingerprint"] = sha256_json(
        {"dataset_hash": run["dataset_hash"], "targets": run["targets"], "lineage": run["lineage"]}
    )
    run["release_verdict"] = evaluate_release_gates(run).to_dict()
    return run


def _validate_fragment(payload: object, kind: str, target: str) -> None:
    if not isinstance(payload, dict):
        raise EvidenceBuildError(f"{kind}-{target} fragment must be an object")
    if payload.get("schema_version") != 1 or payload.get("kind") != kind:
        raise EvidenceBuildError(f"{kind}-{target} fragment has an invalid schema header")
    if payload.get("target") != target:
        raise EvidenceBuildError(f"{kind}-{target} fragment target does not match its filename")
    missing = FRAGMENT_FIELDS[kind] - payload.keys()
    if missing:
        raise EvidenceBuildError(
            f"{kind}-{target} fragment is missing fields: {', '.join(sorted(missing))}"
        )


def _git(*args: str) -> str:
    result = subprocess.run(["git", *args], check=True, capture_output=True, text=True)
    return result.stdout.strip()
