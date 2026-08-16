import { GateRow } from "@peregrine/ui";

/** Q1 — quantization cost, well inside its committed budget. */
export const Q1Pass = () => (
  <GateRow
    id="Q1"
    name="post-quant mAP@0.50 drop"
    detail="converted TFLite INT8 is evaluated as a new model"
    measured={0.0262}
    budget={0.08}
    passed
  />
);

/** Q2 — the observed x86 p95 against the budget committed before the run. */
export const Q2Pass = () => (
  <GateRow
    id="Q2"
    name="x86 TFLite p95 latency"
    detail="budget is target-specific and checked after conversion"
    measured={182.0363}
    budget={227.5}
    passed
  />
);

/** Q3 — the pre-rebaseline refusal, kept instead of deleted: measured far past a fixture-era budget. */
export const Q3Block = () => (
  <GateRow
    id="Q3"
    name="ARM64 TFLite p95 latency"
    detail="fixture-era budget, preserved instead of deleted or relabeled"
    measured={286.6515}
    budget={60.0}
    passed={false}
  />
);

/** Q4 — artifact size, the tightest pass in the set. */
export const Q4Pass = () => (
  <GateRow
    id="Q4"
    name="INT8 artifact size"
    detail="size budget protects device rollout constraints"
    measured={3.33}
    budget={4.0}
    passed
  />
);

/** Detail omitted — the compact row the verdict strip uses. */
export const NoDetail = () => (
  <GateRow id="Q2" name="x86 TFLite p95 latency" measured={182.0363} budget={227.5} passed />
);
