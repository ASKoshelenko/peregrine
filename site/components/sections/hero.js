import { countUp, observeOnce, reduced } from "../motion.js";
import { esc, t } from "../i18n.js";
import { fmtVal } from "../pipeline-model.js";

const byId = (id) => document.getElementById(id);
const ratio = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b > 0 ? (a / b).toFixed(1) : null);

function metrics(run) {
  const onnx = run.targets?.x86_onnx_fp32;
  const int8 = run.targets?.x86_tflite_int8;
  const verdict = run.release_verdict || {};
  const drop = onnx && int8 ? fmtVal("map4", onnx.map50_proxy - int8.map50_proxy) : null;
  const smaller = onnx && int8 ? ratio(onnx.size_mb, int8.size_mb) : null;
  return [
    { label: t("metricQuality"), value: onnx && int8 ? `${fmtVal("map4", onnx.map50_proxy)} → ${fmtVal("map4", int8.map50_proxy)}` : "—", note: drop ? t("metricQuantCost", { v: drop }) : t("noSubstitution") },
    { label: t("metricP95"), value: int8 ? `${fmtVal("ms", int8.p95_ms)} ms` : "—", note: int8 ? t("metricProtocol") : t("noSubstitution") },
    { label: t("metricInt8"), value: int8 ? `${fmtVal("mb", int8.size_mb)} MB` : "—", note: smaller ? t("metricSmaller", { n: smaller }) : t("noSubstitution") },
    { label: t("metricVerdict"), value: verdict.passed === undefined ? "—" : verdict.passed ? "PROMOTE" : "BLOCK", note: verdict.gates ? t("metricGates", { n: verdict.gates.length }) : t("noSubstitution") },
  ];
}

export function mountHero({ store }) {
  const host = byId("metrics");
  const verdictEl = byId("hero-verdict");
  const stamp = byId("evidence-stamp");
  const footerRun = byId("footer-run");
  const steps = [...document.querySelectorAll(".qualification li")];
  let seen = false;
  let painted = false;

  const animate = () => {
    if (!seen || !painted) return;
    const values = [...host.querySelectorAll(".metric strong")];
    values.forEach((el, index) => countUp(el, el.textContent, { ms: 700, delay: index * 120 }));
    steps.forEach((item) => item.classList.add("in-view"));
    if (!reduced()) {
      verdictEl.classList.remove("is-pop");
      setTimeout(() => verdictEl.classList.add("is-pop"), values.length * 120);
    }
  };

  const paint = () => {
    const state = store.get();
    const run = state.evidence;
    if (!run) return;
    host.innerHTML = metrics(run).map((item, index) => `<article class="metric" style="--i:${index}"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong><small>${esc(item.note)}</small></article>`).join("");
    const passed = run.release_verdict?.passed;
    verdictEl.textContent = passed === undefined ? "—" : passed ? "PROMOTE" : "BLOCK";
    verdictEl.className = passed === undefined ? "" : passed ? "pass" : "block";
    stamp.textContent = t("evidenceStamp", { run: run.run_id || "—", date: String(run.observed_at || "").slice(0, 10) || "—", basis: run.accuracy_basis || "—" });
    footerRun.textContent = t("footerRun", { run: run.run_id || "—" });
    painted = true;
    animate();
  };

  const fail = (message) => {
    host.innerHTML = `<article class="metric" style="--i:0"><span>${esc(t("evidenceUnavailable"))}</span><strong>—</strong><small>${esc(t("noSubstitution"))}</small></article>`;
    stamp.textContent = t("evidenceNotLoaded", { msg: message });
    footerRun.textContent = t("footerRun", { run: "—" });
  };

  observeOnce(document.getElementById("top"), () => { seen = true; animate(); }, { threshold: 0.2 });
  store.subscribe(["evidence", "language"], paint);
  store.subscribe(["evidenceError"], (state) => { if (state.evidenceError) fail(state.evidenceError); });
  paint();
}
