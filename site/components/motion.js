const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
const reducedSubscribers = new Set();
const jobs = new Set();
const surfaces = new Map();
const scopes = new Map();
const running = new Set();
const reveals = new Set();
const revealObservers = new Map();
const ambientRoots = new Map();
let frame = 0;
let ambientObserver = null;
let liveRoot = null;

reduceQuery.addEventListener("change", () => { for (const cb of [...reducedSubscribers]) safely(cb, reduceQuery.matches); });

function safely(fn, ...args) { try { return fn(...args); } catch (error) { console.error("motion callback failed", error); return undefined; } }

function tick(now) { frame = 0; for (const job of [...jobs]) job(now); if (jobs.size) frame = requestAnimationFrame(tick); }
function addJob(job) { jobs.add(job); if (!frame) frame = requestAnimationFrame(tick); }
function dropJob(job) { jobs.delete(job); if (!jobs.size && frame) { cancelAnimationFrame(frame); frame = 0; } }

export function reduced() { return reduceQuery.matches; }

export function onReduced(cb) { reducedSubscribers.add(cb); return () => reducedSubscribers.delete(cb); }

export function createTimeline({ surface, scope, cues = [], onDone } = {}) {
  const list = [...cues].filter((cue) => cue && typeof cue.fire === "function").sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  const total = list.length ? (list[list.length - 1].at ?? 0) : 0;
  let elapsed = 0, fired = 0, live = false, done = false, dead = false, origin = 0;
  const emit = (index, immediate) => safely(list[index].fire, { immediate, index, at: list[index].at ?? 0, timeline: api });
  const job = (now) => {
    elapsed = now - origin;
    while (fired < list.length && (list[fired].at ?? 0) <= elapsed) emit(fired++, false);
    if (fired >= list.length && elapsed >= total) finish();
  };
  const claim = () => {
    if (!surface) return;
    const held = surfaces.get(surface);
    if (held && held !== api) held.cancel();
    surfaces.set(surface, api);
  };
  const release = () => { if (surface && surfaces.get(surface) === api) surfaces.delete(surface); };
  const stop = () => { live = false; ctl.auto = false; running.delete(ctl); dropJob(job); };
  const finish = () => { if (done) return; done = true; stop(); release(); if (typeof onDone === "function") safely(onDone, api); };
  const ctl = { auto: false, autoPause() { if (live) { pause(); ctl.auto = true; running.add(ctl); } }, autoResume() { if (ctl.auto) { ctl.auto = false; play(); } } };
  const play = () => {
    if (dead) return api;
    if (!list.length) { finish(); return api; }
    if (done && fired >= list.length) return api;
    claim();
    if (reduced()) return seek(list.length - 1, { immediate: true });
    if (live) return api;
    live = true; done = false; origin = performance.now() - elapsed; running.add(ctl); addJob(job);
    return api;
  };
  const pause = () => { if (!live) return api; live = false; ctl.auto = false; running.delete(ctl); dropJob(job); return api; };
  const seek = (index, { immediate = false } = {}) => {
    if (dead || !list.length || !Number.isFinite(Number(index))) return api;
    const target = Math.max(-1, Math.min(list.length - 1, Math.trunc(Number(index))));
    if (target + 1 < fired) { fired = 0; done = false; claim(); }
    for (let n = fired; n <= target; n++) emit(n, immediate);
    fired = Math.max(fired, target + 1);
    elapsed = target < 0 ? 0 : (list[target].at ?? 0);
    if (live) origin = performance.now() - elapsed;
    if (fired >= list.length) finish();
    return api;
  };
  const cancel = () => {
    if (dead) return api;
    dead = true; stop(); release();
    if (scope && scopes.has(scope)) { scopes.get(scope).delete(api); if (!scopes.get(scope).size) scopes.delete(scope); }
    return api;
  };
  const api = { play, pause, seek, cancel, get done() { return done; }, get running() { return live; }, get index() { return fired - 1; }, get length() { return list.length; } };
  if (scope) { if (!scopes.has(scope)) scopes.set(scope, new Set()); scopes.get(scope).add(api); }
  claim();
  return api;
}

export function cancelScope(scope) {
  const held = scopes.get(scope);
  if (!held) return;
  for (const timeline of [...held]) timeline.cancel();
  scopes.delete(scope);
}

function clampThreshold(el, base) {
  const height = el.offsetHeight || el.getBoundingClientRect().height || 0;
  if (!height) return base;
  return Number(Math.max(0.01, Math.min(base, (innerHeight / height) * 0.5)).toFixed(2));
}

function revealPool(threshold) {
  const key = threshold.toFixed(2);
  let pool = revealObservers.get(key);
  if (!pool) {
    pool = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) for (const record of [...reveals]) if (record.el === entry.target) fireReveal(record);
    }, { threshold: Number(key) });
    revealObservers.set(key, pool);
  }
  return pool;
}

function fireReveal(record) {
  if (record.fired) return;
  record.fired = true;
  reveals.delete(record);
  if (record.observer) record.observer.unobserve(record.el);
  safely(record.cb, record.el);
}

function armReveal(record) {
  if (record.fired) return;
  const rect = record.el.getBoundingClientRect();
  const laidOut = rect.width > 0 || rect.height > 0;
  if (laidOut && rect.bottom <= 0) { fireReveal(record); return; }
  const threshold = laidOut ? clampThreshold(record.el, record.base) : record.base;
  if (record.observer && record.threshold === threshold) return;
  if (record.observer) record.observer.unobserve(record.el);
  record.threshold = threshold;
  record.observer = revealPool(threshold);
  record.observer.observe(record.el);
}

export function observeOnce(el, cb, { threshold = 0.35 } = {}) {
  if (!el || typeof cb !== "function") return () => {};
  const record = { el, cb, base: threshold, threshold, fired: false, observer: null };
  reveals.add(record);
  armReveal(record);
  return () => { if (record.fired) return; record.fired = true; reveals.delete(record); if (record.observer) record.observer.unobserve(el); };
}

const NUMBER = /-?\d[\d,]*(?:\.\d+)?/g;

function fmtPart(spec, value) {
  const text = Math.abs(value).toFixed(spec.decimals);
  const [int, fraction] = text.split(".");
  const grouped = spec.grouped ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : int;
  return `${value < 0 ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function countUp(el, finalString, { ms = 700, delay = 0 } = {}) {
  if (!el) return () => {};
  const text = String(finalString);
  const chunks = [];
  const specs = [];
  let cursor = 0;
  for (const match of text.matchAll(NUMBER)) {
    const clean = match[0].replace(/,/g, "");
    const dot = clean.indexOf(".");
    chunks.push(text.slice(cursor, match.index));
    specs.push({ value: Number(clean), decimals: dot < 0 ? 0 : clean.length - dot - 1, grouped: match[0].includes(",") });
    cursor = match.index + match[0].length;
  }
  chunks.push(text.slice(cursor));
  const land = () => { el.textContent = text; };
  el.style.fontVariantNumeric = "tabular-nums";
  if (!specs.length || specs.some((spec) => !Number.isFinite(spec.value)) || reduced() || document.hidden) { land(); return () => {}; }
  const paint = (progress) => { el.textContent = chunks.map((chunk, i) => chunk + (i < specs.length ? fmtPart(specs[i], specs[i].value * progress) : "")).join(""); };
  let origin = 0;
  const job = (now) => {
    if (!origin) origin = now + delay;
    if (now < origin) return;
    const progress = ms > 0 ? Math.min(1, (now - origin) / ms) : 1;
    if (progress >= 1) { dropJob(job); land(); return; }
    paint(1 - Math.pow(1 - progress, 3));
  };
  paint(0);
  addJob(job);
  return () => { dropJob(job); land(); };
}

function setLive(el) {
  if (liveRoot === el) return;
  if (liveRoot) {
    liveRoot.classList.remove("is-live");
    for (const node of liveRoot.querySelectorAll("[data-will-change]")) node.style.willChange = "";
  }
  liveRoot = el;
  if (el) {
    el.classList.add("is-live");
    [...el.querySelectorAll("[data-will-change]")].slice(0, 3).forEach((node) => { node.style.willChange = "transform, opacity"; });
  }
}

function onAmbient(entries) {
  for (const entry of entries) if (ambientRoots.has(entry.target)) ambientRoots.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
  let best = null, bestRatio = 0;
  for (const [node, ratio] of ambientRoots) if (ratio > bestRatio) { best = node; bestRatio = ratio; }
  setLive(best);
}

export function ambient(el) {
  if (!el) return () => {};
  if (!ambientObserver) ambientObserver = new IntersectionObserver(onAmbient, { threshold: 0.15, rootMargin: "10% 0px" });
  ambientRoots.set(el, 0);
  ambientObserver.observe(el);
  return () => {
    ambientRoots.delete(el);
    ambientObserver.unobserve(el);
    if (liveRoot === el) setLive(null);
    el.classList.remove("is-live");
  };
}

document.addEventListener("visibilitychange", () => {
  const paused = document.hidden;
  document.documentElement.classList.toggle("is-paused", paused);
  for (const ctl of [...running]) paused ? ctl.autoPause() : ctl.autoResume();
});

document.addEventListener("workspace:leave", (event) => {
  const detail = event.detail || {};
  if (detail.workspace) cancelScope(detail.workspace);
  if (detail.id && detail.id !== detail.workspace) cancelScope(detail.id);
});

document.addEventListener("workspace:enter", () => { for (const record of [...reveals]) armReveal(record); });

document.documentElement.classList.toggle("is-paused", document.hidden);
