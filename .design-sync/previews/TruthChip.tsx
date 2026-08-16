import { TruthChip } from "@peregrine/ui";

export const FourStates = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
    <TruthChip state="LIVE" /><TruthChip state="RECORDED" /><TruthChip state="DEFINED" /><TruthChip state="SIMULATED" />
  </div>
);
export const QuietTier = () => (
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    <TruthChip state="RECORDED" /><TruthChip state="RECORDED" quiet /><TruthChip state="DEFINED" quiet />
  </div>
);
export const InlineInText = () => (
  <p style={{ font: "12px/1.7 var(--font-data)", color: "var(--ink-2)", margin: 0 }}>
    [serve] peregrine/peregrine-00010-qn5 <TruthChip state="LIVE" inline />
  </p>
);
