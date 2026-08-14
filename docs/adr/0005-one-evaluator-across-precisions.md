# ADR-0005: one evaluator across precisions

FP32 ONNX and INT8 TFLite artifacts are scored by the same Ultralytics evaluator on the
same held-out split with the same preprocessing and NMS. A hand-rolled second decoder is
the classic parity-bug factory; the quantization delta must measure the model, not the
harness.
