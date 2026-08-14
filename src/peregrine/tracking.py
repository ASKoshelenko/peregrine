"""Side-effect-free W&B tracking contract for real training runs."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass


class TrackingContractError(RuntimeError):
    """Raised when experiment tracking is not safely configured."""


@dataclass(frozen=True, slots=True)
class WandbRunContract:
    """Non-secret arguments for one W&B run plus its credential variable name."""

    project: str
    job_type: str
    mode: str
    tags: tuple[str, ...]
    api_key_env: str
    entity: str | None

    def init_arguments(self, config_hash: str) -> dict[str, object]:
        """Return safe arguments for ``wandb.init`` without copying a credential."""
        arguments: dict[str, object] = {
            "project": self.project,
            "job_type": self.job_type,
            "mode": self.mode,
            "tags": list(self.tags),
            "config": {"peregrine_config_sha256": config_hash},
        }
        if self.entity:
            arguments["entity"] = self.entity
        return arguments


def prepare_wandb_contract(
    tracking: Mapping[str, object],
    environment: Mapping[str, str],
    *,
    require_credentials: bool,
) -> WandbRunContract:
    """Validate W&B settings while keeping the API key out of artifacts and logs."""
    provider = _text(tracking, "provider")
    if provider != "wandb":
        raise TrackingContractError(f"unsupported tracking provider: {provider}")
    mode = _text(tracking, "mode")
    if mode not in {"online", "offline", "disabled"}:
        raise TrackingContractError(f"unsupported W&B mode: {mode}")
    api_key_env = _text(tracking, "api_key_env")
    if require_credentials and mode == "online" and not environment.get(api_key_env, "").strip():
        raise TrackingContractError(f"W&B credential is missing: set {api_key_env} locally")
    entity_env = _text(tracking, "entity_env")
    raw_tags = tracking.get("tags")
    if not isinstance(raw_tags, list) or not all(isinstance(tag, str) for tag in raw_tags):
        raise TrackingContractError("tracking tags must be a list of strings")
    return WandbRunContract(
        project=_text(tracking, "project"),
        job_type=_text(tracking, "job_type"),
        mode=mode,
        tags=tuple(raw_tags),
        api_key_env=api_key_env,
        entity=environment.get(entity_env) or None,
    )


def _text(mapping: Mapping[str, object], key: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value.strip():
        raise TrackingContractError(f"tracking field must be a non-empty string: {key}")
    return value
