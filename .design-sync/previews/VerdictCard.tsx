import { VerdictCard } from "@peregrine/ui";

/** The observed release: every committed gate accepted the measurements. */
export const Promote = () => (
  <VerdictCard verdict="PROMOTE" note="run peregrine-real-f065204c3a87 · 5 committed gates · failed none" />
);

/** First-failure refusal — the release stops at the gate that said no. */
export const Block = () => (
  <VerdictCard verdict="BLOCK" note="First refusal: Q3 · budget source: configs/targets/matrix.yaml" />
);

/** Gate-lab what-if that still promotes: SIMULATED chip above the verdict. */
export const SimulatedPromote = () => (
  <VerdictCard verdict="PROMOTE" simulated note="Every hypothetical budget accepts the observed measurements." />
);

/** Gate-lab what-if that refuses — nothing real changed. */
export const SimulatedBlock = () => (
  <VerdictCard
    verdict="BLOCK"
    simulated
    note="Hypothetical simulation. It does not change committed budgets, artifacts or the model registry."
  />
);

/** Verdict alone, no sourcing note. */
export const NoNote = () => <VerdictCard verdict="PROMOTE" />;
