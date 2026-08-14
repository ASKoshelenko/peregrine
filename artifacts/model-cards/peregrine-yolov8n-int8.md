# peregrine-yolov8n INT8 model card

Run: `peregrine-real-f065204c3a87`
Observed at: `2026-08-14T11:37:35.389683+00:00`
Fingerprint: `a08e0f17b7aee72dcb387c170594f92c7492bc349d723cb7011cc87acb0b75c8`
Dataset hash: `0c46212dc22a71b9c59846c70681dd9a53cd3733e51d196364b8d20230855a77`
Environment hash: `5bf7feff8009c379d1faedba1076d9f18df21155fd3d3d36ec130e4998869a6f`
Accuracy basis: COCO mAP@0.50 / mAP@0.50:0.95, Ultralytics evaluator, held-out test split (N=11)
Cost: `0`

## Lineage

| Field | Value |
|---|---|
| `source_commit` | `f065204c3a87f6b21e93ab59e83a5d42fc8cc681` |
| `budget_commit` | `da593f118f989fa90414fb2546d7672d3602f3ec` |
| `run_commit` | `f065204c3a87f6b21e93ab59e83a5d42fc8cc681` |
| `config_sha256` | `85079b7454311765ce82a09bbfc07da485db896881acaef0a020ecb2bb16495e` |
| `dataset_fingerprint` | `0c46212dc22a71b9c59846c70681dd9a53cd3733e51d196364b8d20230855a77` |
| `calibration_hash` | `90dbeb2be9fd334563b676895d0c173436344d03e8c594132a597fc4e361c28c` |
| `wandb_run` | `j2t2234t` |

## Metrics by target

| Target | mAP50 | mAP50-95 | p50 ms | p95 ms | Size MB | Lane | Host |
|---|---:|---:|---:|---:|---:|---|---|
| `x86_onnx_fp32` | 0.9713 | 0.8267 | 99.24 | 146.94 | 12.3 | reference | {'arch': 'x86_64', 'cpu_model': 'x86_64', 'os': 'Linux-6.6.122+-x86_64-with-glibc2.35', 'python': '3.12.13', 'runtime_name': 'onnxruntime', 'runtime_version': '1.28.0'} |
| `x86_tflite_int8` | 0.9451 | 0.6594 | 126.70 | 182.04 | 3.3 | reference | {'arch': 'x86_64', 'cpu_model': 'x86_64', 'os': 'Linux-6.6.122+-x86_64-with-glibc2.35', 'python': '3.12.13', 'runtime_name': 'tensorflow-lite', 'runtime_version': '2.20.0'} |
| `arm64_tflite_int8` | 0.9451 | 0.6594 | 163.82 | 177.22 | 3.3 | trend | {'arch': 'aarch64', 'cpu_model': 'unknown', 'os': 'Linux-6.10.14-linuxkit-aarch64-with-glibc2.41', 'python': '3.12.13', 'runtime_name': 'tensorflow-lite', 'runtime_version': '2.21.0'} |

## Release verdict

Decision: `PROMOTE`
Failed gates: `none`

## Boundaries

- **accuracy:** mAP@0.50 / mAP@0.50:0.95 by the Ultralytics evaluator on the held-out test split (N=11)
- **arm64:** ARM64 is a labeled trend lane (native container class), not device latency
- **serving:** FastAPI contract validated by tests; scale-to-zero deployment is a cost decision exercised on demand

## License decision

YOLOv8/Ultralytics model lane is AGPL-3.0.
