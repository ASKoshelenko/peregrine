import { LiveDot, TruthChip } from "@peregrine/ui";

const line = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, margin: 0 };
const mono = { font: "12px var(--font-data)", color: "var(--ink-2)" };
const muted = { font: "11px var(--font-data)", color: "var(--muted)" };

/** The site's infra revision line: heartbeat, LIVE chip, revision, poll age. */
export const LiveRevision = () => (
  <p style={line}>
    <LiveDot />
    <TruthChip state="LIVE" />
    <span style={{ fontSize: 14 }}>Live revision</span>
    <code style={mono}>peregrine-00010-qn5</code>
    <small style={muted}>checked 27s ago</small>
  </p>
);

/** Platform map, serving layer: the dot marks the service identity as polled, not replayed. */
export const LiveServiceIdentity = () => (
  <p style={line}>
    <LiveDot />
    <TruthChip state="LIVE" />
    <b style={{ fontSize: 14 }}>peregrine · peregrine-00010-qn5</b>
    <code style={mono}>a08e0f17b7ae</code>
  </p>
);

/** The dot on its own, next to the legend wording it always carries. */
export const Solo = () => (
  <p style={line}>
    <LiveDot />
    <small style={muted}>queried now</small>
  </p>
);
