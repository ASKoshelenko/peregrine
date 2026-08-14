"""Release gates for converted device artifacts.

Budgets are single-sourced from ``configs/targets/matrix.yaml`` — the same file that
drives the CI conversion matrix. Changing a budget is a config PR, not a code PR.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

import yaml

GateStatus = Literal["pass", "fail"]

_MATRIX_PATH = Path(__file__).resolve().parents[2] / "configs" / "targets" / "matrix.yaml"


@dataclass(frozen=True, slots=True)
class Budgets:
    """Release budgets loaded from the target matrix config."""

    int8_map50_drop_max: float
    x86_tflite_p95_ms_max: float
    arm64_qemu_p95_ms_max: float
    int8_size_mb_max: float


def load_budgets(path: Path = _MATRIX_PATH) -> Budgets:
    """Load release budgets from the target matrix YAML (single source of truth)."""
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    budgets = raw["budgets"]
    return Budgets(
        int8_map50_drop_max=float(budgets["int8_map50_drop_max"]),
        x86_tflite_p95_ms_max=float(budgets["x86_tflite_p95_ms_max"]),
        arm64_qemu_p95_ms_max=float(budgets["arm64_qemu_p95_ms_max"]),
        int8_size_mb_max=float(budgets["int8_size_mb_max"]),
    )


@dataclass(frozen=True, slots=True)
class GateResult:
    """One gate budget decision."""

    gate_id: str
    name: str
    status: GateStatus
    measured: float | str
    budget: float | str
    detail: str


@dataclass(frozen=True, slots=True)
class ReleaseVerdict:
    """All target gates for one observed run."""

    passed: bool
    gates: tuple[GateResult, ...]

    @property
    def failed_gate_ids(self) -> list[str]:
        """Return failed gate ids in evaluation order."""
        return [gate.gate_id for gate in self.gates if gate.status == "fail"]

    def to_dict(self) -> dict[str, object]:
        """Serialize to JSON-compatible data."""
        return {
            "passed": self.passed,
            "failed_gate_ids": self.failed_gate_ids,
            "gates": [asdict(gate) for gate in self.gates],
        }


def evaluate_release_gates(
    run: dict[str, object], budgets: Budgets | None = None
) -> ReleaseVerdict:
    """Evaluate the five non-negotiable release gates from an observed run."""
    limits = budgets if budgets is not None else load_budgets()
    targets = run["targets"]
    if not isinstance(targets, dict):
        raise TypeError("run['targets'] must be a dict")
    fp32 = _target(targets, "x86_onnx_fp32")
    int8 = _target(targets, "x86_tflite_int8")
    arm = _target(targets, "arm64_qemu_tflite_int8")

    int8_drop = round(_num(fp32, "map50_proxy") - _num(int8, "map50_proxy"), 4)
    gates = [
        GateResult(
            "Q1",
            "post-quant mAP@0.50 drop",
            "pass" if int8_drop <= limits.int8_map50_drop_max else "fail",
            int8_drop,
            limits.int8_map50_drop_max,
            "converted TFLite INT8 is evaluated as a new model",
        ),
        GateResult(
            "Q2",
            "x86 TFLite p95 latency",
            "pass" if _num(int8, "p95_ms") <= limits.x86_tflite_p95_ms_max else "fail",
            _num(int8, "p95_ms"),
            limits.x86_tflite_p95_ms_max,
            "budget is target-specific and checked after conversion",
        ),
        GateResult(
            "Q3",
            "ARM64-QEMU p95 latency",
            "pass" if _num(arm, "p95_ms") <= limits.arm64_qemu_p95_ms_max else "fail",
            _num(arm, "p95_ms"),
            limits.arm64_qemu_p95_ms_max,
            "QEMU is a trend lane, not a device-farm replacement",
        ),
        GateResult(
            "Q4",
            "INT8 artifact size",
            "pass" if _num(int8, "size_mb") <= limits.int8_size_mb_max else "fail",
            _num(int8, "size_mb"),
            limits.int8_size_mb_max,
            "size budget protects device rollout constraints",
        ),
        GateResult(
            "Q5",
            "dataset lineage pinned",
            "pass" if bool(run.get("dataset_hash")) else "fail",
            str(run.get("dataset_hash") or "missing"),
            "sha256",
            "model card must name the dataset snapshot used for evaluation",
        ),
    ]
    return ReleaseVerdict(passed=all(gate.status == "pass" for gate in gates), gates=tuple(gates))


def _target(targets: dict[str, object], name: str) -> dict[str, object]:
    value = targets[name]
    if not isinstance(value, dict):
        raise TypeError(f"target {name} must be a dict")
    return value


def _num(target: dict[str, object], key: str) -> float:
    """Read a numeric metric field with an explicit runtime type check."""
    value = target[key]
    if not isinstance(value, int | float):
        raise TypeError(f"metric {key} must be numeric, got {type(value).__name__}")
    return float(value)
