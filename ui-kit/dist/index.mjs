// src/components.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var TRUTH_CLASS = { LIVE: "truth-live", RECORDED: "truth-recorded", DEFINED: "truth-defined", SIMULATED: "truth-simulated" };
var TRUTH_DETAIL = { LIVE: "truthLiveChip", RECORDED: "truthRecordedChip", DEFINED: "truthDefinedChip", SIMULATED: "truthSimulatedChip" };
var CONSOLE_GLYPH = { cmd: "$", note: "\xB7", ok: "\u2713", fail: "\xD7", promote: "\u2713", live: "\u25C6" };
var OUTCOME_GLYPH = { PASS: "\u2713", BLOCK: "\xD7" };
var cx = (...parts) => parts.filter(Boolean).join(" ");
var pad = (n) => String(n).padStart(2, "0");
var vars = (values) => values;
function Button({ variant = "primary", children, onClick, disabled = false }) {
  return /* @__PURE__ */ jsx("button", { type: "button", className: cx("button", `button-${variant}`), onClick, disabled, children });
}
function TruthChip({ state, quiet = false, inline = false }) {
  return /* @__PURE__ */ jsx("span", { className: cx(TRUTH_CLASS[state], inline && "truth-inline", quiet && "is-quiet"), "data-i18n-aria": TRUTH_DETAIL[state], children: state });
}
function LiveDot() {
  return /* @__PURE__ */ jsx("span", { className: "live-dot", "aria-hidden": "true" });
}
function Metric({ label, value, note }) {
  return /* @__PURE__ */ jsx("div", { className: "metrics", children: /* @__PURE__ */ jsxs("article", { className: "metric", style: vars({ "--i": 0 }), children: [
    /* @__PURE__ */ jsx("span", { children: label }),
    /* @__PURE__ */ jsx("strong", { children: value }),
    note === void 0 ? null : /* @__PURE__ */ jsx("small", { children: note })
  ] }) });
}
function ChapterHead({ eyebrow, title, lead }) {
  return /* @__PURE__ */ jsxs("header", { className: "chapter-head", children: [
    /* @__PURE__ */ jsx("p", { className: "eyebrow", children: eyebrow }),
    /* @__PURE__ */ jsx("h2", { children: title }),
    lead === void 0 ? null : /* @__PURE__ */ jsx("p", { children: lead })
  ] });
}
function PanelLabel({ children }) {
  return /* @__PURE__ */ jsx("div", { className: "panel-label", children });
}
function ConsoleFrame({ title = "release@peregrine", recorded = false, children }) {
  return /* @__PURE__ */ jsxs("section", { className: "run-console", children: [
    /* @__PURE__ */ jsxs("div", { className: "console-bar", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("i", {}),
        /* @__PURE__ */ jsx("i", {}),
        /* @__PURE__ */ jsx("i", {})
      ] }),
      /* @__PURE__ */ jsxs("span", { children: [
        title,
        /* @__PURE__ */ jsx("span", { className: "console-path", children: ": ~/qualification" })
      ] }),
      recorded ? /* @__PURE__ */ jsx("b", { className: "truth-recorded", "data-i18n-aria": "truthRecordedChip", children: "RECORDED" }) : null
    ] }),
    /* @__PURE__ */ jsx("div", { className: "console-body", role: "log", children })
  ] });
}
function ConsoleLine({ kind, children, chip }) {
  return /* @__PURE__ */ jsxs("div", { className: cx("console-line", `console-${kind}`), children: [
    /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: CONSOLE_GLYPH[kind] }),
    /* @__PURE__ */ jsxs("code", { children: [
      /* @__PURE__ */ jsx("span", { className: "console-text", children }),
      chip === void 0 ? null : /* @__PURE__ */ jsx(TruthChip, { state: chip, inline: true, quiet: chip === "RECORDED" })
    ] })
  ] });
}
function Lane({ defined = false, horizontal = true, children }) {
  return /* @__PURE__ */ jsx("div", { className: cx("lane-shell", "lane--linear", !horizontal && "lane--stacked"), "data-truth": defined ? "DEFINED" : void 0, children: /* @__PURE__ */ jsx("ol", { className: cx("lane", defined && "lane--defined"), "data-lane": "trunk", children }) });
}
function LaneStage({ num, id, name, cmd, outcome, truth, reached = false }) {
  const order = Math.max(0, num - 1);
  return /* @__PURE__ */ jsxs("li", { className: cx("lane-stage", reached && "is-reached"), "data-stage": id, "data-outcome": outcome, "data-truth": truth, style: vars({ "--i": order }), children: [
    /* @__PURE__ */ jsxs("span", { className: "lane-track", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("i", { className: "lane-fill" }),
      /* @__PURE__ */ jsx("i", { className: "lane-token" })
    ] }),
    /* @__PURE__ */ jsxs("button", { type: "button", className: "lane-node", "aria-expanded": "false", style: vars({ "--i": order }), children: [
      /* @__PURE__ */ jsx("span", { className: "lane-num", children: pad(num) }),
      /* @__PURE__ */ jsx("code", { className: "lane-key", children: id }),
      /* @__PURE__ */ jsx("b", { className: "lane-name", children: name }),
      cmd === void 0 ? null : /* @__PURE__ */ jsx("code", { className: "lane-cmd", children: cmd }),
      /* @__PURE__ */ jsxs("span", { className: "lane-flags", children: [
        truth === void 0 ? null : /* @__PURE__ */ jsx(TruthChip, { state: truth }),
        outcome === void 0 || outcome === "DEFINED" ? null : /* @__PURE__ */ jsx("span", { className: "lane-outcome", children: outcome }),
        /* @__PURE__ */ jsx("i", { className: "lane-mark", "aria-hidden": "true", children: reached && outcome ? OUTCOME_GLYPH[outcome] ?? "" : "" })
      ] })
    ] })
  ] });
}
function RailRow({ num, resource, evidence, outcome, truth, done = false }) {
  return /* @__PURE__ */ jsx("figure", { className: "rail", children: /* @__PURE__ */ jsx("ol", { className: "rail-rows", children: /* @__PURE__ */ jsx("li", { className: cx("rail-row", done ? "is-done" : "is-pending"), style: vars({ "--i": Math.max(0, num - 1), height: "var(--rail-row)" }), children: /* @__PURE__ */ jsxs("button", { className: "rail-button", type: "button", "aria-expanded": "false", children: [
    /* @__PURE__ */ jsx("span", { className: "rail-num", children: pad(num) }),
    /* @__PURE__ */ jsx("b", { className: "rail-name", children: resource }),
    /* @__PURE__ */ jsx("span", { className: "rail-outcome", "data-outcome": outcome, children: outcome }),
    evidence === void 0 ? null : /* @__PURE__ */ jsx("small", { className: "rail-evidence", children: evidence }),
    truth === void 0 ? null : /* @__PURE__ */ jsx(TruthChip, { state: truth })
  ] }) }) }) });
}
function GateRow({ id, name, detail, measured, budget, passed, frac }) {
  const scale = Math.max(budget * 2, measured * 2) || 1;
  const measuredFrac = frac ?? measured / scale;
  return /* @__PURE__ */ jsx("div", { className: "gate-list", children: /* @__PURE__ */ jsxs("article", { className: cx("gate-row", passed ? "gate-pass" : "gate-block"), "data-gate": id, style: vars({ "--i": 0 }), children: [
    /* @__PURE__ */ jsx("span", { className: "gate-mark", "aria-hidden": "true", children: passed ? "\u2713" : "\xD7" }),
    /* @__PURE__ */ jsxs("div", { className: "gate-head", children: [
      /* @__PURE__ */ jsxs("b", { children: [
        id,
        " \xB7 ",
        name
      ] }),
      detail === void 0 ? null : /* @__PURE__ */ jsx("small", { children: detail })
    ] }),
    /* @__PURE__ */ jsx("strong", { children: passed ? "PASS" : "BLOCK" }),
    /* @__PURE__ */ jsxs("div", { className: "gate-values", children: [
      /* @__PURE__ */ jsx("span", { children: measured }),
      /* @__PURE__ */ jsxs("small", { "data-budget": "", children: [
        "\u2264 ",
        budget
      ] })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "gate-meter",
        role: "meter",
        "aria-valuemin": 0,
        "aria-valuemax": scale,
        "aria-valuenow": measured,
        "aria-valuetext": `${measured} \u2264 ${budget}`,
        "aria-label": id,
        style: vars({ "--measured": measuredFrac.toFixed(3), "--budget-frac": (budget / scale).toFixed(3) }),
        children: [
          /* @__PURE__ */ jsx("i", { className: "gate-budget" }),
          /* @__PURE__ */ jsx("i", { className: "gate-measure" })
        ]
      }
    )
  ] }) });
}
function VerdictCard({ verdict, note, simulated = false }) {
  return /* @__PURE__ */ jsxs("div", { className: cx("verdict-card", verdict === "PROMOTE" ? "verdict-pass" : "verdict-block"), children: [
    simulated ? /* @__PURE__ */ jsx("span", { className: "truth-simulated", "data-i18n-aria": "truthSimulatedChip", children: "SIMULATED" }) : null,
    /* @__PURE__ */ jsx("strong", { children: verdict }),
    note === void 0 ? null : /* @__PURE__ */ jsx("p", { children: note })
  ] });
}
function ExplainCard({ summary = "In plain words", children, open = false }) {
  return /* @__PURE__ */ jsxs("details", { className: "explain-card", open, children: [
    /* @__PURE__ */ jsx("summary", { children: summary }),
    /* @__PURE__ */ jsx("p", { children })
  ] });
}
function GlossTerm({ children }) {
  return /* @__PURE__ */ jsx("button", { type: "button", className: "gloss", children });
}
function OpsCard({ kicker, title, children, source }) {
  return /* @__PURE__ */ jsx("div", { className: "ops-grid", children: /* @__PURE__ */ jsxs("article", { className: "in-view", style: vars({ "--i": 0 }), children: [
    /* @__PURE__ */ jsx("span", { children: kicker }),
    /* @__PURE__ */ jsx("strong", { children: title }),
    /* @__PURE__ */ jsx("p", { children }),
    source === void 0 ? null : /* @__PURE__ */ jsxs("details", { className: "ops-source", children: [
      /* @__PURE__ */ jsx("summary", { children: "Source" }),
      /* @__PURE__ */ jsx("code", { children: source })
    ] })
  ] }) });
}
export {
  Button,
  ChapterHead,
  ConsoleFrame,
  ConsoleLine,
  ExplainCard,
  GateRow,
  GlossTerm,
  Lane,
  LaneStage,
  LiveDot,
  Metric,
  OpsCard,
  PanelLabel,
  RailRow,
  TruthChip,
  VerdictCard
};
