import numpy as np

from peregrine.inference import DetectionResult, _class_aware_nms, _decode_yolov8


def test_decode_yolov8_maps_boxes_and_applies_class_aware_nms() -> None:
    raw = np.zeros((1, 6, 3), dtype=np.float32)
    raw[0, :, 0] = [320, 320, 200, 100, 0.9, 0.1]
    raw[0, :, 1] = [322, 322, 200, 100, 0.8, 0.2]
    raw[0, :, 2] = [100, 100, 40, 40, 0.1, 0.7]
    result = _decode_yolov8(raw, 640, 640, 1.0, 0.0, 0.0, 0.25, 0.45)
    assert [item.label for item in result] == ["pallet", "carton"]
    assert result[0].box == (220.0, 270.0, 420.0, 370.0)


def test_nms_keeps_overlapping_boxes_from_different_classes() -> None:
    result = _class_aware_nms(
        [
            DetectionResult("pallet", 0.9, (0, 0, 10, 10)),
            DetectionResult("carton", 0.8, (0, 0, 10, 10)),
        ],
        0.45,
    )
    assert len(result) == 2
