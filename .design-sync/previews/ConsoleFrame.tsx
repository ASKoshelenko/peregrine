import { ConsoleFrame, ConsoleLine } from "@peregrine/ui";

export const RecordedReplay = () => (
  <ConsoleFrame title="release@peregrine" recorded>
    <ConsoleLine kind="cmd">make observe</ConsoleLine>
    <ConsoleLine kind="note">dvc.yaml → stages.observe.cmd · PYTHONPATH=src python -m peregrine.cli observe</ConsoleLine>
    <ConsoleLine kind="ok">[data] run peregrine-real-f065204c3a87 · fingerprint 0c46212d…</ConsoleLine>
    <ConsoleLine kind="ok">[measure] x86_tflite_int8 · p95 182.0 ms · 3.33 MB</ConsoleLine>
    <ConsoleLine kind="ok">[Q1] PASS · 0.0262 ≤ 0.08</ConsoleLine>
    <ConsoleLine kind="fail">[Q2] BLOCK · 268.9 &gt; 227.5</ConsoleLine>
    <ConsoleLine kind="promote">[release] PROMOTE · evidence a08e0f17…</ConsoleLine>
    <ConsoleLine kind="live" chip="LIVE">[serve] peregrine/peregrine-00010-qn5</ConsoleLine>
  </ConsoleFrame>
);
export const ShortLog = () => (
  <ConsoleFrame title="release@peregrine">
    <ConsoleLine kind="cmd">make check</ConsoleLine>
    <ConsoleLine kind="ok">ruff · mypy · pytest — clean</ConsoleLine>
  </ConsoleFrame>
);
