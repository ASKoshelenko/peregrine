import json

from peregrine.cli import main
from peregrine.pipeline import observed_run


def test_summary_exits_zero_on_promote(tmp_path, capsys):
    path = tmp_path / "latest.json"
    path.write_text(json.dumps(observed_run()), encoding="utf-8")
    assert main(["summary", str(path)]) == 0
    assert "PROMOTE" in capsys.readouterr().out


def test_summary_exits_one_on_block(tmp_path, capsys):
    run = observed_run()
    run["targets"]["x86_tflite_int8"]["map50_proxy"] = 0.50
    path = tmp_path / "latest.json"
    path.write_text(json.dumps(run), encoding="utf-8")
    assert main(["summary", str(path)]) == 1
    assert "BLOCK" in capsys.readouterr().out


def test_summary_target_filter_prints_one_target(tmp_path, capsys):
    path = tmp_path / "latest.json"
    path.write_text(json.dumps(observed_run()), encoding="utf-8")
    assert main(["summary", str(path), "--target", "x86_tflite_int8"]) == 0
    out = capsys.readouterr().out
    assert "x86_tflite_int8" in out
    assert "x86_onnx_fp32:" not in out
