from peregrine.dataset import Box
from peregrine.metrics import Prediction, f1_from_counts, iou, match_counts


def test_iou_handles_overlap():
    left = Box("pallet", 0.0, 0.0, 1.0, 1.0)
    right = Box("pallet", 0.5, 0.5, 1.0, 1.0)
    assert iou(left, right) == 0.25


def test_f1_from_counts():
    assert f1_from_counts(5, 0, 0) == 1.0
    assert round(f1_from_counts(3, 1, 1), 4) == 0.75


def test_confidence_operating_point_filters_low_confidence():
    truth = {"img": (Box("pallet", 0.1, 0.1, 0.5, 0.5),)}
    strong = Prediction("img", "pallet", 0.9, 0.1, 0.1, 0.5, 0.5)
    weak = Prediction("img", "pallet", 0.2, 0.6, 0.6, 0.9, 0.9)
    assert match_counts(truth, (strong, weak), 0.5) == (1, 0, 0)
    assert match_counts(truth, (strong, weak), 0.5, confidence_threshold=0.0) == (1, 1, 0)
