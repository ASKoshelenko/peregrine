import { createTimeline, reduced } from "./motion.js";
import { applyStatic, esc, t } from "./i18n.js";
import { fmtVal, truthChip } from "./pipeline-model.js";

export const CONSOLE_SURFACE = "#console-body";
const CPS = 24;
const STEP_MS = 320;
const ENTER = "line-in 240ms ease-out both";
const BLINK = "caret 1s steps(2) infinite";
const GLYPH = { cmd: "$", note: "·", ok: "✓", fail: "×", promote: "✓", live: "◆" };
const OBSERVE_CMD = "PYTHONPATH=src python -m peregrine.cli observe --write artifacts/observed/latest.json --model-card artifacts/model-cards/peregrine-yolov8n-int8.md";

const byId = (id) => document.getElementById(id);
const surfaceEl = (body) => body || byId("console-body");
const kindOf = (line) => (GLYPH[line?.kind] ? line.kind : "note");
const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const short = (value, size = 8) => (typeof value === "string" && value.length > size ? `${value.slice(0, size)}…` : value || "—");

function lineNode(line, text) {
  const kind = kindOf(line);
  const node = document.createElement("div");
  node.className = `console-line console-${kind}`;
  node.innerHTML = `<span aria-hidden="true">${GLYPH[kind]}</span><code><span class="console-text">${esc(text)}</span>${line.chip ? truthChip(line.chip, { inline: true, quiet: line.chip === "RECORDED" }) : ""}</code>`;
  if (line.chip) applyStatic(node);
  return node;
}

function append(body, node, animate) {
  node.style.animation = animate ? ENTER : "";
  body.appendChild(node);
  body.scrollTop = body.scrollHeight;
}

function caret(body, blink) {
  const host = body.lastElementChild ? body.lastElementChild.querySelector("code") || body : body;
  const mark = body.querySelector(".console-caret") || document.createElement("i");
  mark.className = "console-caret";
  mark.setAttribute("aria-hidden", "true");
  mark.style.animation = blink && !reduced() ? BLINK : "";
  host.appendChild(mark);
}

function dropCaret(body) {
  const mark = body.querySelector(".console-caret");
  if (mark) mark.remove();
}

function ensureProgress(body) {
  const shell = body.closest(".run-console") || body.parentElement;
  if (!shell) return null;
  let node = shell.querySelector(".console-progress");
  if (!node) {
    node = document.createElement("div");
    node.className = "console-progress";
    node.id = "console-progress";
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = "<i></i>";
    const bar = shell.querySelector(".console-bar");
    if (bar) bar.insertAdjacentElement("afterend", node); else shell.prepend(node);
  }
  return node;
}

const fillOf = (node) => (node ? node.querySelector(":scope > i") || node : null);

function setProgress(node, value, ms) {
  const fill = fillOf(node);
  if (!fill) return;
  fill.style.transformOrigin = "left";
  fill.style.transition = ms > 0 ? `transform ${Math.round(ms)}ms linear` : "none";
  fill.style.transform = `scaleX(${clamp01(value)})`;
  if (!(ms > 0)) void fill.offsetWidth;
}

function mount(options) {
  const body = surfaceEl(options.body);
  if (!body) return null;
  const progress = options.progressEl === undefined ? ensureProgress(body) : options.progressEl;
  const status = options.statusEl === undefined ? byId("replay-state") : options.statusEl;
  const live = body.getAttribute("aria-live");
  return { body, progress, status, restore: live && live !== "off" ? live : "polite" };
}

let active = null;

function silence(shell) {
  if (active) active.settle();
  shell.body.setAttribute("aria-live", "off");
  if (shell.status) shell.status.setAttribute("aria-live", "polite");
}

document.addEventListener("visibilitychange", () => { if (active) active.visibility(); });

export function claim(scope = "console", options = {}) {
  const shell = mount(options);
  if (!shell) return null;
  const timeline = createTimeline({ surface: CONSOLE_SURFACE, scope });
  silence(shell);
  const handle = {
    body: shell.body, progress: shell.progress, status: shell.status, timeline,
    clear() { shell.body.replaceChildren(); setProgress(shell.progress, 0, 0); return handle; },
    write(line) { if (line && typeof line.text === "string") { append(shell.body, lineNode(line, line.text), false); caret(shell.body, false); } return handle; },
    writeAll(lines) { handle.clear(); for (const line of lines || []) handle.write(line); return handle; },
    at(fraction) { setProgress(shell.progress, fraction, 0); return handle; },
    say(text) { if (shell.status && typeof text === "string") shell.status.textContent = text; return handle; },
    release() { dropCaret(shell.body); shell.body.setAttribute("aria-live", shell.restore); timeline.cancel(); return handle; },
  };
  return handle;
}

export function prime(options = {}) {
  const body = surfaceEl(options.body);
  if (!body || body.childElementCount) return null;
  ensureProgress(body);
  append(body, lineNode({ kind: "cmd" }, options.text || ""), false);
  caret(body, false);
  return body;
}

export function run(lines, options = {}) {
  const shell = mount(options);
  if (!shell) return null;
  const list = (lines || []).filter((line) => line && typeof line.text === "string");
  const step = Number.isFinite(options.pace) ? options.pace : STEP_MS;
  const cues = [];
  let at = 0, prompt = null;
  for (const line of list) {
    const wait = Number.isFinite(line.pace) ? line.pace : step;
    const typed = kindOf(line) === "cmd";
    const node = lineNode(line, typed ? "" : line.text);
    if (!cues.length && typed) prompt = node;
    cues.push({ at, fire: ({ immediate }) => { append(shell.body, node, !typed && !immediate && !reduced()); caret(shell.body, true); } });
    if (typed) {
      const chars = [...line.text];
      const slot = node.querySelector(".console-text");
      for (let i = 1; i <= chars.length; i++) {
        const text = chars.slice(0, i).join("");
        cues.push({ at: at + Math.round((i * 1000) / CPS), fire: () => { slot.textContent = text; caret(shell.body, true); shell.body.scrollTop = shell.body.scrollHeight; } });
      }
      at += Math.round((chars.length * 1000) / CPS);
    }
    at += wait;
  }
  const total = cues.length ? cues[cues.length - 1].at : 0;
  let settled = false, held = 0, since = 0;
  const freeze = () => { held = since && total ? clamp01(held + (performance.now() - since) / total) : held; since = 0; setProgress(shell.progress, held, 0); };
  const resume = () => { since = performance.now(); setProgress(shell.progress, held, 0); setProgress(shell.progress, 1, total * (1 - held)); };
  const settle = () => {
    if (settled) return;
    settled = true;
    if (active === record) active = null;
    dropCaret(shell.body);
    shell.body.setAttribute("aria-live", shell.restore);
  };
  const record = { settle, visibility: () => { if (document.hidden) freeze(); else if (timeline.running) resume(); } };
  const timeline = createTimeline({
    surface: CONSOLE_SURFACE,
    scope: options.scope || "console",
    cues,
    onDone: () => {
      settle();
      held = 1; since = 0;
      setProgress(shell.progress, 1, 0);
      if (shell.status) shell.status.textContent = typeof options.summary === "string" ? options.summary : t("replayBoundary");
      if (typeof options.onDone === "function") options.onDone(controller);
    },
  });
  silence(shell);
  active = record;
  shell.body.replaceChildren();
  if (prompt) { append(shell.body, prompt, false); caret(shell.body, false); }
  setProgress(shell.progress, 0, 0);
  if (shell.status && options.running !== null) shell.status.textContent = typeof options.running === "string" ? options.running : t("replayRunning");
  const controller = {
    body: shell.body, timeline, total,
    play() {
      if (timeline.running) return controller;
      if (reduced() || !total) { held = 1; since = 0; setProgress(shell.progress, 1, 0); } else resume();
      timeline.play();
      return controller;
    },
    pause() { timeline.pause(); freeze(); return controller; },
    seek(index, seekOptions) { timeline.seek(index, seekOptions); return controller; },
    cancel() { settle(); timeline.cancel(); return controller; },
    get running() { return timeline.running; },
    get done() { return timeline.done; },
  };
  if (options.autoplay !== false) controller.play();
  return controller;
}

export function buildRecordedLines(evidence, platformState, translate = t) {
  if (!evidence) return [{ kind: "note", text: translate("evidenceUnavailable") }];
  const target = evidence.targets?.x86_tflite_int8;
  const lineage = evidence.lineage || {};
  const verdict = evidence.release_verdict || {};
  const runId = evidence.run_id || "—";
  const lines = [
    { kind: "cmd", text: "make observe" },
    { kind: "note", text: `dvc.yaml → stages.observe.cmd · ${OBSERVE_CMD}` },
    { kind: "ok", text: `[data] run ${runId} · fingerprint ${short(lineage.dataset_fingerprint)}` },
    { kind: "ok", text: `[train] run ${runId} · W&B ${lineage.wandb_run || "—"}` },
    { kind: "ok", text: `[convert] ONNX + INT8 · calibration ${short(lineage.calibration_hash)}` },
    { kind: "ok", text: `[measure] x86_tflite_int8 · p95 ${fmtVal("ms", target?.p95_ms)} ms · ${fmtVal("mb", target?.size_mb)} MB` },
  ];
  for (const gate of verdict.gates || []) {
    const numeric = typeof gate.budget === "number" && Number.isFinite(gate.budget);
    const detail = numeric ? `${gate.measured} ≤ ${gate.budget}` : translate("lineagePinned");
    lines.push({ kind: gate.status === "pass" ? "ok" : "fail", text: `[${gate.gate_id}] ${String(gate.status || "").toUpperCase()} · ${detail}` });
  }
  const decision = verdict.passed ? "PROMOTE" : "BLOCK";
  lines.push({ kind: verdict.passed ? "promote" : "fail", text: `[release] ${decision} · evidence ${short(evidence.fingerprint)}` });
  lines.push(platformState
    ? { kind: "live", chip: "LIVE", text: `[serve] ${platformState.service}/${platformState.revision}` }
    : { kind: "note", text: `[serve] ${translate("liveOffline")}` });
  return lines;
}
