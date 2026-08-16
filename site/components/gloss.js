import { en } from "../data/i18n.en.js";
import { esc, t } from "./i18n.js";

const STORAGE_KEY = "peregrine-explain";
const EDGE = 8;
const GAP = 8;
const IDS = Object.keys(en.gloss);
const byId = (id) => document.getElementById(id);
let pop = null;
let live = null;
let trigger = null;
let booted = false;

export const glossMark = (id, text) => `<button type="button" class="gloss" data-g="${esc(id)}">${esc(text)}</button>`;

function shell() {
  if (pop) return pop;
  pop = document.createElement("div");
  pop.id = "gloss-pop";
  pop.hidden = true;
  pop.setAttribute("aria-hidden", "true");
  pop.innerHTML = '<b class="gloss-term"></b><p class="gloss-body"></p>';
  live = document.createElement("p");
  live.className = "sr-only";
  live.setAttribute("aria-live", "polite");
  document.body.append(pop, live);
  return pop;
}

function place(anchor) {
  const rect = anchor.getBoundingClientRect();
  pop.style.left = `${EDGE}px`;
  pop.style.top = "0px";
  const box = pop.getBoundingClientRect();
  const under = window.innerHeight - rect.bottom - GAP >= box.height;
  const top = under ? rect.bottom + GAP : Math.max(EDGE, rect.top - GAP - box.height);
  const left = Math.min(Math.max(EDGE, rect.left), Math.max(EDGE, window.innerWidth - box.width - EDGE));
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

function close(refocus = false) {
  if (!trigger) return false;
  const last = trigger;
  trigger = null;
  last.setAttribute("aria-expanded", "false");
  pop.classList.remove("is-open");
  pop.hidden = true;
  live.textContent = "";
  if (refocus) last.focus({ preventScroll: true });
  return true;
}

function open(anchor) {
  const id = anchor.dataset.g;
  const term = t(`gloss.${id}.term`);
  const short = t(`gloss.${id}.short`);
  close();
  if (term === `gloss.${id}.term` || short === `gloss.${id}.short`) return;
  shell();
  pop.querySelector(".gloss-term").textContent = term;
  pop.querySelector(".gloss-body").textContent = short;
  pop.hidden = false;
  place(anchor);
  trigger = anchor;
  anchor.setAttribute("aria-expanded", "true");
  live.textContent = `${term} — ${short}`;
  pop.classList.add("is-open");
}

const onClick = (event) => {
  const anchor = event.target.closest ? event.target.closest("[data-g]") : null;
  if (!anchor) return;
  event.preventDefault();
  if (anchor === trigger) close(); else open(anchor);
};
const onDown = (event) => { if (trigger && event.target.closest && !event.target.closest("[data-g],#gloss-pop")) close(); };
const onKey = (event) => { if (event.key === "Escape" && close(true)) event.stopPropagation(); };
const onDismiss = () => close();

const readFlag = () => { try { return localStorage.getItem(STORAGE_KEY) === "on"; } catch { return false; } };
const writeFlag = (on) => { try { localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch { /* private mode keeps the session preference only */ } };

function applyExplain(on, button) {
  document.documentElement.dataset.explain = on ? "on" : "off";
  if (button) button.setAttribute("aria-pressed", String(on));
  for (const card of document.querySelectorAll("details.explain-card")) card.open = on;
}

export function renderGlossary(host = byId("glossary")) {
  if (!host) return;
  const rows = [];
  for (const id of IDS) {
    const term = document.createElement("dt");
    term.textContent = t(`gloss.${id}.term`);
    const body = document.createElement("dd");
    body.textContent = t(`gloss.${id}.short`);
    rows.push(term, body);
  }
  host.replaceChildren(...rows);
}

export function initGloss() {
  if (booted) return;
  booted = true;
  shell();
  const button = byId("explain-toggle");
  let on = readFlag();
  applyExplain(on, button);
  if (button) button.addEventListener("click", () => { on = !on; writeFlag(on); applyExplain(on, button); });
  document.addEventListener("click", onClick);
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("scroll", onDismiss, { capture: true, passive: true });
  window.addEventListener("resize", onDismiss);
  document.addEventListener("language:change", () => { close(); renderGlossary(); });
  document.addEventListener("workspace:leave", onDismiss);
  renderGlossary();
}
