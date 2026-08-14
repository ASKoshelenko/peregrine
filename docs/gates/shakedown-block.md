# Preserved gate run: hardware shakedown BLOCK

This is the genuine red run required by the release-gate demonstration. It is preserved rather
than deleted or relabeled as a success.

The first real-host shakedown used the original fixture-era latency budgets committed before any
real hardware measurement. It was diagnostic, but applying those budgets produces the following
honest verdict:

| Gate | Measured | Pre-rebaseline budget | Verdict |
|---|---:|---:|---|
| Q1 · FP32 → INT8 mAP@0.50 drop | 0.0262 | ≤ 0.08 | PASS |
| Q2 · x86 TFLite INT8 p95 | 182.0363 ms | ≤ 15.0 ms | **FAIL** |
| Q3 · ARM64 TFLite INT8 p95 | 286.6515 ms | ≤ 60.0 ms | **FAIL** |
| Q4 · INT8 size | 3.33 MB | ≤ 4.0 MB | PASS |
| Q5 · dataset lineage | `0c46212dc22a…` | SHA-256 required | PASS |

Decision: **BLOCK** (`Q2`, `Q3`).

The failure was not fixed by hiding the measurements. The budgets were re-baselined in their own
commit using the pre-declared formula `round(1.25 × shakedown_p95, 1)`. This yielded 227.5 ms for
the Colab x86 reference lane and 358.3 ms for the native ARM64 container trend lane.

Substrates:

- x86 reference: Colab Intel Xeon, ONNX Runtime 1.28.0 / TensorFlow Lite 2.20.0;
- ARM64 trend: native Linux arm64 Docker container on Darwin/Apple Silicon, TensorFlow Lite 2.21.0;
- protocol: batch 1, 640 input, one thread, 20 fixed images, 10 warmups, 100 invocations.

The ARM64 result is a trend proxy, not physical-device latency.
