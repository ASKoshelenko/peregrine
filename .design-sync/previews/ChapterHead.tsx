import { ChapterHead } from "@peregrine/ui";

/** Canonical: numbered eyebrow, display headline, lead paragraph. */
export const PlatformChapter = () => (
  <ChapterHead
    eyebrow="The platform under the model"
    title="Follow one artifact through the whole system."
    lead="Select a layer. The map shows what it owns, what it emits, and which engineering control prevents a quiet failure."
  />
);

/** Gate lab opener — shorter headline, same three-part rhythm. */
export const GateLab = () => (
  <ChapterHead
    eyebrow="Policy as executable code"
    title="Make the release system say no."
    lead="Change a hypothetical budget. The observed measurements stay fixed; only your scenario changes."
  />
);

/** Production posture — the longest headline the system ships. */
export const OpsChapter = () => (
  <ChapterHead
    eyebrow="Production posture"
    title="Cheap when idle. Bounded when busy. Explainable always."
    lead="Platform engineering is the set of constraints that remain true after the demo ends."
  />
);

/** Lead omitted — eyebrow and headline only. */
export const NoLead = () => (
  <ChapterHead eyebrow="Why this exists" title="Six failure modes, one operating model." />
);
