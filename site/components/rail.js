import { createTimeline, reduced } from "./motion.js";
import { applyStatic, esc, lang, t } from "./i18n.js";
import { pick } from "./platform-event-model.js";
import { resolvePointer, truthChip } from "./pipeline-model.js";

const TRACK_X = [18, 46, 74];
const TRACK_OF = { project: 1, "vertex-red": 2, vertex: 2 };
const RAIL_W = 84;
const STATES = ["is-pending", "is-now", "is-done"];
const BAND_H = 28;
const ELBOW = 6;
const PACE = 480;
const PHASE_PACE = { foundation: 640, serve: 640 };
const BLOCK_FLASH = 320;
const SAY_MS = 200;
const SCRUB_MS = 120;
const WIDE = matchMedia("(min-width: 900px)");
const MID = matchMedia("(min-width: 640px)");
const rowHeight = () => (WIDE.matches ? 64 : MID.matches ? 56 : 92);

const ukForm = (n) => (n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 1 : 2);
const eventWord = (n, language) => (language === "uk" ? ["подія", "події", "подій"][ukForm(n)] : n === 1 ? "event" : "events");
const pad = (n) => String(n).padStart(2, "0");
const paceOf = (event) => event.pace_ms ?? (event.outcome === "BLOCK" ? 1300 : PHASE_PACE[event.phase] ?? PACE);
const behavior = () => (reduced() ? "auto" : "smooth");

function layout(events, rowH) {
  const items = [];
  const rows = [];
  let y = 0;
  let phase = null;
  events.forEach((event, index) => {
    if (event.phase !== phase) {
      phase = event.phase;
      const group = events.filter((entry) => entry.phase === phase);
      items.push({ kind: "band", phase, y, count: group.length, blocks: group.filter((entry) => entry.outcome === "BLOCK").length });
      y += BAND_H;
    }
    const track = TRACK_OF[event.id] ?? 0;
    const row = { kind: "row", event, index, track, x: TRACK_X[track], y, cy: y + rowH / 2 };
    items.push(row);
    rows.push(row);
    y += rowH;
  });
  return { items, rows, height: y };
}

const elbow = (x1, y1, x2, y2) => (x1 === x2
  ? `M${x1} ${y1}V${y2}`
  : `M${x1} ${y1}V${y2 - ELBOW}Q${x1} ${y2} ${x1 + (x2 > x1 ? ELBOW : -ELBOW)} ${y2}H${x2}`);

function links(rows) {
  const byId = new Map(rows.map((row) => [row.event.id, row]));
  const list = [];
  for (const row of rows) {
    for (const parent of row.event.depends_on) {
      const from = byId.get(parent);
      if (!from) continue;
      list.push({ from: parent, to: row.event.id, block: from.event.outcome === "BLOCK", d: elbow(from.x, from.cy, row.x, row.cy) });
    }
  }
  return list;
}

function markSvg(row) {
  const { x, cy, event } = row;
  const block = event.outcome === "BLOCK";
  const live = event.truth === "LIVE";
  const shape = block
    ? `<rect class="rail-dot rail-dot--block" x="${x - 6}" y="${cy - 6}" width="12" height="12" transform="rotate(45 ${x} ${cy})"/>`
    : live
      ? `<circle class="rail-pulse" cx="${x}" cy="${cy}" r="7"/><circle class="rail-dot rail-dot--live" cx="${x}" cy="${cy}" r="10"/><circle class="rail-dot rail-dot--core" cx="${x}" cy="${cy}" r="4.5"/>`
      : `<circle class="rail-dot" cx="${x}" cy="${cy}" r="7"/>`;
  const glyph = block
    ? `<path class="rail-glyph rail-glyph--x" d="M${x - 3} ${cy - 3}L${x + 3} ${cy + 3}M${x - 3} ${cy + 3}L${x + 3} ${cy - 3}"/>`
    : live ? "" : `<path class="rail-glyph rail-glyph--tick" d="M${x - 3.4} ${cy}l2.6 2.8l4.6-5.6"/>`;
  return `<g class="rail-mark is-pending" data-rail-mark="${esc(event.id)}">${shape}${glyph}</g>`;
}

function drawing(rows, height) {
  const spur = rows.find((row) => row.track === 2 && !rows.some((other) => other.event.depends_on.includes(row.event.id)));
  const cap = spur ? `<path class="rail-cap" d="M${spur.x} ${spur.cy}V${spur.cy + 13}M${spur.x - 6} ${spur.cy + 13}H${spur.x + 6}"/>` : "";
  const edges = links(rows).map((link) => `<g class="rail-link is-pending${link.block ? " edge-block" : ""}" data-from="${esc(link.from)}" data-to="${esc(link.to)}"><path class="rail-edge" d="${link.d}"/><path class="rail-edge-fill" pathLength="1" d="${link.d}"/></g>`).join("");
  return `<g>${edges}${cap}</g><g>${rows.map(markSvg).join("")}</g>`;
}

function liveJoin(registry) {
  const service = resolvePointer(registry.platform, "/service");
  const revision = resolvePointer(registry.platform, "/revision");
  return service && revision ? `${service}/${revision}` : null;
}

function evidenceOf(event, language, registry) {
  if (event.truth !== "LIVE") return { text: pick(event, "evidence", language), live: true };
  const join = liveJoin(registry);
  return join ? { text: join, live: true } : { text: t("liveUnavailable"), live: false };
}

function bandText(band, language) {
  const phase = t(`rail.phase.${band.phase}`);
  const tally = `${band.count} ${eventWord(band.count, language)}`;
  return `${phase} · ${tally}${band.blocks ? ` · ${band.blocks} BLOCK` : ""}`;
}

function bandHtml(band, language) {
  const phase = t(`rail.phase.${band.phase}`);
  return `<li class="rail-band" data-rail-band="${esc(band.phase)}" style="height:var(--rail-band)"><span class="rail-band-name">${esc(phase)}</span><span class="rail-band-tally">${band.count} ${esc(eventWord(band.count, language))}</span>${band.blocks ? `<span class="rail-band-blocks">${band.blocks} BLOCK</span>` : ""}</li>`;
}

function drawerHtml(row, rows, language, registry) {
  const event = row.event;
  const parents = event.depends_on.map((id) => {
    const parent = rows.find((entry) => entry.event.id === id);
    if (!parent) return "";
    return `<button class="rail-chip" type="button" data-rail-jump="${esc(id)}"><span>${pad(parent.index + 1)}</span>${esc(pick(parent.event, "resource", language))}</button>`;
  }).join("");
  const join = event.truth === "LIVE" ? liveJoin(registry) : null;
  const liveRow = event.truth === "LIVE"
    ? `<p class="rail-live">${esc(t("liveRevision"))}<code>${esc(join || "—")}</code>${join ? truthChip("LIVE", { inline: true }) : ""}</p>`
    : "";
  return `<p class="rail-action">${esc(pick(event, "action", language))}</p>`
    + `<p class="rail-control"><span>${esc(t("control"))}</span>${esc(pick(event, "control", language))}</p>`
    + liveRow
    + `<p class="rail-cite"><code>${esc(t("rail.source", { path: event.source }))}</code></p>`
    + `<p class="rail-parents"><span>${esc(t("dependsOn"))}</span>${parents || `<em>${esc(t("rail.noParents"))}</em>`}</p>`;
}

function rowHtml(row, rows, language, registry, declared) {
  const event = row.event;
  const evidence = evidenceOf(event, language, registry);
  const chip = evidence.live ? truthChip(event.truth, { quiet: event.truth === declared }) : "";
  return `<li class="rail-row is-pending" data-rail-row="${esc(event.id)}" style="--i:${row.index};height:var(--rail-row)">`
    + `<button class="rail-button" type="button" id="rail-row-${esc(event.id)}" aria-expanded="false" aria-controls="rail-drawer-${esc(event.id)}">`
    + `<span class="rail-num">${pad(row.index + 1)}</span>`
    + `<b class="rail-name">${esc(pick(event, "resource", language))}</b>`
    + `<span class="rail-outcome" data-outcome="${esc(event.outcome)}">${esc(event.outcome)}</span>`
    + `<small class="rail-evidence">${esc(evidence.text)}</small>${chip}</button>`
    + `<div class="rail-drawer" id="rail-drawer-${esc(event.id)}" role="region" aria-labelledby="rail-row-${esc(event.id)}"><div class="rail-drawer-inner">${drawerHtml(row, rows, language, registry)}</div></div></li>`;
}

export function renderRail(container, model, { lang: language = lang(), registry = {}, onCue, onState, caption = document.getElementById("infra-caption"), index = 0, expanded = null, scope = "control", surface = "#console-body" } = {}) {
  const noop = { play: () => {}, pause: () => {}, seek: () => {}, highlightLineage: () => {}, destroy: () => {} };
  const events = model && Array.isArray(model.events) ? model.events : [];
  if (!container || !events.length) return noop;
  container.removeAttribute("aria-live");
  const total = events.length;
  const blocks = events.filter((event) => event.outcome === "BLOCK").length;
  const tally = events.reduce((seen, event) => seen.set(event.truth, (seen.get(event.truth) || 0) + 1), new Map());
  const declared = [...tally].sort((a, b) => b[1] - a[1])[0][0];
  let plan = layout(events, rowHeight());
  let completed = index > 0 ? Math.min(index, total) : reduced() ? total : 0;
  let active = -1;
  let playing = false;
  let timeline = null;
  let lineage = null;
  let open = null;
  let sayTimer = 0;
  let scrubTimer = 0;

  container.innerHTML = `<figure class="rail">`
    + `<div class="rail-controls"><label class="rail-scrub-label" for="rail-scrub">${esc(t("rail.scrub"))}</label>`
    + `<input class="rail-scrub" id="rail-scrub" type="range" min="0" max="${total}" step="1" value="${completed}"/>`
    + `<output class="rail-position" for="rail-scrub">${pad(completed)} / ${total}</output></div>`
    + `<div class="rail-grid"><svg class="rail-draw" aria-hidden="true" focusable="false"></svg>`
    + `<ol class="rail-rows">${plan.items.map((item) => (item.kind === "band" ? bandHtml(item, language) : rowHtml(item, plan.rows, language, registry, declared))).join("")}</ol></div>`
    + `<figcaption class="rail-cite">${esc(t("sourceLine", { path: "site/platform-events.json", field: "events" }))}</figcaption></figure>`;

  const figure = container.querySelector(".rail");
  const svg = container.querySelector(".rail-draw");
  const scrub = container.querySelector(".rail-scrub");
  const position = container.querySelector(".rail-position");
  const rowEls = new Map();
  const markEls = new Map();
  let linkEls = [];
  for (const el of container.querySelectorAll("[data-rail-row]")) rowEls.set(el.dataset.railRow, el);

  const rowOf = (id) => plan.rows.find((row) => row.event.id === id) || null;
  const phaseStartAt = (i) => i === 0 || events[i - 1].phase !== events[i].phase;
  const state = (idx) => (idx < completed ? (idx === active ? "is-now" : "is-done") : "is-pending");
  const flag = (el, cls, on) => el.classList.toggle(cls, on);
  const setState = (el, value) => { for (const cls of STATES) flag(el, cls, cls === value); };

  function paint() {
    for (const row of plan.rows) {
      const el = rowEls.get(row.event.id);
      const mark = markEls.get(row.event.id);
      const value = state(row.index);
      const inLineage = lineage ? lineage.has(row.event.id) : null;
      if (!el) continue;
      setState(el, value);
      flag(el, "is-lineage", inLineage === true);
      flag(el, "is-dim", inLineage === false);
      flag(el, "is-block-flash", row.event.outcome === "BLOCK" && row.index < completed);
      if (!mark) continue;
      setState(mark, value);
      flag(mark, "is-lineage", inLineage === true);
      flag(mark, "is-dim", inLineage === false);
    }
    for (const link of linkEls) {
      const child = rowOf(link.dataset.to);
      const value = child ? state(child.index) : "is-pending";
      const inLineage = lineage ? lineage.has(link.dataset.to) && lineage.has(link.dataset.from) : null;
      setState(link, value);
      flag(link, "is-lineage", inLineage === true);
      flag(link, "is-dim", inLineage === false);
    }
    scrub.value = String(completed);
    scrub.setAttribute("aria-valuetext", valueText());
    position.textContent = `${pad(completed)} / ${total}`;
    if (typeof onState === "function") onState({ playing, completed, total });
  }

  function valueText() {
    if (!completed) return t("rail.start");
    const row = plan.rows[completed - 1];
    return `${row.event.id} — ${pick(row.event, "resource", language)} (${row.event.outcome})`;
  }

  function geometry() {
    plan = layout(events, rowHeight());
    figure.style.setProperty("--rail-row", `${rowHeight()}px`);
    figure.style.setProperty("--rail-band", `${BAND_H}px`);
    svg.setAttribute("width", String(RAIL_W));
    svg.setAttribute("height", String(plan.height));
    svg.setAttribute("viewBox", `0 0 ${RAIL_W} ${plan.height}`);
    svg.innerHTML = drawing(plan.rows, plan.height);
    markEls.clear();
    for (const el of svg.querySelectorAll("[data-rail-mark]")) markEls.set(el.dataset.railMark, el);
    linkEls = [...svg.querySelectorAll(".rail-link")];
    paint();
  }

  function say(text) {
    if (!caption || !text) return;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { caption.textContent = text; }, SAY_MS);
  }

  function cue(payload) {
    if (typeof onCue === "function") onCue(payload);
  }

  function lineFor(event) {
    const evidence = evidenceOf(event, language, registry);
    return {
      kind: event.outcome === "BLOCK" ? "fail" : evidence.live && event.truth === "LIVE" ? "live" : "ok",
      text: `[${event.phase}] ${pick(event, "resource", language)} · ${evidence.text}`,
      chip: evidence.live ? event.truth : null,
    };
  }

  function emitTo(n) {
    cue({ type: "reset", completed: 0, total, immediate: true });
    for (let i = 0; i < n; i++) emit(i, true);
  }

  function emit(i, immediate) {
    cue({ type: "event", event: events[i], index: i, completed: i + 1, total, immediate, phaseStart: phaseStartAt(i), line: lineFor(events[i]) });
  }

  function reveal(i) {
    const el = rowEls.get(events[i].id);
    if (el) el.scrollIntoView({ block: "nearest", behavior: behavior() });
  }

  function advance(i, immediate) {
    completed = i + 1;
    active = i;
    emit(i, immediate);
    if (phaseStartAt(i)) {
      const band = plan.items.find((item) => item.kind === "band" && item.phase === events[i].phase);
      if (band) say(bandText(band, language));
    }
    paint();
    if (!immediate) reveal(i);
  }

  function finish() {
    playing = false;
    active = -1;
    timeline = null;
    paint();
    say(t("buildSummary", { events: total, blocks }));
  }

  function build() {
    const rest = plan.rows.slice(completed);
    let at = 0;
    const cues = rest.map((row) => {
      const cueAt = at;
      at += paceOf(row.event) + (row.event.outcome === "BLOCK" ? BLOCK_FLASH : 0);
      return { at: cueAt, fire: ({ immediate }) => advance(row.index, immediate) };
    });
    timeline = createTimeline({ surface, scope, cues, onDone: finish });
  }

  function play() {
    clearTimeout(scrubTimer);
    if (completed >= total) seek(0, { emit: false });
    if (!completed) cue({ type: "reset", completed: 0, total, immediate: false });
    if (!timeline) build();
    playing = true;
    paint();
    timeline.play();
  }

  function pause() {
    playing = false;
    active = -1;
    if (timeline) timeline.pause();
    paint();
  }

  function seek(n, { emit: emitLines = true } = {}) {
    const next = Math.max(0, Math.min(total, Math.trunc(Number(n) || 0)));
    if (timeline) { timeline.cancel(); timeline = null; }
    playing = false;
    active = -1;
    completed = next;
    paint();
    if (!emitLines) return;
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => emitTo(next), SCRUB_MS);
    if (next > 0) reveal(next - 1);
  }

  function ancestors(id) {
    const seen = new Set([id]);
    const work = [id];
    while (work.length) {
      const row = rowOf(work.pop());
      for (const parent of row ? row.event.depends_on : []) if (!seen.has(parent)) { seen.add(parent); work.push(parent); }
    }
    return seen;
  }

  function expand(id) {
    for (const [key, el] of rowEls) {
      const on = key === id;
      el.classList.toggle("is-open", on);
      el.querySelector(".rail-button").setAttribute("aria-expanded", String(on));
    }
    open = id;
  }

  function highlightLineage(id) {
    if (!id || !rowOf(id) || id === open) {
      lineage = null;
      expand(null);
      paint();
      return;
    }
    lineage = ancestors(id);
    expand(id);
    paint();
    const row = rowOf(id);
    const parents = lineage.size - 1;
    say(`${pick(row.event, "action", language)} · ${parents ? t("rail.lineage", { n: parents }) : t("rail.lineageRoot")}`);
  }

  function jump(id) {
    const el = rowEls.get(id);
    if (!el) return;
    el.classList.remove("is-flash");
    requestAnimationFrame(() => el.classList.add("is-flash"));
    setTimeout(() => el.classList.remove("is-flash"), 640);
    el.querySelector(".rail-button").focus({ preventScroll: true });
    el.scrollIntoView({ block: "nearest", behavior: behavior() });
  }

  const onClick = (event) => {
    const chip = event.target.closest("[data-rail-jump]");
    if (chip) { jump(chip.dataset.railJump); return; }
    const button = event.target.closest(".rail-button");
    if (button) highlightLineage(button.closest("[data-rail-row]").dataset.railRow);
  };
  const onKey = (event) => {
    if (event.key !== "Escape" || !lineage) return;
    highlightLineage(null);
    event.stopPropagation();
  };
  const onScrub = (event) => seek(event.target.value);
  const onLeave = (event) => {
    if ((event.detail || {}).workspace !== scope) return;
    timeline = null;
    playing = false;
    active = -1;
    paint();
  };

  container.addEventListener("click", onClick);
  container.addEventListener("keydown", onKey);
  scrub.addEventListener("input", onScrub);
  WIDE.addEventListener("change", geometry);
  MID.addEventListener("change", geometry);
  document.addEventListener("workspace:leave", onLeave);

  applyStatic(container);
  geometry();
  if (expanded) highlightLineage(expanded);

  function destroy() {
    clearTimeout(sayTimer);
    clearTimeout(scrubTimer);
    if (timeline) timeline.cancel();
    timeline = null;
    container.removeEventListener("click", onClick);
    container.removeEventListener("keydown", onKey);
    scrub.removeEventListener("input", onScrub);
    WIDE.removeEventListener("change", geometry);
    MID.removeEventListener("change", geometry);
    document.removeEventListener("workspace:leave", onLeave);
    container.innerHTML = "";
  }

  return { play, pause, seek: (n) => seek(n), highlightLineage, destroy };
}
