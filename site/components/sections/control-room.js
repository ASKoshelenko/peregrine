import { renderRail } from "../rail.js";
import { renderLane } from "../lane.js";
import { buildRecordedLines, claim, prime, run as runConsole } from "../console.js";
import { applyStatic, esc, lang, t } from "../i18n.js";
import { fmtVal, truthChip } from "../pipeline-model.js";

const byId = (id) => document.getElementById(id);
const WIDE = matchMedia("(min-width: 900px)");
const STEP = { ArrowRight: 1, ArrowLeft: -1 };
const BUDGET_GATE = { x86_tflite_int8: { p95: "Q2", size: "Q4" }, arm64_tflite_int8: { p95: "Q3" } };
const MATRIX_SOURCE = "configs/targets/matrix.yaml#L5-L9";
const DIGEST_SOURCE = "infra/gcp/terraform/variables.tf#L23-L26";
const DIGEST_RULE = "@sha256:[0-9a-f]{64}$";
const ROWS = [
  { id: "ci", pipeline: "ci", name: "autoCi", note: "autoCiNote", action: "walkCi", badge: "ciBadge" },
  { id: "train", pipeline: "train", name: "autoTrain", note: "autoTrainNote", action: "playLane", lanes: ["vertex-t4", "vertex-cpu-smoke", "colab-recorded"], fallback: "vertex-cpu-smoke" },
  { id: "release", pipeline: "release", name: "autoMatrix", note: "autoMatrixNote", action: "playLane", mode: "fanout", badge: "matrixBadge", cards: true },
  { id: "deploy", pipeline: "deploy", name: "autoDeploy", note: "autoDeployNote", action: "playLane", image: true },
];

const STRUCTURAL = ["pipelines", "evidence", "platformEvents", "language"];
const say = (value, language) => (value ? String(value[language] ?? value.en ?? "") : "");
const truthsOf = (pipeline) => (pipeline ? [...new Set([pipeline.truth, ...pipeline.stages.map((stage) => stage.truth).filter(Boolean)])] : ["DEFINED"]);
const chipsOf = (pipeline) => truthsOf(pipeline).map((truth) => truthChip(truth)).join("");
const cite = (path, field) => `<p class="cite-line"><code>${esc(t("sourceLine", { path, field }))}</code></p>`;
const structural = (changed) => changed.some((key) => STRUCTURAL.includes(key));

export function mountControlRoom({ store, registry }) {
  const pipelineOf = (id) => (store.get().pipelines?.pipelines || []).find((entry) => entry.id === id) || null;
  const writer = claim("control");
  const body = writer ? writer.body : byId("console-body");
  const liveState = (mode) => { if (body) body.setAttribute("aria-live", mode); };
  liveState("polite");
  prime({ text: "make observe" });
  mountAutomation(store, registry, pipelineOf);
  const workbench = mountWorkbench(store, registry, pipelineOf, writer, liveState);
  mountReplay(store, workbench);
}

function mountReplay(store, workbench) {
  const plain = byId("replay-plain");
  let done = null;
  function paintPlain() {
    if (!plain) return;
    plain.hidden = !done;
    plain.textContent = done ? t(done.verdict === "PROMOTE" ? "plain.replayPromote" : "plain.replayBlock", { gates: done.gates }) : "";
  }
  byId("replay-run").addEventListener("click", () => {
    if (workbench) workbench.pause();
    const state = store.get();
    const gates = state.evidence?.release_verdict?.gates?.length || 0;
    const verdict = state.evidence?.release_verdict?.passed ? "PROMOTE" : "BLOCK";
    done = null;
    paintPlain();
    runConsole(buildRecordedLines(state.evidence, state.platform, t), {
      scope: "control",
      summary: gates ? t("replaySummary", { gates, verdict }) : t("replayBoundary"),
      onDone: () => { done = gates ? { gates, verdict } : null; paintPlain(); },
    });
  });
  store.subscribe(["language"], paintPlain);
  paintPlain();
}

function mountAutomation(store, registry, pipelineOf) {
  const list = byId("automation-list");
  const stage = byId("automation-stage");
  const lanes = new Map();
  let trainLane = "vertex-cpu-smoke";

  const mountOf = (row) => (WIDE.matches ? stage : byId(`automation-panel-${row.id}`));

  function rowsHtml() {
    return ROWS.map((row) => {
      const pipeline = pipelineOf(row.pipeline);
      return `<article class="automation-row" data-auto="${esc(row.id)}">`
        + `<button class="automation-head" type="button" aria-expanded="false" aria-controls="automation-panel-${esc(row.id)}">`
        + `<span class="automation-flags"><b>${esc(t(row.name))}</b>${chipsOf(pipeline)}</span>`
        + `<code>${esc(pipeline ? pipeline.trigger : "—")}</code><span class="automation-note">${esc(t(row.note))}</span>`
        + `<small><code>${esc(pipeline ? pipeline.source : "—")}</code></small>`
        + `<i class="automation-caret" aria-hidden="true">▸</i></button>`
        + `<div class="automation-panel" id="automation-panel-${esc(row.id)}" hidden></div></article>`;
    }).join("");
  }

  function panelHtml(row, pipeline) {
    const language = lang();
    const meta = (pipeline.meta || []).map((entry) => `<li><span>${esc(say(entry.label, language))}</span><b>${esc(entry.value)}</b><code>${esc(entry.source)}</code></li>`).join("");
    const selector = row.lanes
      ? `<div class="lane-selector" role="group" aria-label="${esc(t(row.name))}">${row.lanes.map((id) => `<button type="button" data-train-lane="${esc(id)}" aria-pressed="${String(id === trainLane)}"><code>${esc(id)}</code>${id === row.fallback ? `<small>${esc(t("laneDefault"))}</small>` : ""}</button>`).join("")}</div>`
      : "";
    return `<div class="automation-detail">`
      + `<p class="automation-title"><b>${esc(say(pipeline.name, language))}</b>${truthChip(pipeline.truth)}<code>${esc(pipeline.trigger)}</code></p>`
      + cite(pipeline.source, pipeline.id)
      + (meta ? `<ul class="meta-chips">${meta}</ul>` : "")
      + selector
      + `<div class="automation-lane" id="automation-lane-${esc(row.id)}"></div>`
      + `<div class="automation-actions"><button class="button button-secondary" type="button" data-play="${esc(row.id)}">${esc(t(row.action))}</button><p class="status-line" role="status" id="automation-status-${esc(row.id)}"></p></div>`
      + (row.badge ? `<p class="lane-badge" id="automation-badge-${esc(row.id)}"></p>` : "")
      + (row.cards ? `<div class="measure-cards" id="measure-cards"></div>` : "")
      + (row.image ? `<div class="image-strip" id="image-strip"></div><p class="deploy-live" id="deploy-live"></p>` : "")
      + `</div>`;
  }

  function meterHtml(value, max, label) {
    if (max === null || value === undefined) return "";
    return `<p class="measure-meter" role="meter" aria-valuemin="0" aria-valuemax="${esc(max)}" aria-valuenow="${esc(value)}" aria-label="${esc(label)}" style="--frac:${Math.min(1, value / max).toFixed(3)}"><i></i><small>${esc(t("labelBudget"))} ${esc(max)}</small></p>`;
  }

  function measureCards() {
    const host = byId("measure-cards");
    const release = pipelineOf("release");
    if (!host || !release) return;
    const state = store.get();
    const gates = state.evidence?.release_verdict?.gates || [];
    const budget = (target, kind) => gates.find((gate) => gate.gate_id === BUDGET_GATE[target]?.[kind])?.budget ?? null;
    const language = lang();
    host.innerHTML = release.stages.filter((entry) => entry.lane).map((entry) => {
      const id = entry.lane;
      const measured = state.evidence?.targets?.[id];
      if (!measured) return `<article class="measure-card is-empty"><code>${esc(id)}</code><b>${esc(t("noRetainedMeasurement"))}</b></article>`;
      return `<article class="measure-card"><code>${esc(id)}</code>${truthChip("RECORDED")}`
        + `<p class="measure-row"><span>mAP@0.50</span><b>${esc(fmtVal("map4", measured.map50_proxy))}</b></p>`
        + `<p class="measure-row"><span>p50 / p95</span><b>${esc(fmtVal("ms", measured.p50_ms))} / ${esc(fmtVal("ms", measured.p95_ms))} ms</b></p>`
        + `<p class="measure-row"><span>${esc(t("thSize"))}</span><b>${esc(fmtVal("mb", measured.size_mb))} MB</b></p>`
        + `<p class="measure-row"><span>runtime</span><b>${esc(measured.host?.runtime_name || "—")} ${esc(measured.host?.runtime_version || "")}</b></p>`
        + meterHtml(measured.p95_ms, budget(id, "p95"), `${id} p95`)
        + meterHtml(measured.size_mb, budget(id, "size"), `${id} size`)
        + `<p class="measure-protocol"><code>${esc(say(entry.control, language))}</code></p>`
        + (id === "arm64_tflite_int8" ? `<p class="measure-note">${esc(t("trendLaneNote"))}</p>` : "")
        + `<a href="#gate-lab">${esc(t("openGateLab"))}</a></article>`;
    }).join("") + cite(MATRIX_SOURCE, "budgets");
    applyStatic(host);
  }

  function deployStamp() {
    const host = byId("deploy-live");
    if (!host) return;
    const live = store.get().platform;
    host.innerHTML = live
      ? `${truthChip("LIVE")}<span>${esc(t("liveRevision"))}</span><code>${esc(live.revision)}</code><small data-checked-since></small>`
      : `<span>${esc(t("liveUnavailable"))}</span>`;
    applyStatic(host);
  }

  function renderPanel(row, { focusLane = false } = {}) {
    const pipeline = pipelineOf(row.pipeline);
    const host = mountOf(row);
    if (!pipeline || !host) return;
    const other = host === stage ? byId(`automation-panel-${row.id}`) : stage;
    if (other) { other.innerHTML = ""; other.hidden = true; }
    host.innerHTML = panelHtml(row, pipeline);
    host.hidden = false;
    applyStatic(host);
    const status = byId(`automation-status-${row.id}`);
    const previous = lanes.get(row.id);
    if (previous) previous.destroy();
    lanes.set(row.id, renderLane(byId(`automation-lane-${row.id}`), pipeline, {
      mode: row.mode || "linear",
      lang: lang(),
      registry: registry(),
      lanes: row.lanes ? [trainLane] : null,
      reach: false,
      scope: "control",
      surface: `#automation-lane-${row.id}`,
      onStatus: (text) => { if (status) status.textContent = text; },
    }));
    const badge = byId(`automation-badge-${row.id}`);
    if (badge) badge.textContent = t(row.badge, { run: store.get().evidence?.run_id || "—" });
    if (row.cards) measureCards();
    if (row.image) {
      const strip = lanes.get("image");
      if (strip) strip.destroy();
      lanes.set("image", renderLane(byId("image-strip"), pipelineOf("image"), { mode: "linear", lang: lang(), registry: registry(), reach: false, scope: "control", surface: "#image-strip", declared: pipeline.truth }));
      deployStamp();
    }
    const head = list.querySelector(`[data-auto="${row.id}"] .automation-head`);
    if (head) { head.setAttribute("aria-expanded", "true"); head.setAttribute("aria-controls", host.id); }
    if (focusLane) host.querySelector(`[data-train-lane="${trainLane}"]`)?.focus();
  }

  function paint() {
    const selected = store.get().automationLane;
    for (const article of list.querySelectorAll(".automation-row")) {
      const on = article.dataset.auto === selected;
      const head = article.querySelector(".automation-head");
      const panel = byId(`automation-panel-${article.dataset.auto}`);
      article.classList.toggle("is-selected", on);
      head.setAttribute("aria-expanded", String(on));
      if (!on && panel) { panel.hidden = true; panel.innerHTML = ""; head.setAttribute("aria-controls", panel.id); }
    }
    if (!selected) { stage.innerHTML = ""; stage.hidden = true; return; }
    const row = ROWS.find((entry) => entry.id === selected);
    if (row) renderPanel(row);
  }

  function build() {
    list.innerHTML = rowsHtml();
    applyStatic(list);
    paint();
  }

  const onPanelClick = (event) => {
    const laneButton = event.target.closest("[data-train-lane]");
    if (laneButton) { trainLane = laneButton.dataset.trainLane; renderPanel(ROWS.find((row) => row.id === "train"), { focusLane: true }); return; }
    const play = event.target.closest("[data-play]");
    if (play) { const handle = lanes.get(play.dataset.play); if (handle) handle.run(); }
  };

  list.addEventListener("click", (event) => {
    const head = event.target.closest(".automation-head");
    if (!head) { onPanelClick(event); return; }
    const id = head.closest("[data-auto]").dataset.auto;
    store.patch({ automationLane: store.get().automationLane === id ? null : id });
  });
  stage.addEventListener("click", onPanelClick);
  WIDE.addEventListener("change", paint);
  store.subscribe(["automationLane"], paint);
  store.subscribe(["pipelines", "evidence", "platformRevision", "language"], (state, changed) => { if (structural(changed)) build(); else deployStamp(); });
  build();
}

function mountWorkbench(store, registry, pipelineOf, writer, liveState) {
  const tabs = [...document.querySelectorAll("[data-infra-view]")];
  const panels = { build: byId("infra-panel-build"), terraform: byId("infra-panel-terraform"), runtime: byId("infra-panel-runtime") };
  const caption = byId("infra-caption");
  const play = byId("build-platform");
  const revision = byId("infra-revision");
  const revisionValue = byId("infra-revision-value");
  const stamp = byId("tf-stamp");
  const laneHandles = new Map();
  let rail = null;
  let railPlaying = false;
  let blocks = 0;
  let tfMode = "deploy";
  let shown = "";
  let buildCaption = "";

  const view = () => store.get().infraTab || "build";

  function railCue(payload) {
    if (!writer) return;
    liveState("off");
    if (payload.type === "reset") { writer.clear(); writer.at(0); return; }
    writer.write(payload.line);
    writer.at(payload.completed / payload.total);
    if (payload.completed >= payload.total) { writer.say(`${t("buildSummary", { events: payload.total, blocks })} ${t("plain.buildDone", { blocks })}`); liveState("polite"); }
  }

  function buildRail() {
    const model = store.get().platformEvents;
    if (!model || !panels.build) return;
    blocks = model.events.filter((event) => event.outcome === "BLOCK").length;
    if (rail) rail.destroy();
    rail = renderRail(panels.build, model, {
      lang: lang(),
      registry: registry(),
      caption,
      index: store.get().railIndex,
      expanded: store.get().expandedStage,
      onCue: railCue,
      onState: ({ playing, completed }) => {
        railPlaying = playing;
        store.patch({ railIndex: completed });
        play.textContent = t(playing ? "buildPause" : "buildPlay");
      },
    });
  }

  function tfStamp() {
    if (!stamp) return;
    const live = store.get().platform;
    if (tfMode === "bootstrap") { stamp.innerHTML = `<code>${esc(DIGEST_RULE)}</code><small>${esc(t("sourceLine", { path: DIGEST_SOURCE, field: "service_image" }))}</small>`; return; }
    stamp.innerHTML = live
      ? `${truthChip("LIVE")}<b>${esc(t("confirmedLive", { revision: live.revision, digest: fmtVal("hash12", live.image_digest) }))}</b><small data-checked-since></small>`
      : `<span>${esc(t("liveUnavailable"))}</span>`;
    applyStatic(stamp);
  }

  function applyTfMode() {
    for (const [key, handle] of laneHandles) {
      if (!key.startsWith("tf-") || !handle.el) continue;
      for (const id of ["cloudrun", "iam"]) {
        const item = handle.el.querySelector(`[data-stage="${id}"]`);
        if (item) item.classList.toggle("is-ghost", tfMode === "bootstrap");
      }
    }
    for (const button of document.querySelectorAll("[data-tf-mode]")) button.setAttribute("aria-pressed", String(button.dataset.tfMode === tfMode));
    tfStamp();
  }

  function buildLane(key, host, pipeline, options) {
    if (!host || !pipeline) return;
    const previous = laneHandles.get(key);
    if (previous) previous.destroy();
    laneHandles.set(key, renderLane(host, pipeline, { mode: "linear", lang: lang(), registry: registry(), reach: false, scope: "control", surface: `#${host.id}`, ...options }));
  }

  function paintRevision() {
    const live = store.get().platform;
    revision.hidden = !live;
    if (live) revisionValue.textContent = `${live.service}/${live.revision}`;
  }

  function buildPanels(changed = []) {
    if (changed.includes("language")) { buildCaption = ""; if (view() === "build") caption.textContent = ""; }
    if (!rail || structural(changed) || !railPlaying) buildRail();
    if (rail && changed.includes("language") && store.get().railIndex) rail.seek(store.get().railIndex);
    play.hidden = !rail || view() !== "build";
    const iac = pipelineOf("iac");
    buildLane("tf-serving", byId("tf-serving"), iac, { lanes: ["serving"], trunk: false });
    buildLane("tf-storage", byId("tf-storage"), iac, { lanes: ["storage"], trunk: false });
    buildLane("runtime", panels.runtime, pipelineOf("runtime"), {});
    applyTfMode();
    paintRevision();
  }

  function paintTabs(focus) {
    const active = view();
    if (shown === "build" && active !== "build") buildCaption = caption.textContent;
    for (const tab of tabs) {
      const on = tab.dataset.infraView === active;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    }
    for (const [key, panel] of Object.entries(panels)) if (panel) panel.hidden = key !== active;
    play.hidden = active !== "build" || !rail;
    if (active === "build" && shown !== "build") caption.textContent = buildCaption;
    if (active === "terraform") caption.textContent = "";
    if (active === "runtime") caption.textContent = say(pipelineOf("runtime")?.boundary, lang());
    shown = active;
  }

  const moveTab = (index, event) => {
    store.patch({ infraTab: tabs[(index + tabs.length) % tabs.length].dataset.infraView });
    paintTabs(true);
    event.preventDefault();
  };

  play.addEventListener("click", () => { if (rail) railPlaying ? rail.pause() : rail.play(); });
  for (const tab of tabs) tab.addEventListener("click", () => store.patch({ infraTab: tab.dataset.infraView }));
  document.querySelector(".infra-tabs").addEventListener("keydown", (event) => {
    const at = tabs.indexOf(event.target);
    if (at < 0) return;
    if (STEP[event.key]) moveTab(at + STEP[event.key], event);
    else if (event.key === "Home") moveTab(0, event);
    else if (event.key === "End") moveTab(tabs.length - 1, event);
  });
  const toggle = document.querySelector(".tf-toggle");
  if (toggle) toggle.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tf-mode]");
    if (!button) return;
    tfMode = button.dataset.tfMode;
    applyTfMode();
  });

  store.subscribe(["infraTab", "language"], () => paintTabs(false));
  store.subscribe(["platformEvents", "pipelines", "platformRevision", "platformError", "predict", "language"], (state, changed) => buildPanels(changed));
  store.subscribe(["platformEventsError"], (state) => { if (state.platformEventsError) caption.textContent = t("eventModelUnavailable", { msg: state.platformEventsError }); });
  paintTabs(false);
  buildPanels();
  return { pause: () => { if (rail && railPlaying) rail.pause(); } };
}
