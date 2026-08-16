import { Metric } from "@peregrine/ui";

/** Hero tile 1 — held-out quality, FP32 → INT8, with the quantization cost underneath. */
export const Quality = () => (
  <Metric label="Held-out mAP@0.50" value="0.9713 → 0.9451" note="quantization cost 0.0262" />
);

/** Hero tile 2 — the benchmarked p95 that Q2 judges. */
export const Latency = () => (
  <Metric label="x86 INT8 p95" value="182.0 ms" note="100 measured invocations" />
);

/** Hero tile 3 — artifact size, the budget Q4 protects. */
export const ArtifactSize = () => (
  <Metric label="INT8 artifact" value="3.33 MB" note="3.7× smaller than ONNX" />
);

/** Hero tile 4 — the verdict itself rendered as a measurement. */
export const Verdict = () => (
  <Metric label="Observed verdict" value="PROMOTE" note="5 committed gates" />
);

/** Missing evidence renders a dash — never a convenient fallback. */
export const NoEvidence = () => (
  <Metric label="ARM64 INT8 p95" value="—" note="no retained measurement" />
);
