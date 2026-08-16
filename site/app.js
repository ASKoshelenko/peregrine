import * as router from "./components/router.js";
import { applyStatic, lang, onChange, t, toggle } from "./components/i18n.js";
import { createStore } from "./components/store.js";
import { loadPipelineModel } from "./components/pipeline-model.js";
import { loadPlatformEventModel } from "./components/platform-event-model.js";
import { registerPwaShell } from "./components/pwa-shell.js";
import { mountHero } from "./components/sections/hero.js";
import { mountPlatform } from "./components/sections/platform.js";
import { mountConveyor } from "./components/sections/conveyor.js";
import { mountControlRoom } from "./components/sections/control-room.js";
import { mountGateLab } from "./components/sections/gates.js";
import { mountDetector } from "./components/sections/detector.js";
import { mountEvidence } from "./components/sections/evidence.js";
import { mountOps } from "./components/sections/ops.js";

const API_BASE = window.PEREGRINE_API_BASE || "";
const EVIDENCE_URL = "/artifacts/observed/latest.json";
const POLL_MS = 60000;
const TICK_MS = 1000;
const DIP_MS = 300;

const byId = (id) => document.getElementById(id);
const store = createStore({ language: lang() });
const registry = () => { const state = store.get(); return { platform: state.platform, evidence: state.evidence, predict: state.predict.result }; };
const ctx = { store, registry, api: API_BASE };

async function json(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const settle = (promise, ok, fail) => promise.then(ok, (error) => fail(error instanceof Error ? error.message : String(error)));

function dip() {
  for (const el of document.querySelectorAll("#infra-revision-value, #live-strip b")) {
    el.classList.add("is-dip");
    setTimeout(() => el.classList.remove("is-dip"), DIP_MS);
  }
}

function acceptPlatform(platform) {
  const previous = store.get().platformRevision;
  store.patch({ platform, platformRevision: platform.revision || null, platformError: null, platformFetchedAt: Date.now() });
  if (previous && previous !== platform.revision) dip();
}

const pollPlatform = () => settle(json(`${API_BASE}/api/platform`), acceptPlatform, (msg) => store.patch({ platform: null, platformRevision: null, platformError: msg, platformFetchedAt: Date.now() }));

function heartbeat() {
  const fetchedAt = store.get().platformFetchedAt;
  if (!fetchedAt) return;
  const seconds = Math.max(0, Math.round((Date.now() - fetchedAt) / 1000));
  for (const el of document.querySelectorAll("[data-checked-since]")) el.textContent = t("checkedAgo", { s: seconds });
}

function scrollChrome() {
  const bar = byId("reading-progress");
  const top = byId("back-to-top");
  let available = 0;
  let frame = 0;
  let visible = null;
  const measure = () => { available = document.documentElement.scrollHeight - window.innerHeight; };
  const paint = () => {
    frame = 0;
    bar.style.transform = `scaleX(${available > 0 ? Math.min(1, window.scrollY / available) : 0})`;
    const next = window.scrollY > window.innerHeight * 0.7;
    if (next !== visible) { visible = next; top.classList.toggle("is-visible", next); }
  };
  const tick = () => { if (!frame) frame = requestAnimationFrame(paint); };
  window.addEventListener("scroll", tick, { passive: true });
  window.addEventListener("resize", () => { measure(); tick(); }, { passive: true });
  document.addEventListener("workspace:enter", () => { measure(); tick(); });
  measure();
  paint();
}

applyStatic(document);
byId("language-switch").addEventListener("click", () => toggle());
onChange((next) => store.patch({ language: next }));
document.addEventListener("workspace:enter", (event) => {
  const workspace = (event.detail || {}).workspace || store.get().workspace;
  store.patch({ workspace });
  for (const section of document.querySelectorAll(`main [data-workspace="${workspace}"]`)) {
    section.classList.remove("ws-enter");
    void section.offsetWidth;
    section.classList.add("ws-enter");
    section.addEventListener("animationend", () => section.classList.remove("ws-enter"), { once: true });
  }
});

router.init();
mountHero(ctx);
mountPlatform(ctx);
mountConveyor(ctx);
mountControlRoom(ctx);
mountGateLab(ctx);
mountDetector(ctx);
mountEvidence(ctx);
mountOps(ctx);
scrollChrome();
registerPwaShell();

await Promise.allSettled([
  settle(json(EVIDENCE_URL), (evidence) => store.patch({ evidence, evidenceError: null }), (msg) => store.patch({ evidence: null, evidenceError: msg })),
  settle(loadPlatformEventModel(), (platformEvents) => store.patch({ platformEvents, platformEventsError: null }), (msg) => store.patch({ platformEvents: null, platformEventsError: msg })),
  settle(loadPipelineModel(), (pipelines) => store.patch({ pipelines, pipelinesError: null }), (msg) => store.patch({ pipelines: null, pipelinesError: msg })),
  pollPlatform(),
]);

setInterval(() => { if (document.visibilityState === "visible") pollPlatform(); }, POLL_MS);
setInterval(heartbeat, TICK_MS);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pollPlatform(); });
