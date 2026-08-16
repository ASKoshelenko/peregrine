import { PanelLabel } from "@peregrine/ui";

const panel = { display: "grid", gap: 10, padding: 14, border: "1px solid var(--line)", background: "var(--surface)" };
const body = { margin: 0, font: "13px/1.6 var(--font-ui)", color: "var(--muted)" };
const row = { display: "flex", justifyContent: "space-between", gap: 12, font: "12px var(--font-data)", color: "var(--ink-2)" };

/** Canonical: the uppercase signal-green label on its own. */
export const AutomationSurfaces = () => <PanelLabel>Automation surfaces</PanelLabel>;

/** Titling the gate-lab aside. */
export const ScenarioControls = () => (
  <aside style={panel}>
    <PanelLabel>Scenario controls</PanelLabel>
    <p style={body}>Change a hypothetical budget. The observed measurements stay fixed; only your scenario changes.</p>
    <div style={row}><span>Q2 x86 TFLite p95 latency</span><span>≤ 227.5 ms</span></div>
    <div style={row}><span>Q4 INT8 artifact size</span><span>≤ 4.0 MB</span></div>
  </aside>
);

/** Titling the detector's response panel. */
export const LiveResponse = () => (
  <section style={panel}>
    <PanelLabel>Live response</PanelLabel>
    <div style={row}><span>Runtime</span><span>onnxruntime 1.28.0</span></div>
    <div style={row}><span>Model</span><span>peregrine-yolov8n</span></div>
    <div style={row}><span>SHA-256</span><span>a08e0f17b7ae</span></div>
  </section>
);

/** Titling the developer-contract card in the evidence chapter. */
export const DeveloperContract = () => (
  <section style={panel}>
    <PanelLabel>Developer contract</PanelLabel>
    <pre style={{ margin: 0, font: "11px/1.7 var(--font-data)", color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
      <code>curl -s https://peregrine.devopsdive.com/api/healthz</code>
    </pre>
  </section>
);
