"""Detection metric helpers used by the offline observed run.

Naming note: ``map50_proxy`` and ``map5095_proxy`` are F1 scores computed at fixed IoU
thresholds on the tiny contract set — a deterministic stand-in, NOT averaged-precision
COCO mAP. The real YOLO lane replaces them before any public accuracy claim. The name
keeps the ``_proxy`` suffix on every surface (JSON, model card, site) for that reason.
"""

from __future__ import annotations

from dataclasses import dataclass

from peregrine.dataset import Box, Label

CONFIDENCE_OPERATING_POINT = 0.25
"""Detections below this confidence are not counted, mirroring deployment behavior."""


@dataclass(frozen=True, slots=True)
class Prediction:
    """One model prediction."""

    image_id: str
    label: Label
    confidence: float
    x1: float
    y1: float
    x2: float
    y2: float

    def box(self) -> Box:
        """Return the prediction as a box for IoU calculation."""
        return Box(self.label, self.x1, self.y1, self.x2, self.y2)


def iou(left: Box, right: Box) -> float:
    """Compute intersection-over-union for normalized boxes."""
    ix1 = max(left.x1, right.x1)
    iy1 = max(left.y1, right.y1)
    ix2 = min(left.x2, right.x2)
    iy2 = min(left.y2, right.y2)
    intersection = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    left_area = max(0.0, left.x2 - left.x1) * max(0.0, left.y2 - left.y1)
    right_area = max(0.0, right.x2 - right.x1) * max(0.0, right.y2 - right.y1)
    union = left_area + right_area - intersection
    return 0.0 if union == 0 else intersection / union


def match_counts(
    truth: dict[str, tuple[Box, ...]],
    predictions: tuple[Prediction, ...],
    threshold: float,
    confidence_threshold: float = CONFIDENCE_OPERATING_POINT,
) -> tuple[int, int, int]:
    """Return TP/FP/FN at an IoU threshold, counting only above-confidence detections."""
    scored = tuple(item for item in predictions if item.confidence >= confidence_threshold)
    by_image: dict[str, list[Prediction]] = {}
    for prediction in scored:
        by_image.setdefault(prediction.image_id, []).append(prediction)

    tp = 0
    fp = 0
    fn = 0
    for image_id, boxes in truth.items():
        used: set[int] = set()
        preds = sorted(by_image.get(image_id, []), key=lambda item: item.confidence, reverse=True)
        for prediction in preds:
            best_index = -1
            best_iou = 0.0
            for index, box in enumerate(boxes):
                if index in used or box.label != prediction.label:
                    continue
                score = iou(box, prediction.box())
                if score > best_iou:
                    best_iou = score
                    best_index = index
            if best_index >= 0 and best_iou >= threshold:
                used.add(best_index)
                tp += 1
            else:
                fp += 1
        fn += len(boxes) - len(used)
    for image_id, preds in by_image.items():
        if image_id not in truth:
            fp += len(preds)
    return tp, fp, fn


def f1_from_counts(tp: int, fp: int, fn: int) -> float:
    """Compute F1 from detection counts."""
    denominator = (2 * tp) + fp + fn
    return 0.0 if denominator == 0 else (2 * tp) / denominator


def map_proxy(
    truth: dict[str, tuple[Box, ...]],
    predictions: tuple[Prediction, ...],
    confidence_threshold: float = CONFIDENCE_OPERATING_POINT,
) -> dict[str, float]:
    """Compute deterministic mAP-like proxy metrics for the tiny contract set.

    See the module docstring: these are F1-based proxies at the confidence operating
    point, intentionally labeled ``_proxy``. The real YOLO lane must replace them before
    any production or public accuracy claim.
    """
    tp50, fp50, fn50 = match_counts(truth, predictions, 0.50, confidence_threshold)
    values = []
    for threshold in (0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95):
        tp, fp, fn = match_counts(truth, predictions, threshold, confidence_threshold)
        values.append(f1_from_counts(tp, fp, fn))
    return {
        "map50_proxy": round(f1_from_counts(tp50, fp50, fn50), 4),
        "map5095_proxy": round(sum(values) / len(values), 4),
        "tp50": tp50,
        "fp50": fp50,
        "fn50": fn50,
    }
