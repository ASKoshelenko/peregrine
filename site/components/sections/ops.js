import { createTimeline, observeOnce, reduced } from "../motion.js";
import { esc, lang, t } from "../i18n.js";
import { bindLive, fmtVal } from "../pipeline-model.js";
import { pains } from "../../data/content.js";

const byId = (id) => document.getElementById(id);
const HOP_MS = 600;
const say = (value, language) => (value ? String(value[language] ?? value.en ?? "") : "");

export function mountOps({ store, registry }) {
  mountPains(store);
  mountBoundaries(store);
  mountReveals();
  mountRoute(store, registry);
}

function mountReveals() {
  document.querySelectorAll(".ops-grid article, .method-grid .api-card").forEach((el, index) => {
    el.style.setProperty("--i", index);
    observeOnce(el, (node) => node.classList.add("in-view"), { threshold: 0.25 });
  });
}

function mountPains(store) {
  const host = byId("pain-list");
  function build() {
    const language = lang();
    host.innerHTML = pains.map((pain, index) => {
      const [title, problem, approach, link, question] = pain[language] || pain.en;
      return `<article class="pain-row" style="--i:${index}"><span>${String(index + 1).padStart(2, "0")}</span>`
        + `<div><h3>${esc(title)}</h3><p>${esc(problem)}</p></div>`
        + `<div><p>${esc(approach)}</p><a href="${esc(pain.href)}">${esc(link)} →</a></div>`
        + `<blockquote>${esc(question)}</blockquote></article>`;
    }).join("");
    host.querySelectorAll(".pain-row").forEach((row) => observeOnce(row, (node) => node.classList.add("in-view"), { threshold: 0.25 }));
  }
  store.subscribe(["language"], build);
  build();
}

function mountBoundaries(store) {
  const host = byId("boundaries");
  function build() {
    const run = store.get().evidence;
    if (!run?.boundaries) return;
    host.innerHTML = Object.entries(run.boundaries).map(([key, value], index) => `<div class="method-row" style="--i:${index}"><b>${esc(key)}</b><p>${esc(value)}</p></div>`).join("");
    host.querySelectorAll(".method-row").forEach((row) => observeOnce(row, (node) => node.classList.add("in-view"), { threshold: 0.25 }));
  }
  store.subscribe(["evidence", "language"], build);
  build();
}

function mountRoute(store, registry) {
  const host = byId("infra-route");
  const badge = byId("route-badge");
  let hops = [];
  let packet = null;
  let timeline = null;
  let armed = false;
  let lit = -1;

  const pipeline = () => (store.get().pipelines?.pipelines || []).find((entry) => entry.id === "runtime") || null;

  function build() {
    const runtime = pipeline();
    if (!runtime) return;
    const language = lang();
    host.innerHTML = `<ol class="route-lane">${runtime.stages.map((stage, index) => {
      const binds = bindLive(stage, registry());
      const value = binds.find((bind) => bind.value !== null);
      return `<li class="route-hop" style="--i:${index}"><button type="button" data-hop="${index}"><span>${String(index + 1).padStart(2, "0")}</span>`
        + `<b>${esc(say(stage.name, language))}</b><small>${esc(value ? `${say(value.label, language)} ${value.text}` : say(stage.artifact, language))}</small></button></li>`;
    }).join("")}</ol><i class="route-packet" aria-hidden="true"></i>`;
    hops = [...host.querySelectorAll(".route-hop")];
    packet = host.querySelector(".route-packet");
    packet.style.transition = reduced() ? "none" : `transform ${HOP_MS}ms ease-in-out`;
    if (!armed) { armed = true; observeOnce(host, () => ride(0), { threshold: 0.3 }); }
    if (lit >= 0) light(lit);
    paintState();
  }

  function light(index) {
    lit = index;
    hops.forEach((hop, at) => hop.classList.toggle("is-lit", at <= index));
    const hop = hops[index];
    if (!hop || !packet) return;
    const from = host.getBoundingClientRect();
    const to = hop.getBoundingClientRect();
    packet.style.transform = `translate(${Math.round(to.left - from.left)}px, ${Math.round(to.top - from.top)}px)`;
  }

  function ride(from) {
    if (!hops.length) return;
    if (timeline) timeline.cancel();
    timeline = createTimeline({
      surface: "#infra-route",
      scope: "story",
      cues: hops.slice(from).map((hop, offset) => ({ at: offset * HOP_MS, fire: () => light(from + offset) })),
    });
    timeline.play();
  }

  function tone(name, text) {
    badge.className = `route-badge tone-${name}`;
    badge.textContent = text;
  }

  function paintState() {
    const predict = store.get().predict;
    host.classList.toggle("is-live-request", predict.status === "pending");
    if (predict.status === "pending") { tone("live", t("liveRequestInFlight")); return; }
    if (predict.status === "error") { tone("block", t("inferenceFailed", { msg: predict.error || "" })); return; }
    if (predict.status === "done" && predict.result) { tone("live", `${t("hopOnnx")} · ${fmtVal("ms", predict.result.inference_ms)} ms`); return; }
    tone("defined", t("routeIdle"));
  }

  host.addEventListener("click", (event) => {
    const hop = event.target.closest("[data-hop]");
    if (hop) ride(Number(hop.dataset.hop));
  });
  store.subscribe(["pipelines", "predict", "platformRevision", "language"], (state, changed) => {
    build();
    if (changed.includes("predict") && state.predict.status === "done") ride(0);
  });
  build();
}
