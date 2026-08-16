import { ExplainCard, GlossTerm } from "@peregrine/ui";

/** Default state: collapsed, only the blue "In plain words" rule and summary show. */
export const Closed = () => (
  <ExplainCard>
    Before the model gets a job it must pass five exams: accurate enough, fast enough on two kinds of
    machines, small enough — and carrying complete paperwork about the photos that taught it.
  </ExplainCard>
);

/** Opened on the gate chapter — the plain-words layer the site ships. */
export const OpenGates = () => (
  <ExplainCard open>
    The pass marks were committed before the exam was taken, so nobody could bend them afterwards. Here
    you play the examiner: drag the sliders to make the limits stricter and watch the system refuse its
    own model. It is a what-if game — nothing real changes.
  </ExplainCard>
);

/** Opened on the platform chapter, with the glossary triggers it really carries. */
export const OpenPlatform = () => (
  <ExplainCard open>
    Training a model once is easy — the hard part is proving that next month's version is still safe to{" "}
    <GlossTerm>release</GlossTerm>, with no human re-checking everything by hand. That is what it means
    to <GlossTerm>qualify</GlossTerm> a model.
  </ExplainCard>
);

/** Opened on the production-posture chapter — the longest aside in the set. */
export const OpenOps = () => (
  <ExplainCard open>
    What keeps the service safe and cheap after the demo ends: it runs as one exact edition pinned by
    fingerprint, holds almost no keys to anything else, sleeps when idle so the bill stays tiny — and
    whenever a self-check fails, it stops instead of pretending (<GlossTerm>fail closed</GlossTerm>).
  </ExplainCard>
);
