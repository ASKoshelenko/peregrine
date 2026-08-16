import { ambient, createTimeline, observeOnce, reduced } from "./motion.js";
import { bindLive, consoleLine, fmtVal, truthChip } from "./pipeline-model.js";
import { applyStatic, esc, lang as activeLang, t } from "./i18n.js";
import { en } from "../data/i18n.en.js";
import { uk } from "../data/i18n.uk.js";

const DICTS = { en, uk };
const PACE = { DEFINED: 600, BLOCK: 1300, PASS: 480 };
const GLYPH = { PASS: "✓", BLOCK: "×" };
const STEP = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
let uid = 0;

const say = (value, lang) => (value ? String(value[lang] ?? value.en ?? "") : "");
const pad = (index) => String(index + 1).padStart(2, "0");
const truthOf = (stage, pipeline) => stage.truth || pipeline.truth;
const paceOf = (stage, truth) => (Number.isFinite(stage.pace_ms) && stage.pace_ms > 0 ? stage.pace_ms : truth === "DEFINED" ? PACE.DEFINED : PACE[stage.outcome] ?? PACE.PASS);
const away = (href) => (/^https?:/i.test(href) ? ' target="_blank" rel="noreferrer"' : "");
const row = (label, value) => `<p class="lane-row"><span>${esc(label)}</span><b>${esc(value)}</b></p>`;

const walk = (dict, key) => key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);

function phrase(key, lang, params) {
  if (lang === activeLang()) return t(key, params);
  const value = walk(DICTS[lang], key) ?? walk(DICTS.en, key);
  if (typeof value !== "string") return key;
  return params ? value.replace(/\{(\w+)\}/g, (token, slot) => (params[slot] == null ? token : String(params[slot]))) : value;
}

function bandName(lane, lang) {
  const key = `laneBand.${String(lane).toLowerCase()}`;
  const label = phrase(key, lang);
  return label === key ? lane : label;
}

function drawerHtml(stage, ctx, ids) {
  const parts = [];
  if (stage.artifact) parts.push(row(phrase("legendArtifact", ctx.lang), say(stage.artifact, ctx.lang)));
  if (stage.control) parts.push(row(phrase("legendControl", ctx.lang), say(stage.control, ctx.lang)));
  if (stage.duration_recorded) parts.push(`<p class="lane-row lane-duration">${truthChip("RECORDED", { inline: true })}<b>${esc(stage.duration_recorded)}</b></p>`);
  const binds = bindLive(stage, ctx.registry);
  if (binds.length) {
    const rows = binds.map((bind) => `<div class="lane-bind"><span>${esc(say(bind.label, ctx.lang))}</span><b>${esc(bind.text)}</b>${bind.value === null ? "" : truthChip(bind.truth, { inline: true })}</div>`).join("");
    const empty = binds.every((bind) => bind.value === null) ? `<p class="lane-empty">${esc(phrase("noRetainedMeasurement", ctx.lang))}</p>` : "";
    parts.push(`<div class="lane-binds">${rows}${empty}</div>`);
  }
  parts.push(`<p class="lane-source"><code>${esc(phrase("sourceLine", ctx.lang, { path: stage.source, field: stage.id }))}</code></p>`);
  if (stage.depends_on.length) {
    const deps = stage.depends_on.map((parent) => (ctx.rendered.has(parent) ? `<button type="button" class="lane-dep" data-dep="${esc(parent)}">${esc(parent)}</button>` : `<code>${esc(parent)}</code>`)).join("");
    parts.push(`<p class="lane-deps"><span>${esc(phrase("dependsOn", ctx.lang))}</span>${deps}</p>`);
  }
  for (const item of stage.links || []) parts.push(`<p class="lane-links"><a href="${esc(item.href)}"${away(item.href)}>${esc(say(item.label, ctx.lang))}</a></p>`);
  return `<div class="lane-drawer" id="${ids.drawer}" role="group" aria-labelledby="${ids.node}" hidden><div class="lane-drawer-inner">${parts.join("")}</div></div>`;
}

function stageHtml(stage, ctx, last, phase) {
  const truth = truthOf(stage, ctx.pipeline);
  const order = ctx.order.get(stage.id) ?? 0;
  const ids = { node: esc(`${ctx.base}-n-${stage.id}`), drawer: esc(`${ctx.base}-d-${stage.id}`) };
  const band = phase ? `<p class="lane-phase"><code>${esc(bandName(phase, ctx.lang))}</code></p>` : "";
  const track = last ? "" : '<span class="lane-track" aria-hidden="true"><i class="lane-fill"></i><i class="lane-token" data-will-change></i></span>';
  const cmd = stage.cmd ? `<code class="lane-cmd">${esc(stage.cmd)}</code>` : "";
  const outcome = stage.outcome === "DEFINED" ? "" : `<span class="lane-outcome">${esc(stage.outcome)}</span>`;
  const node = `<button type="button" class="lane-node" id="${ids.node}" aria-expanded="false" aria-controls="${ids.drawer}" tabindex="-1" style="--i:${order}"><span class="lane-num">${pad(order)}</span><code class="lane-key">${esc(stage.id)}</code><b class="lane-name">${esc(say(stage.name, ctx.lang))}</b>${cmd}<span class="lane-flags">${truthChip(truth, { quiet: truth === ctx.declared })}${outcome}<i class="lane-mark" aria-hidden="true"></i></span></button>`;
  return `<li class="lane-stage" data-stage="${esc(stage.id)}" data-outcome="${esc(stage.outcome)}" data-truth="${esc(truth)}" style="--i:${order}">${band}${track}${node}${drawerHtml(stage, ctx, ids)}</li>`;
}

function listHtml(stages, ctx, name) {
  let band = "";
  const items = stages.map((stage, index) => stageHtml(stage, ctx, index === stages.length - 1, ctx.bands && stage.lane && stage.lane !== band ? (band = stage.lane) : ""));
  const defined = stages.every((stage) => truthOf(stage, ctx.pipeline) === "DEFINED");
  return `<ol class="lane${defined ? " lane--defined" : ""}" data-lane="${esc(name)}">${items.join("")}</ol>`;
}

function stripHtml(count, kind) {
  if (count < 1) return "";
  const paths = [];
  for (let index = 0; index < count; index += 1) {
    const x = Number((((index * 2 + 1) * 50) / count).toFixed(2));
    const d = kind === "funnel" ? `M${x} 0 V8 C${x} 18 50 10 50 20 V28` : `M50 0 V8 C50 18 ${x} 10 ${x} 20 V28`;
    paths.push(`<path class="lane-edge" d="${d}" fill="none" pathLength="1" vector-effect="non-scaling-stroke" style="--i:${index}"/>`);
  }
  return `<svg class="lane-${kind}" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">${paths.join("")}</svg>`;
}

function chipHtml(chip, ctx, index) {
  const key = chip.kind ? `${chip.kind}-${chip.target}` : String(chip.id ?? index);
  const ids = { node: esc(`${ctx.base}-c-${key}`), drawer: esc(`${ctx.base}-cd-${key}`) };
  const title = chip.kind ? `${chip.kind} · ${chip.target}` : say(chip.label, ctx.lang);
  const value = chip.key ? chip.key.value : chip.value ?? "";
  const hash = chip.sha256 ? `<code class="lane-chip-hash">${esc(fmtVal("hash8", chip.sha256))}</code>` : "";
  const detail = [chip.sha256 ? `<p class="lane-source"><code>${esc(chip.sha256)}</code></p>` : "", chip.observed_at ? `<p class="lane-source"><code>${esc(chip.observed_at)}</code></p>` : ""].join("");
  return `<li class="lane-chip-item" data-chip="${esc(key)}" style="--i:${index}"><button type="button" class="lane-chip" id="${ids.node}" aria-expanded="false" aria-controls="${ids.drawer}" tabindex="-1" style="--i:${index}"><code class="lane-key">${esc(title)}</code>${hash}<b>${esc(value)}</b></button><div class="lane-drawer" id="${ids.drawer}" role="group" aria-labelledby="${ids.node}" hidden><div class="lane-drawer-inner">${detail}</div></div></li>`;
}

export function renderLane(container, pipeline, options = {}) {
  const noop = { run: () => noop, seek: () => noop, expand: () => noop, destroy: () => noop, el: null, stages: [], total: 0 };
  if (!container || !pipeline || !Array.isArray(pipeline.stages)) return noop;
  const { registry = {}, onExpand = null, onCue = null, onStatus = null, onDone = null, expandedId = null, lanes = null, chips = null, trunk = true, boundary = true, watermark = true, reach = true, scope = null, surface = null, declared = pipeline.truth } = options;
  const lang = options.lang || activeLang();
  const mode = options.mode === "fanout" || options.mode === "fanin" ? options.mode : "linear";
  const base = `lane-${(uid += 1)}`;
  const wanted = pipeline.stages.filter((stage) => (stage.lane ? !lanes || lanes.includes(stage.lane) : trunk));
  if (!wanted.length) return noop;

  const sourced = Array.isArray(chips) && chips.length > 0;
  const flat = mode === "linear" || (mode === "fanin" && sourced);
  const spine = flat ? wanted : wanted.filter((stage) => !stage.lane);
  const groups = new Map();
  if (!flat) for (const stage of wanted) if (stage.lane) groups.set(stage.lane, [...(groups.get(stage.lane) || []), stage]);
  const branches = [...groups.values()].flat();
  const play = mode === "fanin" ? [...branches, ...spine] : [...spine, ...branches];
  const ctx = { lang, registry, pipeline, base, declared, bands: mode === "linear" && wanted.some((stage) => stage.lane), rendered: new Set(wanted.map((stage) => stage.id)), order: new Map(play.map((stage, index) => [stage.id, index])) };

  const isDefined = play.some((stage) => truthOf(stage, pipeline) === "DEFINED");
  const head = boundary && pipeline.truth === "DEFINED" && pipeline.boundary ? `<p class="lane-boundary">${esc(say(pipeline.boundary, lang))}</p>` : "";
  const branchHtml = [...groups].map(([name, list]) => `<div class="lane-branch" data-lane="${esc(name)}"><p class="lane-branch-label"><code>${esc(name)}</code></p>${listHtml(list, ctx, name)}</div>`).join("");
  const chipHtmls = sourced ? `<ul class="lane-chips">${chips.map((chip, index) => chipHtml(chip, ctx, index)).join("")}</ul>` : "";
  let body = spine.length ? listHtml(spine, ctx, "trunk") : "";
  if (mode === "fanout") body = `${body}${spine.length && groups.size ? stripHtml(groups.size, "fork") : ""}<div class="lane-branches">${branchHtml}</div>`;
  if (mode === "fanin") body = `${chipHtmls}${branchHtml ? `<div class="lane-branches">${branchHtml}</div>` : ""}${stripHtml(sourced ? chips.length : groups.size, "funnel")}${body}`;
  const mark = watermark && isDefined;
  container.innerHTML = `<div class="lane-shell lane--${mode}${mark ? " contract-watermark" : ""}" data-pipeline="${esc(pipeline.id)}" data-truth="${esc(pipeline.truth)}"${mark ? ` data-watermark="${esc(phrase("contractWatermark", lang))}"` : ""}>${head}${body}</div>`;
  const shell = container.firstElementChild;
  applyStatic(shell);

  const items = new Map();
  const buttons = [...shell.querySelectorAll(".lane-node, .lane-chip")];
  buttons.forEach((button, index) => {
    const li = button.closest("li");
    const item = { button, li, index, drawer: li.querySelector(":scope > .lane-drawer"), mark: li.querySelector(".lane-mark"), track: li.previousElementSibling?.querySelector(":scope > .lane-track") || null, timer: 0 };
    items.set(li.dataset.stage || `chip:${li.dataset.chip}`, item);
  });
  const stageItem = (stage) => items.get(stage.id);

  let open = null;
  let timeline = null;
  let gone = false;
  const disposers = [ambient(shell), observeOnce(shell, () => shell.classList.add("is-drawn"), { threshold: 0.25 })];
  if (reach) for (const item of items.values()) disposers.push(observeOnce(item.li, (el) => el.classList.add("is-reached"), { threshold: 0.6 }));

  const setOpen = (item, next, instant) => {
    if (!item || !item.drawer) return;
    clearTimeout(item.timer);
    item.button.setAttribute("aria-expanded", String(next));
    item.li.classList.toggle("is-open", next);
    if (next) {
      item.drawer.hidden = false;
      if (instant || reduced()) item.drawer.classList.add("is-open");
      else { void item.drawer.offsetHeight; item.drawer.classList.add("is-open"); }
    } else {
      item.drawer.classList.remove("is-open");
      if (instant || reduced()) item.drawer.hidden = true;
      else item.timer = setTimeout(() => { item.drawer.hidden = true; }, 260);
    }
  };

  const expand = (key, { instant = false, notify = false } = {}) => {
    const next = key === null || key === undefined ? null : items.get(key) ? key : null;
    if (open && open !== next) setOpen(items.get(open), false, instant);
    open = next;
    if (open) setOpen(items.get(open), true, instant);
    if (notify && typeof onExpand === "function") onExpand(open);
    return api;
  };

  const rove = (index, focus) => {
    const at = Math.max(0, Math.min(buttons.length - 1, index));
    buttons.forEach((button, position) => { button.tabIndex = position === at ? 0 : -1; });
    if (focus && buttons[at]) buttons[at].focus();
  };

  const ping = (key) => {
    const item = items.get(key);
    if (!item) return;
    item.li.classList.remove("is-ping");
    void item.li.offsetHeight;
    item.li.classList.add("is-ping");
    rove(item.index, true);
    item.li.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });
  };

  const onClick = (event) => {
    const dep = event.target.closest(".lane-dep");
    if (dep) { ping(dep.dataset.dep); return; }
    const button = event.target.closest(".lane-node, .lane-chip");
    if (!button || !shell.contains(button)) return;
    const key = button.closest("li").dataset.stage || `chip:${button.closest("li").dataset.chip}`;
    rove(buttons.indexOf(button), false);
    expand(open === key ? null : key, { notify: true });
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape" && open) { const item = items.get(open); expand(null, { notify: true }); if (item) item.button.focus(); event.preventDefault(); return; }
    const button = event.target.closest(".lane-node, .lane-chip");
    if (!button) return;
    const from = buttons.indexOf(button);
    if (STEP[event.key]) { rove(from + STEP[event.key], true); event.preventDefault(); }
    else if (event.key === "Home") { rove(0, true); event.preventDefault(); }
    else if (event.key === "End") { rove(buttons.length - 1, true); event.preventDefault(); }
  };

  shell.addEventListener("click", onClick);
  shell.addEventListener("keydown", onKeyDown);

  const reset = () => {
    for (const item of items.values()) {
      item.li.classList.remove("is-now", "is-done", "is-flash", "is-ping");
      if (item.track) item.track.classList.remove("is-fill", "is-run");
      if (item.mark) item.mark.textContent = "";
    }
  };

  const enter = (stage, immediate) => {
    const item = stageItem(stage);
    if (!item) return;
    if (item.track) { item.track.classList.add("is-fill"); if (!immediate) item.track.classList.add("is-run"); }
    item.li.classList.remove("is-done");
    if (!immediate) {
      item.li.classList.add("is-now");
      if (stage.outcome === "BLOCK") item.li.classList.add("is-flash");
    }
    if (typeof onStatus === "function") onStatus(phrase("stageStatus", lang, { n: (ctx.order.get(stage.id) ?? 0) + 1, total: play.length, name: say(stage.name, lang) }), stage, { immediate });
  };

  const land = (stage, immediate) => {
    const item = stageItem(stage);
    if (!item) return;
    const truth = truthOf(stage, pipeline);
    item.li.classList.remove("is-now");
    item.li.classList.add("is-done");
    if (item.track) item.track.classList.add("is-fill");
    if (item.mark) item.mark.textContent = truth === "DEFINED" ? "" : GLYPH[stage.outcome] || "";
    if (typeof onCue === "function") onCue(stage, { index: ctx.order.get(stage.id) ?? 0, truth, outcome: stage.outcome, line: consoleLine(stage, bindLive(stage, registry), lang), immediate });
  };

  const beats = [];
  const plan = (list, from) => list.reduce((at, stage) => {
    const step = paceOf(stage, truthOf(stage, pipeline));
    beats.push({ at, rank: 1, stage }, { at: at + step, rank: 0, stage });
    return at + step;
  }, from);
  if (mode === "fanin") {
    let sources = 0;
    for (const list of groups.values()) sources = Math.max(sources, plan(list, 0));
    plan(spine, sources);
  } else {
    const junction = plan(spine, 0);
    for (const list of groups.values()) plan(list, junction);
  }
  beats.sort((a, b) => a.at - b.at || a.rank - b.rank);
  const stops = beats.map((beat, index) => (beat.rank === 0 ? index : -1)).filter((index) => index >= 0);
  const cues = beats.map((beat) => ({ at: beat.at, fire: ({ immediate, index }) => { if (index === 0) reset(); (beat.rank ? enter : land)(beat.stage, immediate); } }));

  const ensure = () => {
    if (timeline) return timeline;
    timeline = createTimeline({ surface: surface || `${base}:${pipeline.id}`, scope: scope || shell.closest("[data-workspace]")?.dataset.workspace || pipeline.id, cues, onDone: () => { if (typeof onDone === "function") onDone(api); } });
    return timeline;
  };

  const api = {
    el: shell,
    stages: play.map((stage) => stage.id),
    total: play.length,
    run() {
      if (gone) return api;
      if (timeline) timeline.cancel();
      timeline = null;
      reset();
      ensure().play();
      return api;
    },
    seek(count, { immediate = true } = {}) {
      if (gone) return api;
      const done = Math.max(0, Math.min(stops.length, Math.trunc(Number(count) || 0)));
      const line = ensure();
      if (!done) { line.seek(-1); reset(); return api; }
      line.seek(stops[done - 1], { immediate });
      return api;
    },
    expand(key) { return gone ? api : expand(key ?? null, { instant: true }); },
    destroy() {
      if (gone) return api;
      gone = true;
      if (timeline) timeline.cancel();
      for (const item of items.values()) clearTimeout(item.timer);
      for (const off of disposers) off();
      shell.removeEventListener("click", onClick);
      shell.removeEventListener("keydown", onKeyDown);
      container.innerHTML = "";
      return api;
    },
  };

  if (buttons.length) rove(expandedId && items.has(expandedId) ? items.get(expandedId).index : 0, false);
  if (expandedId) expand(expandedId, { instant: true });
  return api;
}
