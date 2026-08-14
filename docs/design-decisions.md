# Design decisions

- YOLOv8n + AGPL note: demo speed over production licensing; alternatives named before client work.
- DVC + GCS: enough for dataset snapshot proof without committing images.
- Post-quant eval: the converted artifact gates release, not the training checkpoint.
- Per-channel INT8: default for the first TFLite lane.
- NMS placement: target runtime must own the final NMS contract before parity can be trusted.
- QEMU lane: trend and packaging signal, not absolute latency.
- WIF split identities: read/eval and write/deploy are separate identities.
- CPU-smoke fallback: quota failure proves workflow mechanics without pretending GPU training happened.
- Model card: every metric row names data hash, env hash, fingerprint, target, and cost boundary.
