import { reduced } from "./motion.js";

const NAV_LINKS = ".topbar nav a, #workspace-tabs a, .mobile-actions a";
const DEFAULT_ID = "top";
let currentId = "";
let currentWorkspace = "";
let booted = false;
let bound = false;

const workspaceOf = (el) => (el && el.closest ? el.closest("[data-workspace]") : null)?.dataset.workspace || "";

export function current() { return { id: currentId, workspace: currentWorkspace }; }

function syncNav(id, workspace) {
  const links = [...document.querySelectorAll(NAV_LINKS)].filter((link) => (link.getAttribute("href") || "").startsWith("#"));
  const exact = links.filter((link) => link.getAttribute("href").slice(1) === id);
  const marked = new Set(exact.length ? exact : links.filter((link) => workspaceOf(document.getElementById(link.getAttribute("href").slice(1))) === workspace));
  for (const link of links) {
    const on = marked.has(link);
    link.classList.toggle("is-current", on);
    if (on) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
}

export function activate(id, { push = false, scroll = true, focus = true } = {}) {
  const target = document.getElementById(id) || document.getElementById(DEFAULT_ID);
  if (!target) return null;
  const workspace = workspaceOf(target) || currentWorkspace || "story";
  const switching = workspace !== currentWorkspace;
  if (switching && currentWorkspace) document.dispatchEvent(new CustomEvent("workspace:leave", { detail: { workspace: currentWorkspace, id: currentId, next: workspace } }));
  document.body.dataset.workspace = workspace;
  for (const section of document.querySelectorAll("[data-workspace]")) if (section !== document.body) section.hidden = section.dataset.workspace !== workspace;
  syncNav(target.id, workspace);
  const first = !booted;
  currentId = target.id;
  currentWorkspace = workspace;
  booted = true;
  if (push) {
    const hash = `#${target.id}`;
    const entry = { id: target.id, workspace };
    if (location.hash === hash) history.replaceState(entry, "", hash);
    else history.pushState(entry, "", hash);
  }
  if (focus) {
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  if (scroll) requestAnimationFrame(() => target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }));
  if (switching || first) document.dispatchEvent(new CustomEvent("workspace:enter", { detail: { workspace, id: target.id, first } }));
  return target;
}

export function toTop(wordmark = ".wordmark") {
  window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
  const mark = document.querySelector(wordmark);
  if (mark) mark.focus({ preventScroll: true });
}

function onClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href^='#']");
  if (!link || link.classList.contains("skip")) return;
  const id = link.getAttribute("href").slice(1);
  if (!id || !document.getElementById(id)) return;
  event.preventDefault();
  activate(id, { push: true });
}

function onPopState(event) {
  const id = (event.state && event.state.id) || location.hash.slice(1) || DEFAULT_ID;
  activate(id, { push: false });
}

export function init({ backToTop = "#back-to-top", wordmark = ".wordmark" } = {}) {
  if (!bound) {
    bound = true;
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    const button = backToTop && document.querySelector(backToTop);
    if (button && !button.dataset.routerBound) {
      button.dataset.routerBound = "1";
      button.addEventListener("click", (event) => { event.preventDefault(); toTop(wordmark); });
    }
  }
  const target = activate(location.hash.slice(1) || DEFAULT_ID, { push: false, scroll: false });
  history.replaceState({ id: currentId, workspace: currentWorkspace }, "");
  return target;
}
