import { RailRow } from "@peregrine/ui";

/** Canonical build-diary row: done, PASS, retained evidence. */
export const PassRecorded = () => (
  <RailRow num={9} resource="Colab T4 + W&B" evidence="run j2t2234t · cost $0" outcome="PASS" truth="RECORDED" done />
);

/** The honest refusal kept in the diary — red BLOCK, the reason in the evidence slot. */
export const BlockRecorded = () => (
  <RailRow num={4} resource="Warehouse Pallet v1" evidence="790 images · incompatible labels" outcome="BLOCK" truth="RECORDED" done />
);

/** The last row of the build: the product itself, polled live. */
export const LiveProduct = () => (
  <RailRow num={21} resource="Peregrine PWA" evidence="public web application" outcome="PASS" truth="LIVE" done />
);

/** Not yet replayed — the pending row is dimmed until the scrubber reaches it. */
export const Pending = () => (
  <RailRow num={12} resource="Target benchmark matrix" evidence="182.0 ms / 177.2 ms p95" outcome="PASS" truth="RECORDED" />
);

/** Three consecutive rows as the rail actually stacks them, refusal in the middle. */
export const Sequence = () => (
  <>
    <RailRow num={12} resource="Target benchmark matrix" evidence="182.0 ms / 177.2 ms p95" outcome="PASS" truth="RECORDED" done />
    <RailRow num={13} resource="Pre-rebaseline gate" evidence="Q2 + Q3 BLOCK" outcome="BLOCK" truth="RECORDED" done />
    <RailRow num={14} resource="Release Q1—Q5" evidence="PROMOTE · failed none" outcome="PASS" truth="RECORDED" done />
  </>
);
