import { GlossTerm } from "@peregrine/ui";

const lede = { margin: 0, maxWidth: "60ch", font: "18px/1.6 var(--font-ui)", color: "var(--ink-2)" };
const lead = { margin: 0, maxWidth: "55ch", font: "16px/1.6 var(--font-ui)", color: "var(--muted)" };

/** The hero lede — four glossary triggers inside one sentence. */
export const InHeroLede = () => (
  <p style={lede}>
    <GlossTerm>Dataset lineage</GlossTerm>, <GlossTerm>reproducible training</GlossTerm>,
    target-specific conversion, <GlossTerm>release gates</GlossTerm>, immutable infrastructure and a
    live service form one <em>operating model</em>.
  </p>
);

/** A chapter lead — the muted context the dotted underline has to survive. */
export const InChapterLead = () => (
  <p style={lead}>
    The <GlossTerm>pipeline</GlossTerm> is an evidence conveyor: each stage consumes pinned parents,
    emits an immutable <GlossTerm>artifact</GlossTerm> and may stop the release.
  </p>
);

/** Inside a table header, at the small mono scale the fleet table uses. */
export const InTableHeader = () => (
  <div style={{ display: "flex", gap: 26, font: "700 11px var(--font-data)", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
    <span>Target</span>
    <span>Lane</span>
    <span>Quality</span>
    <GlossTerm>p50</GlossTerm>
    <GlossTerm>p95</GlossTerm>
    <span>Size</span>
  </div>
);

/** The trigger on its own, at body scale. */
export const Standalone = () => (
  <p style={{ margin: 0, font: "16px/1.6 var(--font-ui)", color: "var(--ink)" }}>
    <GlossTerm>release gate (Q1—Q5)</GlossTerm>
  </p>
);
