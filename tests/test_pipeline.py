from peregrine.pipeline import observed_run


def test_observed_run_contains_lineage_and_targets():
    run = observed_run()
    assert run["schema_version"] == "peregrine.observed.v1"
    assert len(run["fingerprint"]) == 64
    assert set(run["targets"]) == {"x86_onnx_fp32", "x86_tflite_int8", "arm64_qemu_tflite_int8"}
    assert run["release_verdict"]["passed"] is True


def test_int8_is_smaller_than_fp32():
    run = observed_run()
    assert run["targets"]["x86_tflite_int8"]["size_mb"] < run["targets"]["x86_onnx_fp32"]["size_mb"]
