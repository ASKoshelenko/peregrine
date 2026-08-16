import { applyStatic, esc, t } from "../i18n.js";
import { fmtVal, truthChip } from "../pipeline-model.js";
import { layerOrder, platformLayers } from "../../data/content.js";

const byId = (id) => document.getElementById(id);
const STEP = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
const SAY_MS = 200;

export function mountPlatform({ store }) {
  const spine = byId("platform-spine");
  const detail = byId("platform-detail");
  const status = byId("platform-status");
  const tabs = [...spine.querySelectorAll(".platform-node")];
  if (!tabs.length) return;
  let sayTimer = 0;

  detail.innerHTML = `<div class="live-deployment" id="live-strip" hidden></div>`
    + `<p class="panel-label" data-i18n="selectedLayer">SELECTED LAYER</p><h3 id="layer-title"></h3><p id="layer-body"></p>`
    + `<dl><div><dt data-i18n="emits">Emits</dt><dd id="layer-emits"></dd></div><div><dt data-i18n="control">Control</dt><dd id="layer-control"></dd></div></dl>`;
  applyStatic(detail);
  const strip = byId("live-strip");
  const title = byId("layer-title");
  const body = byId("layer-body");
  const emits = byId("layer-emits");
  const control = byId("layer-control");

  const activeLayer = () => store.get().activeLayer || layerOrder[0];

  function say(text) {
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { status.textContent = text; }, SAY_MS);
  }

  function paintLayer() {
    const id = activeLayer();
    const keys = platformLayers[id] || platformLayers[layerOrder[0]];
    const index = Math.max(0, layerOrder.indexOf(id));
    tabs.forEach((tab) => {
      const on = tab.dataset.layer === id;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    detail.setAttribute("aria-labelledby", `layer-tab-${id}`);
    title.textContent = t(keys.title);
    body.textContent = t(keys.body);
    emits.textContent = t(keys.emits);
    control.textContent = t(keys.control);
    say(t("layerStatus", { n: index + 1, total: layerOrder.length, name: t(keys.title) }));
  }

  function paintLive() {
    const state = store.get();
    const live = state.platform;
    if (!live && !state.platformError) { strip.hidden = true; strip.innerHTML = ""; return; }
    strip.hidden = false;
    strip.classList.toggle("is-offline", !live);
    strip.innerHTML = live
      ? `<i class="live-dot" aria-hidden="true"></i>${truthChip("LIVE")}<b>${esc(live.service)} · ${esc(live.revision)}</b><code>${esc(fmtVal("hash12", live.image_digest))}</code><small data-checked-since></small>`
      : `<span>OFFLINE</span><b>${esc(t("liveOffline"))}</b>`;
    applyStatic(strip);
  }

  const select = (id, focus) => {
    if (!platformLayers[id]) return;
    store.patch({ activeLayer: id });
    if (focus) spine.querySelector(`[data-layer="${id}"]`)?.focus();
  };

  spine.addEventListener("click", (event) => {
    const tab = event.target.closest(".platform-node");
    if (tab) select(tab.dataset.layer, false);
  });
  spine.addEventListener("keydown", (event) => {
    const at = tabs.findIndex((tab) => tab === event.target.closest(".platform-node"));
    if (at < 0) return;
    if (STEP[event.key]) { select(layerOrder[Math.min(tabs.length - 1, Math.max(0, at + STEP[event.key]))], true); event.preventDefault(); }
    else if (event.key === "Home") { select(layerOrder[0], true); event.preventDefault(); }
    else if (event.key === "End") { select(layerOrder[layerOrder.length - 1], true); event.preventDefault(); }
  });

  store.subscribe(["activeLayer", "language"], paintLayer);
  store.subscribe(["platformRevision", "platformError", "language"], paintLive);
  paintLayer();
  paintLive();
}
