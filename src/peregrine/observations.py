"""Observed target outputs for the offline contract run.

The INT8 fixture deliberately models real quantization behavior: every confidence drops,
boxes jitter by up to 0.02, one detection falls below the confidence operating point
(wh-0009 tote at 0.21 < 0.25), and one hard occluded object (wh-0012 carton) is missed by
BOTH precisions. Expected proxy accuracy: FP32 0.9565 (11 TP / 1 FN), INT8 0.9091
(10 TP / 2 FN), Q1 drop 0.0474 — non-zero and inside the 0.08 budget.
"""

from __future__ import annotations

from peregrine.metrics import Prediction

FP32_PREDICTIONS: tuple[Prediction, ...] = (
    Prediction("wh-0005", "pallet", 0.91, 0.09, 0.21, 0.39, 0.77),
    Prediction("wh-0006", "carton", 0.88, 0.44, 0.25, 0.74, 0.56),
    Prediction("wh-0007", "tote", 0.86, 0.17, 0.34, 0.39, 0.64),
    Prediction("wh-0008", "pallet", 0.84, 0.57, 0.18, 0.87, 0.70),
    Prediction("wh-0008", "carton", 0.79, 0.11, 0.23, 0.33, 0.47),
    Prediction("wh-0009", "pallet", 0.90, 0.07, 0.16, 0.34, 0.70),
    Prediction("wh-0009", "tote", 0.82, 0.55, 0.41, 0.72, 0.67),
    Prediction("wh-0010", "carton", 0.87, 0.11, 0.15, 0.34, 0.45),
    Prediction("wh-0010", "carton", 0.85, 0.60, 0.21, 0.86, 0.52),
    Prediction("wh-0011", "tote", 0.83, 0.31, 0.35, 0.52, 0.65),
    Prediction("wh-0012", "pallet", 0.89, 0.14, 0.26, 0.46, 0.79),
)

INT8_TFLITE_PREDICTIONS: tuple[Prediction, ...] = (
    Prediction("wh-0005", "pallet", 0.88, 0.10, 0.22, 0.38, 0.76),
    Prediction("wh-0006", "carton", 0.80, 0.46, 0.27, 0.73, 0.55),
    Prediction("wh-0007", "tote", 0.71, 0.18, 0.36, 0.39, 0.63),
    Prediction("wh-0008", "pallet", 0.76, 0.58, 0.21, 0.86, 0.68),
    Prediction("wh-0008", "carton", 0.55, 0.10, 0.24, 0.31, 0.46),
    Prediction("wh-0009", "pallet", 0.83, 0.08, 0.17, 0.33, 0.69),
    Prediction("wh-0009", "tote", 0.21, 0.56, 0.42, 0.71, 0.66),
    Prediction("wh-0010", "carton", 0.78, 0.12, 0.16, 0.33, 0.44),
    Prediction("wh-0010", "carton", 0.74, 0.61, 0.22, 0.85, 0.51),
    Prediction("wh-0011", "tote", 0.70, 0.32, 0.36, 0.51, 0.64),
    Prediction("wh-0012", "pallet", 0.77, 0.15, 0.27, 0.45, 0.78),
)

ARM64_QEMU_PREDICTIONS: tuple[Prediction, ...] = INT8_TFLITE_PREDICTIONS

LATENCY_MS = {
    "x86_onnx_fp32": [19.8, 20.1, 20.4, 21.2, 22.8, 23.1, 24.0, 25.2, 28.5, 31.2],
    "x86_tflite_int8": [8.4, 8.7, 9.1, 9.4, 9.9, 10.2, 10.8, 11.0, 12.1, 13.8],
    "arm64_qemu_tflite_int8": [35.1, 36.2, 37.4, 39.0, 40.3, 41.8, 43.6, 45.9, 49.2, 52.7],
}

MODEL_SIZE_MB = {
    "x86_onnx_fp32": 12.4,
    "x86_tflite_int8": 3.3,
    "arm64_qemu_tflite_int8": 3.3,
}
