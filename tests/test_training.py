from pathlib import Path

import pytest

from peregrine.training import TrainingContractError, prepare_training_run


def test_training_dry_run_materializes_lineage(tmp_path: Path) -> None:
    prepared = prepare_training_run(
        tmp_path / "missing-data.yaml",
        tmp_path / "run",
        ("train.epochs=1", "train.batch=2", "train.device=cpu"),
        require_data=False,
    )
    assert prepared.resolved_config_path.is_file()
    assert prepared.arguments["epochs"] == 1
    assert prepared.arguments["batch"] == 2
    assert prepared.arguments["device"] == "cpu"
    assert prepared.arguments["model"] == "yolov8n.pt"
    assert prepared.tracking.project == "peregrine-edge-mlops"


def test_training_requires_real_dataset_before_execution(tmp_path: Path) -> None:
    with pytest.raises(TrainingContractError, match="dataset YAML does not exist"):
        prepare_training_run(tmp_path / "missing.yaml", tmp_path / "run")


def test_auto_device_is_delegated_to_ultralytics(tmp_path: Path) -> None:
    prepared = prepare_training_run(tmp_path / "data.yaml", tmp_path / "run", require_data=False)
    assert prepared.arguments["device"] is None
