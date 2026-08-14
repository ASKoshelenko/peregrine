import io
from asyncio import run

from fastapi import HTTPException
from PIL import Image
from starlette.requests import Request
from starlette.types import Message

import peregrine.api as api
from peregrine.api import PredictRequest, healthz, predict, predict_image
from peregrine.inference import DetectionResult, InferenceResult


def test_healthz_contract():
    assert healthz()["ok"] is True


def test_predict_returns_lineage_and_detections():
    response = predict(PredictRequest(image_id="wh-0005", target="int8"))
    assert response.target == "x86_tflite_int8"
    assert len(response.dataset_hash) == 64
    assert response.detections


class _Detector:
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


def _request(payload: bytes, content_type: str, content_length: str | None = None) -> Request:
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
            "path": "/api/predict",
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
