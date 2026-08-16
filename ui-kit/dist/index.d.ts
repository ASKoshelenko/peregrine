/**
 * @peregrine/ui — thin React adapter over the Peregrine design system.
 *
 * Every component is a wrapper that emits the class vocabulary of
 * site/styles.css. Nothing here invents styling: import "@peregrine/ui/styles.css"
 * (the verbatim subset of the site stylesheet) and the components look exactly
 * like the running site on a dark ground.
 */
export { Button, ChapterHead, ConsoleFrame, ConsoleLine, ExplainCard, GateRow, GlossTerm, Lane, LaneStage, LiveDot, Metric, OpsCard, PanelLabel, RailRow, TruthChip, VerdictCard, } from "./components";
export type { ButtonProps, ChapterHeadProps, ConsoleFrameProps, ConsoleKind, ConsoleLineProps, ExplainCardProps, GateRowProps, GlossTermProps, LaneProps, LaneStageProps, MetricProps, OpsCardProps, Outcome, PanelLabelProps, RailRowProps, TruthChipProps, TruthState, VerdictCardProps, } from "./components";
