"""Ultralytics training adapter shared by local, Colab, and Vertex lanes."""

from __future__ import annotations

import importlib
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from peregrine.config import compose_run_config, materialize_run_config
from peregrine.tracking import WandbRunContract, prepare_wandb_contract


class TrainingContractError(RuntimeError):
    """Raised when a training run cannot satisfy its input contract."""


@dataclass(frozen=True, slots=True)
class PreparedTrainingRun:
    """Resolved training invocation and its lineage artifact."""

    config_hash: str
    resolved_config_path: Path
    arguments: dict[str, object]
    tracking: WandbRunContract


def prepare_training_run(
    data_yaml: Path,
    run_dir: Path,
    overrides: tuple[str, ...] = (),
    *,
    require_data: bool = True,
) -> PreparedTrainingRun:
    """Resolve the run contract before allocating training resources."""
    if require_data and not data_yaml.is_file():
        raise TrainingContractError(f"dataset YAML does not exist: {data_yaml}")
    resolved = compose_run_config(overrides)
    model = _mapping(resolved, "model")
    train = _mapping(resolved, "train")
    run = _mapping(resolved, "run")
    tracking = _mapping(resolved, "tracking")
    resolved_path = run_dir / "resolved-config.json"
    fingerprint = materialize_run_config(resolved_path, overrides)
    device = train["device"]
    arguments: dict[str, object] = {
        "data": str(data_yaml),
        "epochs": train["epochs"],
        "imgsz": model["imgsz"],
        "batch": train["batch"],
        "workers": train["workers"],
        "device": None if device == "auto" else device,
        "seed": train["seed"],
        "deterministic": train["deterministic"],
        "patience": train["patience"],
        "optimizer": train["optimizer"],
        # Ultralytics prefixes relative projects with its global runs directory.
        # An absolute path keeps the lineage contract and checkpoints together.
        "project": str(run_dir.resolve()),
        "name": run["name"],
        "exist_ok": False,
    }
    arguments["model"] = model["base"]
    tracking_contract = prepare_wandb_contract(
        tracking,
        os.environ,
        require_credentials=require_data,
    )
    return PreparedTrainingRun(fingerprint, resolved_path, arguments, tracking_contract)


def execute_training(prepared: PreparedTrainingRun) -> Any:
    """Execute a prepared run, importing the AGPL demo dependency only in the ML lane."""
    try:
        ultralytics = importlib.import_module("ultralytics")
        wandb = importlib.import_module("wandb")
    except ImportError as error:
        raise TrainingContractError(
            "training dependencies are missing; install the 'ml' extra"
        ) from error
    arguments = dict(prepared.arguments)
    model_name = arguments.pop("model")
    model = ultralytics.YOLO(model_name)
    run = wandb.init(**prepared.tracking.init_arguments(prepared.config_hash))
    try:
        result = model.train(**arguments)
    except Exception:
        run.finish(exit_code=1)
        raise
    run.finish(exit_code=0)
    return result


def _mapping(container: dict[str, object], key: str) -> dict[str, Any]:
    value = container.get(key)
    if not isinstance(value, dict):
        raise TrainingContractError(f"resolved config section must be a mapping: {key}")
    return value
