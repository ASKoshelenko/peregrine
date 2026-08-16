import { ConsoleLine } from "@peregrine/ui";

const log = { display: "grid", gap: 2 };

/** Every kind the design system owns, in the order a release replay emits them. */
export const EveryKind = () => (
  <div style={log}>
    <ConsoleLine kind="cmd">make observe</ConsoleLine>
    <ConsoleLine kind="note">dvc.yaml → stages.observe.cmd · PYTHONPATH=src python -m peregrine.cli observe</ConsoleLine>
    <ConsoleLine kind="ok">[data] run peregrine-real-f065204c3a87 · dataset 0c46212dc22a…</ConsoleLine>
    <ConsoleLine kind="fail">[gate] Q2 182.0363 ms ≤ 15.0 ms FAIL</ConsoleLine>
    <ConsoleLine kind="promote">[release] PROMOTE · failed none</ConsoleLine>
    <ConsoleLine kind="live">[serve] peregrine/peregrine-00010-qn5</ConsoleLine>
  </div>
);

/** The two provenance chips a line may carry: quiet RECORDED, loud LIVE. */
export const WithTruthChips = () => (
  <div style={log}>
    <ConsoleLine kind="ok" chip="RECORDED">[measure] x86_tflite_int8 · p95 182.0 ms · 3.33 MB</ConsoleLine>
    <ConsoleLine kind="live" chip="LIVE">[run] revision peregrine-00010-qn5 · 1 CPU / 1 GiB</ConsoleLine>
  </div>
);

/** First-failure refusal: the pre-rebaseline gate, preserved instead of relabeled. */
export const Refusal = () => (
  <div style={log}>
    <ConsoleLine kind="cmd">make gate</ConsoleLine>
    <ConsoleLine kind="ok">[Q1] PASS · 0.0262 ≤ 0.08</ConsoleLine>
    <ConsoleLine kind="fail">[Q2] BLOCK · 182.0363 &gt; 15.0</ConsoleLine>
    <ConsoleLine kind="fail">[Q3] BLOCK · 286.6515 &gt; 60.0</ConsoleLine>
    <ConsoleLine kind="note">first-failure refusal · budgets from configs/targets/matrix.yaml</ConsoleLine>
  </div>
);

/** The passing run, line by line, as the control room replays it. */
export const PromotedRun = () => (
  <div style={log}>
    <ConsoleLine kind="ok">[train] run j2t2234t · 8 m 45 s · $0</ConsoleLine>
    <ConsoleLine kind="ok">[convert] 12.27 MB → 3.33 MB · calibration 90dbeb2be9fd…</ConsoleLine>
    <ConsoleLine kind="ok">[gate] Q1 0.0262 · Q2 182.0 ms · Q3 177.2 ms · Q4 3.33 MB</ConsoleLine>
    <ConsoleLine kind="promote" chip="RECORDED">[release] PROMOTE · evidence a08e0f17b7ae…</ConsoleLine>
  </div>
);
