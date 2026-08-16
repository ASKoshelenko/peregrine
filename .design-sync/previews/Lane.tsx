import { Lane, LaneStage } from "@peregrine/ui";

/** RECORDED trunk from the retained release: a refusal, then the run it forced. */
export const RecordedTrunk = () => (
  <Lane>
    <LaneStage num={5} id="colab-red" name="Preflight refusal" outcome="BLOCK" truth="RECORDED" reached />
    <LaneStage num={6} id="train" name="Train the baseline" outcome="PASS" truth="RECORDED" reached />
    <LaneStage num={7} id="convert" name="Export target artifacts" outcome="PASS" truth="RECORDED" reached />
  </Lane>
);

/** DEFINED automation contract — dashed track and nodes; playback shows order, never a run. */
export const DefinedContract = () => (
  <Lane defined>
    <LaneStage num={5} id="format" name="Check formatting" cmd="ruff format --check src tests" outcome="DEFINED" truth="DEFINED" />
    <LaneStage num={6} id="typecheck" name="Type-check" cmd="mypy" outcome="DEFINED" truth="DEFINED" />
    <LaneStage num={7} id="test" name="Run the suite" cmd="pytest" outcome="DEFINED" truth="DEFINED" />
  </Lane>
);

/** Stacked orientation — the DECIDE → SERVE tail, including the preserved BLOCK. */
export const StackedDecide = () => (
  <Lane horizontal={false}>
    <LaneStage num={10} id="observe" name="Compose the evidence" cmd="make observe" outcome="PASS" truth="RECORDED" reached />
    <LaneStage num={11} id="gate-red" name="Pre-rebaseline gate" outcome="BLOCK" truth="RECORDED" reached />
    <LaneStage num={12} id="gate" name="Execute Q1—Q5" outcome="PASS" truth="RECORDED" reached />
    <LaneStage num={13} id="serve" name="Serve the promoted model" outcome="PASS" truth="LIVE" reached />
  </Lane>
);
