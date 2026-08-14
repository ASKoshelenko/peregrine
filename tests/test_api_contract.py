from peregrine.api import PredictRequest, healthz, predict


def test_healthz_contract():
    assert healthz()["ok"] is True


def test_predict_returns_lineage_and_detections():
    response = predict(PredictRequest(image_id="wh-0005", target="int8"))
    assert response.target == "x86_tflite_int8"
    assert len(response.dataset_hash) == 64
    assert response.detections
