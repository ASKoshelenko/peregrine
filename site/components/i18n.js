import { en } from "../data/i18n.en.js";
import { uk } from "../data/i18n.uk.js";

const DICTS = { en, uk };
const STORAGE_KEY = "peregrine-language";
const listeners = new Set();
const escaper = document.createElement("div");
let current = detect();

function detect() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { saved = null; }
  if (saved && DICTS[saved]) return saved;
  return navigator.language && navigator.language.startsWith("uk") ? "uk" : "en";
}

const walk = (dict, key) => key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), dict);
const fill = (value, params) => value.replace(/\{(\w+)\}/g, (token, slot) => (params[slot] == null ? token : String(params[slot])));

export const lang = () => current;

export function t(key, params) {
  const value = walk(DICTS[current], key) ?? walk(DICTS.en, key);
  if (typeof value !== "string") return key;
  return params ? fill(value, params) : value;
}

export function esc(value) {
  escaper.textContent = value == null ? "" : String(value);
  return escaper.innerHTML.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function onChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function setLang(next) {
  if (!DICTS[next] || next === current) return current;
  current = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode keeps the session language only */ }
  document.documentElement.lang = next;
  applyStatic(document);
  listeners.forEach((callback) => callback(next));
  document.dispatchEvent(new CustomEvent("language:change", { detail: { lang: next } }));
  return current;
}

export const toggle = () => setLang(current === "en" ? "uk" : "en");

function each(scope, selector, apply) {
  if (scope.matches && scope.matches(selector)) apply(scope);
  scope.querySelectorAll(selector).forEach(apply);
}

export function applyStatic(root = document) {
  const scope = root === document ? document.documentElement : root;
  each(scope, "[data-i18n]", (node) => { node.textContent = t(node.dataset.i18n); });
  each(scope, "[data-i18n-html]", (node) => { node.innerHTML = t(node.dataset.i18nHtml); });
  each(scope, "[data-i18n-aria]", (node) => { node.setAttribute("aria-label", t(node.dataset.i18nAria)); });
  each(scope, "[data-i18n-alt]", (node) => { node.setAttribute("alt", t(node.dataset.i18nAlt)); });
  if (scope === document.documentElement) {
    document.documentElement.lang = current;
    document.title = t("docTitle");
  }
}
