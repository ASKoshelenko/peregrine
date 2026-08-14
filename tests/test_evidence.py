import json
from pathlib import Path

import pytest
import yaml

from peregrine import evidence
from peregrine.evidence import EvidenceBuildError, build_real_run


def _matrix(path: Path) -> Path:
    path.write_text(yaml.safe_dump({"targets": ["target"]}), encoding="utf-8")
    return path


def _fragments(root: Path) -> None:
    common = {"schema_version": 1, "target": "target", "observed_at": "2026-08-14T00:00:00Z"}
    payloads = {
        "eval": {
            **common,
            "kind": "eval",
            "map50": 0.1,
            "map5095": 0.05,
            "precision": 0.2,
            "recall": 0.3,
            "images": 1,
            "instances": 1,
            "split": "test",
            "weights_sha256": "a",
            "data_fingerprint": "b",
            "evaluator": "fixture",
        },
        "bench": {
            **common,
            "kind": "bench",
            "lane": "reference",
            "p50_ms": 1.0,
            "p95_ms": 2.0,
            "samples": 100,
            "warmup": 10,
            "threads": 1,
            "host": {"os": "fixture"},
        },
        "artifact": {
            **common,
            "kind": "artifact",
            "path": "model",
            "sha256": "a",
            "size_mb": 1.0,
            "source_weights_sha256": "a",
            "exporter": "fixture",
            "exporter_version": "1",
            "calibration_hash": None,
        },
    }
    root.mkdir()
    for kind, payload in payloads.items():
        (root / f"{kind}-target.json").write_text(json.dumps(payload), encoding="utf-8")


def test_real_builder_refuses_missing_fragments(tmp_path: Path) -> None:
    with pytest.raises(EvidenceBuildError, match="missing fragments"):
        build_real_run(tmp_path / "fragments", _matrix(tmp_path / "matrix.yaml"))


def test_real_builder_refuses_budget_commit_equal_to_run_commit(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fragments = tmp_path / "fragments"
    _fragments(fragments)
    monkeypatch.setattr(evidence, "_git", lambda *_args: "same-commit")
    with pytest.raises(EvidenceBuildError, match="budget_commit equals run_commit"):
        build_real_run(fragments, _matrix(tmp_path / "matrix.yaml"))
