import { esc, t } from "../i18n.js";
import { reduced } from "../motion.js";

const byId = (id) => document.getElementById(id);
const SAY_MS = 250;
const SHAKE_MS = 320;
const RESET_MS = 900;
const numeric = (gate) => typeof gate.budget === "number" && Number.isFinite(gate.budget);
const gateName = (gate) => { const key = `gate${gate.gate_id}Name`; const value = t(key); return value === key ? gate.name : value; };
const gateDetail = (gate) => { const key = `gate${gate.gate_id}Detail`; const value = t(key); return value === key ? gate.detail : value; };
const scaleOf = (gate) => Math.max(gate.budget * 2, Number(gate.measured) * 2) || 1;
const stepOf = (max) => (max < 1 ? 0.005 : max < 10 ? 0.1 : 1);

export function mountGateLab({ store }) {
  const controls = byId("gate-controls");
  const list = byId("gate-list");
  const card = byId("scenario-verdict");
  const strip = byId("verdict-strip");
  const stripValue = byId("verdict-strip-value");
  const stripNote = byId("verdict-strip-note");
  const status = byId("gate-status");
  const plain = byId("gate-plain");
  const lineage = byId("lineage-toggle");
  const reset = byId("reset-gates");
  let gates = [];
  let announced = "";
  let previous = "";
  let sayTimer = 0;

  const budgetOf = (gate) => {
    const chosen = store.get().gateScenario.budgets[gate.gate_id];
    return numeric(gate) && Number.isFinite(chosen) ? chosen : gate.budget;
  };

  function buildControls() {
    controls.innerHTML = gates.filter(numeric).map((gate) => {
      const max = scaleOf(gate);
      const step = stepOf(max);
      return `<label class="gate-control" for="budget-${esc(gate.gate_id)}"><span><b>${esc(gate.gate_id)}</b>${esc(gateName(gate))}</span>`
        + `<output id="out-${esc(gate.gate_id)}">${esc(String(budgetOf(gate)))}</output>`
        + `<input id="budget-${esc(gate.gate_id)}" data-gate="${esc(gate.gate_id)}" type="range" min="${step}" max="${max}" step="${step}" value="${budgetOf(gate)}" /></label>`;
    }).join("");
  }

  function buildRows() {
    list.innerHTML = gates.map((gate, index) => {
      const rows = numeric(gate)
        ? `<div class="gate-values"><span>${esc(String(gate.measured))}</span><small data-budget>≤ ${esc(String(gate.budget))}</small></div>`
          + `<div class="gate-meter" role="meter" aria-valuemin="0" aria-valuemax="${scaleOf(gate)}" aria-valuenow="${esc(gate.measured)}" aria-label="${esc(gate.gate_id)} ${esc(gateName(gate))}" style="--measured:${(gate.measured / scaleOf(gate)).toFixed(3)}"><i class="gate-budget"></i><i class="gate-measure"></i></div>`
        : `<div class="gate-values gate-values-text"><span data-lineage>${esc(t("lineagePinned"))}</span></div>`;
      return `<article class="gate-row" data-gate="${esc(gate.gate_id)}" style="--i:${index}"><span class="gate-mark" aria-hidden="true"></span>`
        + `<div class="gate-head"><b>${esc(gate.gate_id)} · ${esc(gateName(gate))}</b><small>${esc(gateDetail(gate))}</small></div><strong></strong>${rows}</article>`;
    }).join("");
  }

  function say(text) {
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { if (text !== announced) { status.textContent = text; announced = text; } }, SAY_MS);
  }

  function paint() {
    if (!gates.length) return;
    const scenario = store.get().gateScenario;
    const results = gates.map((gate) => {
      const budget = budgetOf(gate);
      const passed = numeric(gate) ? Number(gate.measured) <= budget : scenario.lineage;
      return { gate, budget, passed };
    });
    const failed = results.filter((result) => !result.passed);
    const verdict = failed.length ? "BLOCK" : "PROMOTE";
    for (const result of results) {
      const row = list.querySelector(`[data-gate="${result.gate.gate_id}"]`);
      if (!row) continue;
      row.classList.toggle("gate-pass", result.passed);
      row.classList.toggle("gate-block", !result.passed);
      row.querySelector(".gate-mark").textContent = result.passed ? "✓" : "×";
      row.querySelector("strong").textContent = result.passed ? "PASS" : "BLOCK";
      const meter = row.querySelector(".gate-meter");
      if (meter) {
        meter.style.setProperty("--budget-frac", (result.budget / scaleOf(result.gate)).toFixed(3));
        meter.setAttribute("aria-valuetext", `${result.gate.measured} ≤ ${result.budget}`);
        row.querySelector("[data-budget]").textContent = `≤ ${result.budget}`;
      }
      const output = byId(`out-${result.gate.gate_id}`);
      if (output) output.textContent = String(result.budget);
      const text = row.querySelector("[data-lineage]");
      if (text) text.textContent = t(result.passed ? "lineagePinned" : "lineageMissing");
    }
    card.className = `verdict-card ${failed.length ? "verdict-block" : "verdict-pass"}`;
    const strong = card.querySelector("strong");
    strong.textContent = verdict;
    card.querySelector("p").textContent = failed.length ? t("firstRefusal", { q: `${failed[0].gate.gate_id} · ${gateName(failed[0].gate)}` }) : t("allBudgetsAccept");
    stripValue.textContent = verdict;
    stripNote.textContent = failed.length ? t("firstRefusal", { q: failed[0].gate.gate_id }) : t("allBudgetsAccept");
    const touched = Object.keys(scenario.budgets).length > 0 || scenario.lineage === false;
    plain.textContent = !touched ? "" : failed.length ? t("plain.gateBlock", { q: failed[0].gate.gate_id }) : t("plain.gatePass");
    strip.classList.toggle("verdict-block", failed.length > 0);
    strip.classList.toggle("verdict-pass", failed.length === 0);
    if (previous === "PROMOTE" && verdict === "BLOCK" && !reduced()) {
      strong.classList.remove("is-shake");
      void strong.offsetWidth;
      strong.classList.add("is-shake");
      setTimeout(() => strong.classList.remove("is-shake"), SHAKE_MS);
    }
    previous = verdict;
    say(failed.length ? t("verdictStatus", { verdict, q: failed[0].gate.gate_id }) : `${verdict} — ${t("allBudgetsAccept")}`);
  }

  function build() {
    const run = store.get().evidence;
    if (!run?.release_verdict?.gates) return;
    gates = run.release_verdict.gates;
    buildControls();
    buildRows();
    lineage.checked = store.get().gateScenario.lineage !== false;
    paint();
  }

  function fail(message) {
    card.className = "verdict-card";
    plain.textContent = "";
    card.querySelector("strong").textContent = "—";
    card.querySelector("p").textContent = `${t("scenarioUnavailable")} · ${t("evidenceRequired")} ${message}`;
  }

  controls.addEventListener("input", (event) => {
    const input = event.target.closest("input[data-gate]");
    if (!input) return;
    const scenario = store.get().gateScenario;
    store.patch({ gateScenario: { ...scenario, budgets: { ...scenario.budgets, [input.dataset.gate]: Number(input.value) } } });
  });
  lineage.addEventListener("change", () => {
    const scenario = store.get().gateScenario;
    store.patch({ gateScenario: { ...scenario, lineage: lineage.checked } });
  });
  reset.addEventListener("click", () => {
    store.patch({ gateScenario: { budgets: {}, lineage: true } });
    lineage.checked = true;
    for (const gate of gates.filter(numeric)) { const input = byId(`budget-${gate.gate_id}`); if (input) input.value = String(gate.budget); }
    list.classList.add("is-reset");
    setTimeout(() => list.classList.remove("is-reset"), RESET_MS);
  });

  if (typeof IntersectionObserver === "function") {
    const seen = new Map();
    const watch = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target, entry.isIntersecting);
      strip.classList.toggle("is-shown", seen.get(list) === true && seen.get(card) === false);
    }, { rootMargin: "-72px 0px 0px 0px" });
    watch.observe(card);
    watch.observe(list);
  }

  store.subscribe(["gateScenario"], paint);
  store.subscribe(["evidence", "language"], build);
  store.subscribe(["evidenceError"], (state) => { if (state.evidenceError) fail(state.evidenceError); });
  build();
}
