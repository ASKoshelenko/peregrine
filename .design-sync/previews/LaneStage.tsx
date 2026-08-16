import { Lane, LaneStage } from "@peregrine/ui";

/** A written CI step: dashed node, blue DEFINED chip, the committed command. */
export const DefinedStep = () => (
  <Lane defined>
    <LaneStage num={1} id="checkout" name="Check out the commit" cmd="actions/checkout@v4" outcome="DEFINED" truth="DEFINED" />
  </Lane>
);

/** Reached and passed on a real retained run: signal tone, PASS flag, ✓ mark. */
export const PassRecorded = () => (
  <Lane>
    <LaneStage num={6} id="train" name="Train the baseline" outcome="PASS" truth="RECORDED" reached />
  </Lane>
);

/** The refusal the system kept: red tone, BLOCK flag, × mark. */
export const BlockRecorded = () => (
  <Lane>
    <LaneStage num={5} id="colab-red" name="Preflight refusal" outcome="BLOCK" truth="RECORDED" reached />
  </Lane>
);

/** The serving stage is the only LIVE one — state polled from production. */
export const LiveServe = () => (
  <Lane>
    <LaneStage num={13} id="serve" name="Serve the promoted model" outcome="PASS" truth="LIVE" reached />
  </Lane>
);

/** Not yet reached: no outcome mark, hollow node dot, unfilled track. */
export const NotReached = () => (
  <Lane>
    <LaneStage num={12} id="gate" name="Execute Q1—Q5" outcome="PASS" truth="RECORDED" />
  </Lane>
);
