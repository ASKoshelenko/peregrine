# Peregrine

**End-to-end MLOps for computer-vision device inference — the path from a versioned
warehouse dataset to a quantized, benchmarked, release-gated device model.**

A peregrine falcon is what nature built when it optimized vision for speed, which is
literally what quantization for device inference is.

**Live demo:** [peregrine.devopsdive.com](https://peregrine.devopsdive.com/) — change
release budgets to see the gate accept or refuse a scenario, then upload a JPEG, PNG,
or WebP image for real ONNX Runtime inference. Images are decoded and processed only in
memory and are not retained.

## What this demo covers

One engineer, one focused build, scoped deliberately: dataset contracts and versioned
snapshots, an offline evidence pipeline that runs end to end today, release gates that
can say no, a benchmark matrix with per-target budgets, a model card, and a demo site
that renders only observed evidence. Every number in `artifacts/observed/latest.json`
is produced by `make observe`; if the evidence file is absent, the page renders dashes
and an explicit banner — it never invents numbers.

## Quickstart

    make observe   # offline evidence pipeline: metrics, gates, model card
    make check     # ruff + mypy strict + pytest
    make site      # serve the evidence-only frontend on 127.0.0.1

The production container serves the site and live API together. It bundles a
fingerprint-verified ONNX model, runs as a non-root user, and is deployed by Terraform
to a one-instance, CPU-only Cloud Run service with `min_instances=0`.

The dataset lane is license-gated and requires a local Roboflow credential that is never
committed:

    cp .env.example .env   # fill ROBOFLOW_API_KEY locally
    make dataset-fetch
    make dataset-prepare

The fetch stage validates the immutable source version, expected split counts, archive
safety, and the committed two-class mapping before installing anything under the ignored
`data/` tree. The prepare stage decodes every image, validates all YOLO rows and
image/label pairs, rejects content leakage across splits, remaps seven source classes
into the reviewed two-class label space, and writes a fingerprinted manifest plus a
deterministic calibration membership.

## How it holds itself honest

- Release budgets live in `configs/targets/matrix.yaml` and are committed before the run
  they judge; the run's lineage records both commits, and a budget chosen after seeing
  the number is not a gate.
- A converted or quantized artifact is treated as a new model and evaluated again
  (`docs/adr/0002`).
- ARM64 numbers come from a labeled trend lane, never sold as device latency
  (`docs/adr/0003`).
- The dataset license and attribution are recorded verbatim (`docs/DATASET_LICENSE.md`);
  the fetch command refuses to run before that record passes.

## Architecture notes

Decision records live in `docs/adr/`, design notes in `docs/design-decisions.md`, and
GPU/cloud runs are recorded — with the question each run answers — in
`docs/gpu-runs.yaml`.

## License

Code is MIT (see `LICENSE`). Model lanes derived from YOLOv8 (Ultralytics) are
AGPL-3.0; no model weights are distributed in this repository (see `NOTICE`).
