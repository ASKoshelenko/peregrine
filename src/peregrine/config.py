"""Hydra composition and materialized run-config lineage."""

from __future__ import annotations

import json
from pathlib import Path
from typing import cast

from hydra import compose, initialize_config_dir
from omegaconf import OmegaConf

from peregrine.hashing import sha256_json

CONFIG_DIR = Path(__file__).resolve().parents[2] / "configs"


def compose_run_config(overrides: tuple[str, ...] = ()) -> dict[str, object]:
    """Compose and resolve the committed Hydra config tree."""
    with initialize_config_dir(version_base="1.3", config_dir=str(CONFIG_DIR)):
        config = compose(config_name="config", overrides=list(overrides))
    resolved = OmegaConf.to_container(config, resolve=True)
    if not isinstance(resolved, dict) or not all(isinstance(key, str) for key in resolved):
        raise TypeError("resolved Hydra config must be a string-keyed mapping")
    return cast(dict[str, object], resolved)


def materialize_run_config(output: Path, overrides: tuple[str, ...] = ()) -> str:
    """Write a deterministic resolved config and return its SHA-256 fingerprint."""
    resolved = compose_run_config(overrides)
    fingerprint = sha256_json(resolved)
    payload = {"config_hash": fingerprint, "config": resolved}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return fingerprint
