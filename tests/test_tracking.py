import pytest

from peregrine.tracking import TrackingContractError, prepare_wandb_contract

SETTINGS: dict[str, object] = {
    "provider": "wandb",
    "project": "peregrine-edge-mlops",
    "job_type": "train",
    "mode": "online",
    "tags": ["warehouse", "baseline"],
    "api_key_env": "WANDB_API_KEY",
    "entity_env": "WANDB_ENTITY",
}


def test_dry_run_contract_contains_no_api_key() -> None:
    contract = prepare_wandb_contract(SETTINGS, {}, require_credentials=False)
    arguments = contract.init_arguments("abc123")
    assert arguments["config"] == {"peregrine_config_sha256": "abc123"}
    assert "api_key" not in arguments
    assert contract.api_key_env == "WANDB_API_KEY"


def test_online_run_requires_local_credential() -> None:
    with pytest.raises(TrackingContractError, match="WANDB_API_KEY"):
        prepare_wandb_contract(SETTINGS, {}, require_credentials=True)


def test_entity_is_read_from_indirection() -> None:
    contract = prepare_wandb_contract(
        SETTINGS,
        {"WANDB_API_KEY": "secret", "WANDB_ENTITY": "team"},
        require_credentials=True,
    )
    assert contract.init_arguments("abc")["entity"] == "team"
