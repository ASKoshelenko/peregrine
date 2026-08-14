from copy import deepcopy

from peregrine.gates import evaluate_release_gates, load_budgets
from peregrine.pipeline import observed_run


def test_observed_release_passes_all_gates():
    verdict = evaluate_release_gates(observed_run())
    assert verdict.passed
    assert verdict.failed_gate_ids == []


def test_accuracy_cliff_blocks_int8_release():
    run = deepcopy(observed_run())
    run["targets"]["x86_tflite_int8"]["map50_proxy"] = 0.50
    verdict = evaluate_release_gates(run)
    assert not verdict.passed
    assert verdict.failed_gate_ids == ["Q1"]


def test_missing_dataset_hash_fails_lineage_gate():
    run = observed_run()
    run["dataset_hash"] = ""
    verdict = evaluate_release_gates(run)
    assert "Q5" in verdict.failed_gate_ids


def test_q1_measures_a_real_delta_within_budget():
    run = observed_run()
    verdict = evaluate_release_gates(run)
    q1 = next(gate for gate in verdict.gates if gate.gate_id == "Q1")
    assert run["targets"]["x86_onnx_fp32"]["map50_proxy"] == 0.9565
    assert run["targets"]["x86_tflite_int8"]["map50_proxy"] == 0.9091
    assert q1.measured == 0.0474
    assert q1.status == "pass"


def test_budgets_come_from_the_target_matrix():
    budgets = load_budgets()
    assert budgets.int8_map50_drop_max == 0.08
    assert budgets.x86_tflite_p95_ms_max == 15.0
    assert budgets.arm64_qemu_p95_ms_max == 60.0
    assert budgets.int8_size_mb_max == 4.0
