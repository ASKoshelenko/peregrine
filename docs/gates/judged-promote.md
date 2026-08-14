# Gate follow-up: judged real run PROMOTE

Run: `peregrine-real-761f63f981fb`

Dataset fingerprint:
`0c46212dc22a71b9c59846c70681dd9a53cd3733e51d196364b8d20230855a77`

Source checkpoint SHA-256:
`27f44fd8b3028975111c4a8de03ea22a43482f389a1ada7166c8a4ebc0f4cf64`

Budget commit: `da593f1`

Judged-run commit: `761f63f`

The budget commit strictly precedes the judged-run commit.

## Observed targets

| Target | mAP@0.50 | mAP@0.50:0.95 | p50 | p95 | Size | Lane |
|---|---:|---:|---:|---:|---:|---|
| x86 ONNX FP32 | 0.9713 | 0.8267 | 99.24 ms | 146.94 ms | 12.27 MB | reference |
| x86 TFLite INT8 | 0.9451 | 0.6594 | 126.70 ms | 182.04 ms | 3.33 MB | reference |
| ARM64 TFLite INT8 | 0.9451 | 0.6594 | 163.82 ms | 177.22 ms | 3.33 MB | trend |

## Judged gates

| Gate | Measured | Budget | Verdict |
|---|---:|---:|---|
| Q1 · FP32 → INT8 mAP@0.50 drop | 0.0262 | ≤ 0.08 | PASS |
| Q2 · x86 TFLite INT8 p95 | 182.0363 ms | ≤ 227.5 ms | PASS |
| Q3 · ARM64 TFLite INT8 p95 | 177.2213 ms | ≤ 358.3 ms | PASS |
| Q4 · INT8 size | 3.33 MB | ≤ 4.0 MB | PASS |
| Q5 · dataset lineage | `0c46212dc22a…` | SHA-256 required | PASS |

Decision: **PROMOTE** (`failed=none`).

## Honest boundaries

- The strict mAP@0.50:0.95 loss from ONNX to INT8 is 0.1673 even though Q1, by prior decision,
  gates mAP@0.50 loss.
- INT8 is 3.7× smaller than ONNX but was slower on the Colab x86 reference host. No speedup claim
  is made for that substrate.
- ARM64 is a native container trend measurement, not device latency or an SLA.
- An 8-image under-calibration experiment did not produce a Q1 failure (mAP@0.50 0.967); it is
  recorded as a valid negative result rather than manufactured into a red run.
