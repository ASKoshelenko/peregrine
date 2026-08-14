import json
from pathlib import Path

from peregrine.config import compose_run_config, materialize_run_config


def test_hydra_composes_committed_groups() -> None:
    config = compose_run_config()
    assert config["model"]["base"] == "yolov8n.pt"
    assert config["data"]["label_space_version"] == "warehouse-assets-2-v1"
    assert config["train"]["epochs"] == 30
    assert config["export"]["precision"] == "int8"


def test_hydra_override_is_materialized(tmp_path: Path) -> None:
    output = tmp_path / "resolved.json"
    fingerprint = materialize_run_config(output, ("train.epochs=1", "train.batch=2"))
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert payload["config_hash"] == fingerprint
    assert payload["config"]["train"]["epochs"] == 1
    assert payload["config"]["train"]["batch"] == 2


def test_materialized_config_is_deterministic(tmp_path: Path) -> None:
    first = materialize_run_config(tmp_path / "first.json")
    second = materialize_run_config(tmp_path / "second.json")
    assert first == second
    assert (tmp_path / "first.json").read_bytes() == (tmp_path / "second.json").read_bytes()


def test_cpu_smoke_config_is_bounded_and_offline() -> None:
    config = compose_run_config(("train=smoke", "tracking=disabled"))
    assert config["train"]["epochs"] == 1
    assert config["train"]["device"] == "cpu"
    assert config["train"]["purpose"] == "mechanics-only"
    assert config["tracking"]["mode"] == "disabled"
