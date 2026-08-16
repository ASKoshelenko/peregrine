import io
import json
from asyncio import run
from collections.abc import Callable, Iterator

import pytest
from fastapi import HTTPException
from PIL import Image
from starlette.requests import Request
from starlette.types import Message

import peregrine.api as api
from peregrine.api import PredictRequest, healthz, platform, predict, predict_image, scope_image
from peregrine.inference import DetectionResult, InferenceResult


@pytest.fixture(autouse=True)
def _empty_scope_budget() -> Iterator[None]:
    api._scope_calls.clear()
    yield
    api._scope_calls.clear()


def test_healthz_contract():
    assert healthz()["ok"] is True
    assert {route.path for route in api.app.routes} >= {"/healthz", "/api/healthz"}


def test_platform_contract_is_live_and_non_secret(monkeypatch) -> None:
    monkeypatch.setattr(api, "_detector", _Detector())
    monkeypatch.setenv("K_SERVICE", "peregrine")
    monkeypatch.setenv("K_REVISION", "peregrine-00005-test")
    monkeypatch.setenv("PEREGRINE_IMAGE_DIGEST", "b" * 64)
    response = platform()
    assert response.service == "peregrine"
    assert response.revision == "peregrine-00005-test"
    assert response.model_sha256 == "a" * 64
    assert response.image_digest == "b" * 64
    assert response.min_instances == 0
    assert response.max_instances == 1


def test_platform_reads_deployed_snapshot_without_repository_configs(monkeypatch, tmp_path) -> None:
    snapshot = json.loads((api.Path("artifacts/observed/latest.json")).read_text())
    artifact_dir = tmp_path / "artifacts"
    (artifact_dir / "observed").mkdir(parents=True)
    (artifact_dir / "observed/latest.json").write_text(json.dumps(snapshot))
    monkeypatch.setattr(api, "_artifact_dir", artifact_dir)
    monkeypatch.setattr(api, "_detector", _Detector())
    monkeypatch.chdir(tmp_path)
    assert platform().run_id == snapshot["run_id"]


def test_predict_returns_lineage_and_detections():
    response = predict(PredictRequest(image_id="wh-0005", target="int8"))
    assert response.target == "x86_tflite_int8"
    assert len(response.dataset_hash) == 64
    assert response.detections == []
    assert "no per-image predictions" in response.boundary


class _Detector:
    model_sha256 = "a" * 64

    def predict(self, payload: bytes, confidence: float = 0.25) -> InferenceResult:
        assert payload
        assert confidence == 0.4
        return InferenceResult(
            width=8,
            height=6,
            latency_ms=12.3456,
            model_sha256="a" * 64,
            detections=(DetectionResult("carton", 0.9, (1, 2, 7, 5)),),
        )


def _png() -> bytes:
    output = io.BytesIO()
    Image.new("RGB", (8, 6), "white").save(output, format="PNG")
    return output.getvalue()


def _request(
    payload: bytes,
    content_type: str,
    content_length: str | None = None,
    path: str = "/api/predict",
) -> Request:
    sent = False

    async def receive() -> Message:
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": payload, "more_body": False}

    headers = [(b"content-type", content_type.encode())]
    if content_length is not None:
        headers.append((b"content-length", content_length.encode()))
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": path,
            "headers": headers,
        },
        receive,
    )


def test_live_predict_returns_real_runtime_contract(monkeypatch) -> None:
    monkeypatch.setattr(api, "_detector", _Detector())
    response = run(predict_image(_request(_png(), "image/png"), confidence=0.4))
    assert response.runtime == "ONNX Runtime · CPUExecutionProvider"
    assert response.model_sha256 == "a" * 64
    assert response.detections[0].label == "carton"
    assert response.retention == "processed in memory; image bytes are not retained"


def test_live_predict_rejects_unsupported_media_type() -> None:
    try:
        run(predict_image(_request(b"not an image", "text/plain")))
    except HTTPException as error:
        assert error.status_code == 415
    else:
        raise AssertionError("unsupported content type was accepted")


def test_live_predict_rejects_declared_oversize() -> None:
    try:
        run(
            predict_image(
                _request(_png(), "image/png", str(api.MAX_UPLOAD_BYTES + 1)), confidence=0.4
            )
        )
    except HTTPException as error:
        assert error.status_code == 413
    else:
        raise AssertionError("oversize payload was accepted")


def test_live_predict_rejects_invalid_content_length() -> None:
    try:
        run(predict_image(_request(_png(), "image/png", "unknown"), confidence=0.4))
    except HTTPException as error:
        assert error.status_code == 400
    else:
        raise AssertionError("invalid Content-Length was accepted")


def _scope_request(content_length: str | None = None) -> Request:
    return _request(_png(), "image/png", content_length, path="/api/scope")


def _scope_reply(answer: str) -> Callable[[bytes, str], str]:
    def completion(payload: bytes, content_type: str) -> str:
        assert payload
        assert content_type == "image/png"
        return answer

    return completion


def _scope_status(request: Request) -> int:
    try:
        run(scope_image(request))
    except HTTPException as error:
        return error.status_code
    return 200


def test_scope_route_is_registered_under_the_public_api_prefix() -> None:
    assert "/api/scope" in {route.path for route in api.app.routes}


def test_scope_returns_a_cloud_vlm_judgement_from_fenced_json(monkeypatch) -> None:
    monkeypatch.setattr(
        api,
        "_scope_completion",
        _scope_reply(
            '```json\n{"in_domain": true, '
            '"description": "A warehouse aisle with pallets and cartons."}\n```'
        ),
    )
    response = run(scope_image(_scope_request()))
    assert response.in_domain is True
    assert response.description == "A warehouse aisle with pallets and cartons."
    assert response.model_family == "cloud-vlm"


def test_scope_reports_an_out_of_domain_frame_without_naming_people(monkeypatch) -> None:
    monkeypatch.setattr(
        api,
        "_scope_completion",
        _scope_reply('{"in_domain": false, "description": "A person standing in a kitchen."}'),
    )
    response = run(scope_image(_scope_request()))
    assert response.in_domain is False
    assert response.description == "A person standing in a kitchen."


def test_scope_degrades_to_unavailable_when_the_model_refuses(monkeypatch) -> None:
    monkeypatch.setattr(api, "_scope_completion", _scope_reply("I cannot help with that."))
    try:
        run(scope_image(_scope_request()))
    except HTTPException as error:
        assert error.status_code == 503
        assert error.detail == "scope unavailable"
    else:
        raise AssertionError("a refusal was rendered as a scope answer")


def test_scope_degrades_to_unavailable_when_the_cloud_call_fails(monkeypatch) -> None:
    def explode(payload: bytes, content_type: str) -> str:
        raise OSError("vertex is unreachable")

    monkeypatch.setattr(api, "_scope_completion", explode)
    assert _scope_status(_scope_request()) == 503


def test_scope_degrades_to_unavailable_when_credentials_are_missing(monkeypatch) -> None:
    class _CredentialsError(Exception):
        pass

    def unauthorised(payload: bytes, content_type: str) -> str:
        raise _CredentialsError("no default credentials")

    monkeypatch.setattr(api, "_scope_completion", unauthorised)
    assert _scope_status(_scope_request()) == 503


def test_scope_rejects_unsupported_media_type(monkeypatch) -> None:
    monkeypatch.setattr(api, "_scope_completion", _scope_reply('{"in_domain": true, "d": "x"}'))
    assert _scope_status(_request(b"not an image", "text/plain", path="/api/scope")) == 415
    assert not api._scope_calls


def test_scope_rejects_declared_oversize(monkeypatch) -> None:
    monkeypatch.setattr(api, "_scope_completion", _scope_reply('{"in_domain": true, "d": "x"}'))
    assert _scope_status(_scope_request(str(api.MAX_UPLOAD_BYTES + 1))) == 413
    assert not api._scope_calls


def test_scope_rate_limit_refuses_the_call_beyond_the_window_budget(monkeypatch) -> None:
    monkeypatch.setattr(
        api,
        "_scope_completion",
        _scope_reply('{"in_domain": true, "description": "A storage rack holding cartons."}'),
    )
    for _ in range(api.SCOPE_RATE_LIMIT):
        assert _scope_status(_scope_request()) == 200
    try:
        run(scope_image(_scope_request()))
    except HTTPException as error:
        assert error.status_code == 429
        assert error.detail == "scope rate limit reached"
    else:
        raise AssertionError("the global scope budget was exceeded")
