"""Command-line entry point for Peregrine."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

from peregrine.config import materialize_run_config
from peregrine.dataset_fetch import DatasetFetchError, fetch_from_environment
from peregrine.dataset_license import (
    LicenseVerificationError,
    verify_dataset_license,
    verify_label_mapping,
)
from peregrine.dataset_prepare import (
    DatasetPreparationError,
    prepare_dataset,
    prepare_smoke_dataset,
)
from peregrine.evidence import EvidenceBuildError, build_real_run
from peregrine.gates import evaluate_release_gates
from peregrine.model_card import write_model_card
from peregrine.pipeline import write_observed
from peregrine.tracking import TrackingContractError
from peregrine.training import TrainingContractError, execute_training, prepare_training_run

TARGET_NAMES = ("x86_onnx_fp32", "x86_tflite_int8", "arm64_tflite_int8")


def main(argv: list[str] | None = None) -> int:
    """Run the CLI. ``summary`` exits 1 when the release verdict is BLOCK."""
    parser = argparse.ArgumentParser(prog="peregrine")
    sub = parser.add_subparsers(dest="command", required=True)
    observe = sub.add_parser("observe", help="write observed evidence and the model card")
    observe.add_argument("--lane", choices=("contract", "real"), default="contract")
    observe.add_argument("--fragments", type=Path, default=Path("artifacts/real"))
    observe.add_argument("--write", type=Path, default=Path("artifacts/observed/latest.json"))
    observe.add_argument(
        "--model-card",
        type=Path,
        default=Path("artifacts/model-cards/peregrine-yolov8n-int8.md"),
    )
    summary = sub.add_parser("summary", help="print the observed summary; exits 1 on BLOCK")
    summary.add_argument("path", type=Path)
    summary.add_argument("--target", choices=TARGET_NAMES, default=None)
    dataset = sub.add_parser("dataset", help="dataset policy and lineage operations")
    dataset_sub = dataset.add_subparsers(dest="dataset_command", required=True)
    verify_license = dataset_sub.add_parser(
        "verify-license", help="verify license metadata before dataset fetch"
    )
    verify_license.add_argument("--config", type=Path, default=Path("configs/data/warehouse.yaml"))
    verify_license.add_argument("--notice", type=Path, default=Path("docs/DATASET_LICENSE.md"))
    fetch = dataset_sub.add_parser("fetch", help="download and validate the licensed dataset")
    fetch.add_argument("--config", type=Path, default=Path("configs/data/warehouse.yaml"))
    fetch.add_argument("--notice", type=Path, default=Path("docs/DATASET_LICENSE.md"))
    fetch.add_argument("--destination", type=Path, default=Path("data/raw/mamgistics-v1"))
    prepare = dataset_sub.add_parser("prepare", help="validate and materialize training data")
    prepare.add_argument("--config", type=Path, default=Path("configs/data/warehouse.yaml"))
    prepare.add_argument("--notice", type=Path, default=Path("docs/DATASET_LICENSE.md"))
    prepare.add_argument("--source", type=Path, default=Path("data/raw/mamgistics-v1"))
    prepare.add_argument("--destination", type=Path, default=Path("data/processed/warehouse"))
    smoke = dataset_sub.add_parser("smoke", help="materialize the mechanics-only CPU subset")
    smoke.add_argument("--config", type=Path, default=Path("configs/data/warehouse.yaml"))
    smoke.add_argument("--notice", type=Path, default=Path("docs/DATASET_LICENSE.md"))
    smoke.add_argument("--source", type=Path, default=Path("data/processed/warehouse"))
    smoke.add_argument("--destination", type=Path, default=Path("data/processed/warehouse-smoke"))
    config = sub.add_parser("config", help="compose and materialize Hydra run configuration")
    config.add_argument(
        "--output", type=Path, default=Path("artifacts/configs/resolved-config.json")
    )
    config.add_argument("--override", action="append", default=[])
    train = sub.add_parser("train", help="prepare or execute the packaged Ultralytics run")
    train.add_argument("--data", type=Path, default=Path("data/processed/warehouse/data.yaml"))
    train.add_argument("--run-dir", type=Path, default=Path("artifacts/runs/baseline"))
    train.add_argument("--override", action="append", default=[])
    train.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.command == "observe":
        try:
            if args.lane == "real":
                run = build_real_run(args.fragments, Path("configs/targets/matrix.yaml"))
                args.write.parent.mkdir(parents=True, exist_ok=True)
                args.write.write_text(
                    json.dumps(run, indent=2, sort_keys=True) + "\n", encoding="utf-8"
                )
            else:
                run = write_observed(args.write)
        except (EvidenceBuildError, OSError, ValueError) as error:
            print(f"observe: BLOCK · {error}", file=sys.stderr)
            return 1
        write_model_card(args.model_card, run)
        print(f"observed {run['run_id']} -> {args.write}")
        print(f"model card -> {args.model_card}")
        return 0
    if args.command == "dataset":
        try:
            metadata = verify_dataset_license(args.config, args.notice)
            mapping = verify_label_mapping(args.config)
            if args.dataset_command == "fetch":
                destination = fetch_from_environment(args.config, args.destination)
            elif args.dataset_command == "prepare":
                prepared_dataset = prepare_dataset(args.source, args.destination, args.config)
            elif args.dataset_command == "smoke":
                prepared_dataset = prepare_smoke_dataset(args.source, args.destination, args.config)
        except (
            DatasetFetchError,
            DatasetPreparationError,
            LicenseVerificationError,
            OSError,
            yaml.YAMLError,
        ) as error:
            print(f"license: BLOCK · {error}", file=sys.stderr)
            return 1
        kept = sorted({target for target in mapping.values() if target is not None})
        ignored = sum(target is None for target in mapping.values())
        print(f"license: PASS · {metadata['license_spdx']} · verified {metadata['verified_at']}")
        print(f"label-space: PASS · targets={','.join(kept)} · ignored={ignored}")
        if args.dataset_command == "fetch":
            print(f"dataset: PASS · installed {destination}")
        elif args.dataset_command in {"prepare", "smoke"}:
            print(
                "dataset: PASS · "
                f"images={prepared_dataset.images} · boxes={prepared_dataset.boxes} · "
                f"empty={prepared_dataset.empty_annotations} · "
                f"sha256:{prepared_dataset.fingerprint[:12]}"
            )
        return 0
    if args.command == "config":
        fingerprint = materialize_run_config(args.output, tuple(args.override))
        print(f"config: PASS · sha256:{fingerprint[:12]} · {args.output}")
        return 0
    if args.command == "train":
        try:
            prepared = prepare_training_run(
                args.data,
                args.run_dir,
                tuple(args.override),
                require_data=not args.dry_run,
            )
            if not args.dry_run:
                execute_training(prepared)
        except (TrackingContractError, TrainingContractError, OSError, ValueError) as error:
            print(f"train: BLOCK · {error}", file=sys.stderr)
            return 1
        mode = "DRY-RUN" if args.dry_run else "COMPLETE"
        print(f"train: {mode} · config sha256:{prepared.config_hash[:12]}")
        print(f"resolved config: {prepared.resolved_config_path}")
        return 0
    run = json.loads(args.path.read_text(encoding="utf-8"))
    verdict = evaluate_release_gates(run)
    print("PEREGRINE · observed local run")
    print(f"run: {run['run_id']}")
    print(f"dataset: {run['dataset_version']} sha256:{run['dataset_hash'][:12]}")
    names = [args.target] if args.target else list(TARGET_NAMES)
    for name in names:
        _print_target(name, run["targets"][name])
    failed = ",".join(verdict.failed_gate_ids) or "none"
    print(f"release: {'PROMOTE' if verdict.passed else 'BLOCK'} failed={failed}")
    return 0 if verdict.passed else 1


def _print_target(name: str, metrics: dict[str, Any]) -> None:
    """Print one target's observed metric line."""
    print(
        f"{name}: mAP@0.50 proxy {metrics['map50_proxy']:.4f}"
        f" / p95 {metrics['p95_ms']:.2f} ms / {metrics['size_mb']:.1f} MB"
    )


if __name__ == "__main__":
    raise SystemExit(main())
