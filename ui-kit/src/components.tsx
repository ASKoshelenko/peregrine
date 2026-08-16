import type { CSSProperties, ReactNode } from "react";

/** Truth states the platform is allowed to claim about a number or a surface. */
export type TruthState = "LIVE" | "RECORDED" | "DEFINED" | "SIMULATED";
/** Outcome vocabulary shared by lane stages, rail rows and gates. */
export type Outcome = "PASS" | "BLOCK" | "DEFINED";
/** Console line kinds; each one owns a glyph and a colour in the design system. */
export type ConsoleKind = "cmd" | "ok" | "fail" | "note" | "promote" | "live";

const TRUTH_CLASS: Record<TruthState, string> = { LIVE: "truth-live", RECORDED: "truth-recorded", DEFINED: "truth-defined", SIMULATED: "truth-simulated" };
const TRUTH_DETAIL: Record<TruthState, string> = { LIVE: "truthLiveChip", RECORDED: "truthRecordedChip", DEFINED: "truthDefinedChip", SIMULATED: "truthSimulatedChip" };
const CONSOLE_GLYPH: Record<ConsoleKind, string> = { cmd: "$", note: "·", ok: "✓", fail: "×", promote: "✓", live: "◆" };
const OUTCOME_GLYPH: Record<string, string> = { PASS: "✓", BLOCK: "×" };

const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(" ");
const pad = (n: number): string => String(n).padStart(2, "0");
const vars = (values: Record<string, string | number>): CSSProperties => values as CSSProperties;

/** Primary or secondary action button — the site's `.button` pair. */
export interface ButtonProps { variant?: "primary" | "secondary"; children: ReactNode; onClick?: () => void; disabled?: boolean }
export function Button({ variant = "primary", children, onClick, disabled = false }: ButtonProps) {
  return (
    <button type="button" className={cx("button", `button-${variant}`)} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Provenance chip: what kind of truth a value carries (`quiet` = the tier already declared by its container). */
export interface TruthChipProps { state: TruthState; quiet?: boolean; inline?: boolean }
export function TruthChip({ state, quiet = false, inline = false }: TruthChipProps) {
  return (
    <span className={cx(TRUTH_CLASS[state], inline && "truth-inline", quiet && "is-quiet")} data-i18n-aria={TRUTH_DETAIL[state]}>
      {state}
    </span>
  );
}

/** Heartbeat dot that marks a value polled from the running service. */
export function LiveDot() {
  return <span className="live-dot" aria-hidden="true" />;
}

/** Hero measurement tile: label, oversized monospace value, sourcing note. */
export interface MetricProps { label: ReactNode; value: ReactNode; note?: ReactNode }
export function Metric({ label, value, note }: MetricProps) {
  return (
    <div className="metrics">
      <article className="metric" style={vars({ "--i": 0 })}>
        <span>{label}</span>
        <strong>{value}</strong>
        {note === undefined ? null : <small>{note}</small>}
      </article>
    </div>
  );
}

/** Section opener: numbered eyebrow, display headline, optional lead paragraph. */
export interface ChapterHeadProps { eyebrow: ReactNode; title: ReactNode; lead?: ReactNode }
export function ChapterHead({ eyebrow, title, lead }: ChapterHeadProps) {
  return (
    <header className="chapter-head">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead === undefined ? null : <p>{lead}</p>}
    </header>
  );
}

/** Uppercase signal-green label that titles a panel or aside. */
export interface PanelLabelProps { children: ReactNode }
export function PanelLabel({ children }: PanelLabelProps) {
  return <div className="panel-label">{children}</div>;
}

/** Terminal shell: traffic-light bar, prompt title, optional RECORDED chip, scrolling body. */
export interface ConsoleFrameProps { title?: string; recorded?: boolean; children: ReactNode }
export function ConsoleFrame({ title = "release@peregrine", recorded = false, children }: ConsoleFrameProps) {
  return (
    <section className="run-console">
      <div className="console-bar">
        <div><i /><i /><i /></div>
        <span>{title}<span className="console-path">: ~/qualification</span></span>
        {recorded ? <b className="truth-recorded" data-i18n-aria="truthRecordedChip">RECORDED</b> : null}
      </div>
      <div className="console-body" role="log">{children}</div>
    </section>
  );
}

/** One console row: kind glyph, monospace text, optional provenance chip. */
export interface ConsoleLineProps { kind: ConsoleKind; children: ReactNode; chip?: "LIVE" | "RECORDED" }
export function ConsoleLine({ kind, children, chip }: ConsoleLineProps) {
  return (
    <div className={cx("console-line", `console-${kind}`)}>
      <span aria-hidden="true">{CONSOLE_GLYPH[kind]}</span>
      <code>
        <span className="console-text">{children}</span>
        {chip === undefined ? null : <TruthChip state={chip} inline quiet={chip === "RECORDED"} />}
      </code>
    </div>
  );
}

/** Pipeline lane shell holding `LaneStage` children (dashed track when `defined`). */
export interface LaneProps { defined?: boolean; horizontal?: boolean; children: ReactNode }
export function Lane({ defined = false, horizontal = true, children }: LaneProps) {
  return (
    <div className={cx("lane-shell", "lane--linear", !horizontal && "lane--stacked")} data-truth={defined ? "DEFINED" : undefined}>
      <ol className={cx("lane", defined && "lane--defined")} data-lane="trunk">{children}</ol>
    </div>
  );
}

/** A stage on the lane: index, stage key, name, command, truth chip and outcome mark. */
export interface LaneStageProps { num: number; id: string; name: ReactNode; cmd?: string; outcome?: Outcome; truth?: TruthState; reached?: boolean }
export function LaneStage({ num, id, name, cmd, outcome, truth, reached = false }: LaneStageProps) {
  const order = Math.max(0, num - 1);
  return (
    <li className={cx("lane-stage", reached && "is-reached")} data-stage={id} data-outcome={outcome} data-truth={truth} style={vars({ "--i": order })}>
      <span className="lane-track" aria-hidden="true"><i className="lane-fill" /><i className="lane-token" /></span>
      <button type="button" className="lane-node" aria-expanded="false" style={vars({ "--i": order })}>
        <span className="lane-num">{pad(num)}</span>
        <code className="lane-key">{id}</code>
        <b className="lane-name">{name}</b>
        {cmd === undefined ? null : <code className="lane-cmd">{cmd}</code>}
        <span className="lane-flags">
          {truth === undefined ? null : <TruthChip state={truth} />}
          {outcome === undefined || outcome === "DEFINED" ? null : <span className="lane-outcome">{outcome}</span>}
          <i className="lane-mark" aria-hidden="true">{reached && outcome ? OUTCOME_GLYPH[outcome] ?? "" : ""}</i>
        </span>
      </button>
    </li>
  );
}

/** Infrastructure rail row: ordinal, resource, outcome, evidence join and truth chip. */
export interface RailRowProps { num: number; resource: ReactNode; evidence?: ReactNode; outcome: "PASS" | "BLOCK"; truth?: "RECORDED" | "LIVE"; done?: boolean }
export function RailRow({ num, resource, evidence, outcome, truth, done = false }: RailRowProps) {
  return (
    <figure className="rail">
      <ol className="rail-rows">
        <li className={cx("rail-row", done ? "is-done" : "is-pending")} style={vars({ "--i": Math.max(0, num - 1), height: "var(--rail-row)" })}>
          <button className="rail-button" type="button" aria-expanded="false">
            <span className="rail-num">{pad(num)}</span>
            <b className="rail-name">{resource}</b>
            <span className="rail-outcome" data-outcome={outcome}>{outcome}</span>
            {evidence === undefined ? null : <small className="rail-evidence">{evidence}</small>}
            {truth === undefined ? null : <TruthChip state={truth} />}
          </button>
        </li>
      </ol>
    </figure>
  );
}

/** Release gate row: pass/block mark, budget vs measured values, and the meter under them. */
export interface GateRowProps { id: string; name: ReactNode; detail?: ReactNode; measured: number; budget: number; passed: boolean; frac?: number }
export function GateRow({ id, name, detail, measured, budget, passed, frac }: GateRowProps) {
  const scale = Math.max(budget * 2, measured * 2) || 1;
  const measuredFrac = frac ?? measured / scale;
  return (
    <div className="gate-list">
      <article className={cx("gate-row", passed ? "gate-pass" : "gate-block")} data-gate={id} style={vars({ "--i": 0 })}>
        <span className="gate-mark" aria-hidden="true">{passed ? "✓" : "×"}</span>
        <div className="gate-head"><b>{id} · {name}</b>{detail === undefined ? null : <small>{detail}</small>}</div>
        <strong>{passed ? "PASS" : "BLOCK"}</strong>
        <div className="gate-values"><span>{measured}</span><small data-budget="">≤ {budget}</small></div>
        <div
          className="gate-meter"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={scale}
          aria-valuenow={measured}
          aria-valuetext={`${measured} ≤ ${budget}`}
          aria-label={id}
          style={vars({ "--measured": measuredFrac.toFixed(3), "--budget-frac": (budget / scale).toFixed(3) })}
        >
          <i className="gate-budget" /><i className="gate-measure" />
        </div>
      </article>
    </div>
  );
}

/** Release decision card — PROMOTE or BLOCK, with the SIMULATED chip for hypothetical scenarios. */
export interface VerdictCardProps { verdict: "PROMOTE" | "BLOCK"; note?: ReactNode; simulated?: boolean }
export function VerdictCard({ verdict, note, simulated = false }: VerdictCardProps) {
  return (
    <div className={cx("verdict-card", verdict === "PROMOTE" ? "verdict-pass" : "verdict-block")}>
      {simulated ? <span className="truth-simulated" data-i18n-aria="truthSimulatedChip">SIMULATED</span> : null}
      <strong>{verdict}</strong>
      {note === undefined ? null : <p>{note}</p>}
    </div>
  );
}

/** Collapsible plain-words aside marked by the blue explain rule. */
export interface ExplainCardProps { summary?: ReactNode; children: ReactNode; open?: boolean }
export function ExplainCard({ summary = "In plain words", children, open = false }: ExplainCardProps) {
  return (
    <details className="explain-card" open={open}>
      <summary>{summary}</summary>
      <p>{children}</p>
    </details>
  );
}

/** Dotted-underline glossary trigger (visual only — no popover behaviour in the adapter). */
export interface GlossTermProps { children: ReactNode }
export function GlossTerm({ children }: GlossTermProps) {
  return <button type="button" className="gloss">{children}</button>;
}

/** Production-posture card: kicker, claim, body, and the source path that proves it. */
export interface OpsCardProps { kicker: ReactNode; title: ReactNode; children: ReactNode; source?: string }
export function OpsCard({ kicker, title, children, source }: OpsCardProps) {
  return (
    <div className="ops-grid">
      <article className="in-view" style={vars({ "--i": 0 })}>
        <span>{kicker}</span>
        <strong>{title}</strong>
        <p>{children}</p>
        {source === undefined ? null : (
          <details className="ops-source"><summary>Source</summary><code>{source}</code></details>
        )}
      </article>
    </div>
  );
}
