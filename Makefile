SHELL := /bin/bash
.DEFAULT_GOAL := help

PY ?= python3
PYTHONPATH := src
PORT ?= 8013

BOLD := $(shell tput bold 2>/dev/null || true)
OFF  := $(shell tput sgr0 2>/dev/null || true)
STEP := printf "$(BOLD)==>$(OFF) %s\n"

.PHONY: help test lint check observe demo serve site dataset-fetch dataset-prepare dataset-smoke config train-dry-run train-smoke-dry-run clean

help: ## Show targets
	@printf "\n$(BOLD)Peregrine$(OFF) — CV device-inference MLOps demo\n\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS=":.*?## "}; {printf "  $(BOLD)%-10s$(OFF) %s\n", $$1, $$2}'

observe: ## Recompute observed offline metrics and model card
	@$(STEP) "Running offline train/eval/quantize/benchmark/register simulation"
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli observe --write artifacts/observed/latest.json --model-card artifacts/model-cards/peregrine-yolov8n-int8.md

demo: observe ## Print the spoken summary from observed evidence
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli summary artifacts/observed/latest.json

test: ## Run focused tests
	@$(STEP) "pytest"
	@PYTHONPATH=$(PYTHONPATH) pytest

lint: ## Run ruff and mypy when installed
	@$(STEP) "ruff"
	@ruff check src tests
	@$(STEP) "ruff format --check"
	@ruff format --check src tests
	@$(STEP) "mypy"
	@mypy

check: lint test ## Lint, type-check, and test — the one-command gate

serve: ## Serve FastAPI on :8000
	@PYTHONPATH=$(PYTHONPATH) uvicorn peregrine.api:app --host 127.0.0.1 --port 8000 --reload

site: observe ## Serve the static demo site from the repo root
	@$(STEP) "Open http://127.0.0.1:$(PORT)/site/"
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.preview --port $(PORT)

dataset-fetch: ## Fetch the licensed Roboflow snapshot using local .env credentials
	@set -a; source .env; set +a; PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli dataset fetch

dataset-prepare: ## Validate and materialize the two-class training snapshot
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli dataset prepare

dataset-smoke: ## Materialize the deterministic 32-image CPU-smoke training subset
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli dataset smoke

config: ## Materialize the resolved Hydra run configuration
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli config

train-dry-run: ## Validate the packaged training contract without ML imports or compute
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli train --dry-run

train-smoke-dry-run: ## Validate the 1-epoch CPU-smoke contract without compute
	@PYTHONPATH=$(PYTHONPATH) $(PY) -m peregrine.cli train --dry-run \
		--data data/processed/warehouse-smoke/data.yaml \
		--run-dir artifacts/runs/cpu-smoke \
		--override train=smoke --override tracking=disabled --override run.name=peregrine-cpu-smoke

clean: ## Remove generated caches
	@find . -type d -name __pycache__ -prune -exec rm -rf {} +
	@rm -rf .pytest_cache .ruff_cache .mypy_cache
