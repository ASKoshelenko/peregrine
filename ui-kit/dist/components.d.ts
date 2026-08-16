import type { ReactNode } from "react";
/** Truth states the platform is allowed to claim about a number or a surface. */
export type TruthState = "LIVE" | "RECORDED" | "DEFINED" | "SIMULATED";
/** Outcome vocabulary shared by lane stages, rail rows and gates. */
export type Outcome = "PASS" | "BLOCK" | "DEFINED";
/** Console line kinds; each one owns a glyph and a colour in the design system. */
export type ConsoleKind = "cmd" | "ok" | "fail" | "note" | "promote" | "live";
/** Primary or secondary action button — the site's `.button` pair. */
export interface ButtonProps {
    variant?: "primary" | "secondary";
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
}
export declare function Button({ variant, children, onClick, disabled }: ButtonProps): import("react").JSX.Element;
/** Provenance chip: what kind of truth a value carries (`quiet` = the tier already declared by its container). */
export interface TruthChipProps {
    state: TruthState;
    quiet?: boolean;
    inline?: boolean;
}
export declare function TruthChip({ state, quiet, inline }: TruthChipProps): import("react").JSX.Element;
/** Heartbeat dot that marks a value polled from the running service. */
export declare function LiveDot(): import("react").JSX.Element;
/** Hero measurement tile: label, oversized monospace value, sourcing note. */
export interface MetricProps {
    label: ReactNode;
    value: ReactNode;
    note?: ReactNode;
}
export declare function Metric({ label, value, note }: MetricProps): import("react").JSX.Element;
/** Section opener: numbered eyebrow, display headline, optional lead paragraph. */
export interface ChapterHeadProps {
    eyebrow: ReactNode;
    title: ReactNode;
    lead?: ReactNode;
}
export declare function ChapterHead({ eyebrow, title, lead }: ChapterHeadProps): import("react").JSX.Element;
/** Uppercase signal-green label that titles a panel or aside. */
export interface PanelLabelProps {
    children: ReactNode;
}
export declare function PanelLabel({ children }: PanelLabelProps): import("react").JSX.Element;
/** Terminal shell: traffic-light bar, prompt title, optional RECORDED chip, scrolling body. */
export interface ConsoleFrameProps {
    title?: string;
    recorded?: boolean;
    children: ReactNode;
}
export declare function ConsoleFrame({ title, recorded, children }: ConsoleFrameProps): import("react").JSX.Element;
/** One console row: kind glyph, monospace text, optional provenance chip. */
export interface ConsoleLineProps {
    kind: ConsoleKind;
    children: ReactNode;
    chip?: "LIVE" | "RECORDED";
}
export declare function ConsoleLine({ kind, children, chip }: ConsoleLineProps): import("react").JSX.Element;
/** Pipeline lane shell holding `LaneStage` children (dashed track when `defined`). */
export interface LaneProps {
    defined?: boolean;
    horizontal?: boolean;
    children: ReactNode;
}
export declare function Lane({ defined, horizontal, children }: LaneProps): import("react").JSX.Element;
/** A stage on the lane: index, stage key, name, command, truth chip and outcome mark. */
export interface LaneStageProps {
    num: number;
    id: string;
    name: ReactNode;
    cmd?: string;
    outcome?: Outcome;
    truth?: TruthState;
    reached?: boolean;
}
export declare function LaneStage({ num, id, name, cmd, outcome, truth, reached }: LaneStageProps): import("react").JSX.Element;
/** Infrastructure rail row: ordinal, resource, outcome, evidence join and truth chip. */
export interface RailRowProps {
    num: number;
    resource: ReactNode;
    evidence?: ReactNode;
    outcome: "PASS" | "BLOCK";
    truth?: "RECORDED" | "LIVE";
    done?: boolean;
}
export declare function RailRow({ num, resource, evidence, outcome, truth, done }: RailRowProps): import("react").JSX.Element;
/** Release gate row: pass/block mark, budget vs measured values, and the meter under them. */
export interface GateRowProps {
    id: string;
    name: ReactNode;
    detail?: ReactNode;
    measured: number;
    budget: number;
    passed: boolean;
    frac?: number;
}
export declare function GateRow({ id, name, detail, measured, budget, passed, frac }: GateRowProps): import("react").JSX.Element;
/** Release decision card — PROMOTE or BLOCK, with the SIMULATED chip for hypothetical scenarios. */
export interface VerdictCardProps {
    verdict: "PROMOTE" | "BLOCK";
    note?: ReactNode;
    simulated?: boolean;
}
export declare function VerdictCard({ verdict, note, simulated }: VerdictCardProps): import("react").JSX.Element;
/** Collapsible plain-words aside marked by the blue explain rule. */
export interface ExplainCardProps {
    summary?: ReactNode;
    children: ReactNode;
    open?: boolean;
}
export declare function ExplainCard({ summary, children, open }: ExplainCardProps): import("react").JSX.Element;
/** Dotted-underline glossary trigger (visual only — no popover behaviour in the adapter). */
export interface GlossTermProps {
    children: ReactNode;
}
export declare function GlossTerm({ children }: GlossTermProps): import("react").JSX.Element;
/** Production-posture card: kicker, claim, body, and the source path that proves it. */
export interface OpsCardProps {
    kicker: ReactNode;
    title: ReactNode;
    children: ReactNode;
    source?: string;
}
export declare function OpsCard({ kicker, title, children, source }: OpsCardProps): import("react").JSX.Element;
