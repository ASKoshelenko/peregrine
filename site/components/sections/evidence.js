import { renderLane } from "../lane.js";
import { observeOnce } from "../motion.js";
import { esc, lang, t } from "../i18n.js";
import { fmtVal } from "../pipeline-model.js";
import { fleetLanes, fleetTargets } from "../../data/content.js";

const byId = (id) => document.getElementById(id);
const OBSERVE_SOURCE = "Makefile#L18-L23 + dvc.yaml#L2-L9";
const FLEET_SOURCE = "artifacts/observed/latest.json + configs/targets/matrix.yaml#L5-L9";
const COPY_MS = 1500;
const frac = (value, max) => (max > 0 ? Math.min(1, Number(value) / max).toFixed(3) : "0");

export function mountEvidence({ store, registry }) {
  mountFanIn(store, registry);
  mountChain(store);
  mountFleet(store);
}

function mountFanIn(store, registry) {
  const host = byId("trace-fanin");
  const cite = byId("trace-fanin-cite");
  let handle = null;

  function build() {
    const model = (store.get().pipelines?.pipelines || []).find((pipeline) => pipeline.id === "model");
    const observe = model?.stages.find((stage) => stage.id === "observe");
    if (!observe) return;
    if (handle) handle.destroy();
    handle = renderLane(host, { ...model, stages: [{ ...observe, lane: null }] }, {
      mode: "fanin",
      chips: observe.fragments || [],
      lang: lang(),
      registry: registry(),
      reach: false,
      scope: "evidence",
      surface: "#trace-fanin",
    });
    for (const item of host.querySelectorAll(".lane-chip-item .lane-drawer-inner")) {
      const value = item.querySelector("code")?.textContent || "";
      item.insertAdjacentHTML("beforeend", `<button class="copy-button" type="button" data-copy="${esc(value)}">${esc(t("copy"))}</button>`);
    }
    cite.textContent = t("sourceLine", { path: OBSERVE_SOURCE, field: "observe" });
  }

  host.addEventListener("click", (event) => copy(event.target.closest(".copy-button")));
  store.subscribe(["pipelines", "evidence", "language"], build);
  build();
}

async function copy(button) {
  if (!button || !button.dataset.copy) return;
  try { await navigator.clipboard.writeText(button.dataset.copy); } catch { return; }
  button.textContent = t("copied");
  setTimeout(() => { button.textContent = t("copy"); }, COPY_MS);
}

function mountChain(store) {
  const chain = byId("trace-chain");

  function build() {
    const run = store.get().evidence;
    if (!run) return;
    const lineage = run.lineage || {};
    const items = [
      [t("traceRun"), run.run_id], [t("traceConfig"), lineage.config_sha256], [t("traceDataset"), lineage.dataset_fingerprint],
      [t("traceCalibration"), lineage.calibration_hash], [t("traceBudgetCommit"), lineage.budget_commit], [t("traceSourceCommit"), lineage.source_commit], [t("traceWandb"), lineage.wandb_run],
    ];
    chain.innerHTML = items.map(([label, value], index) => `<details style="--i:${index}"${index === 0 ? " open" : ""}><summary><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(label)}</b><code>${esc(fmtVal("hash12", value))}</code></summary>`
      + `<div><code>${esc(value || "—")}</code><button class="copy-button" type="button" data-copy="${esc(value || "")}">${esc(t("copy"))}</button></div></details>`).join("");
    observeOnce(chain, (el) => el.classList.add("in-view"), { threshold: 0.2 });
  }

  chain.addEventListener("click", (event) => copy(event.target.closest(".copy-button")));
  store.subscribe(["evidence", "language"], build);
  build();
}

function mountFleet(store) {
  const body = byId("fleet-body");
  const cite = byId("fleet-cite");

  function build() {
    const run = store.get().evidence;
    if (!run?.targets) return;
    const gates = run.release_verdict?.gates || [];
    const budgetOf = (id) => gates.find((gate) => gate.gate_id === id)?.budget;
    const p95Budget = { x86_tflite_int8: budgetOf("Q2"), arm64_tflite_int8: budgetOf("Q3") };
    const sizeBudget = budgetOf("Q4");
    const values = Object.values(run.targets);
    const latencyMax = Math.max(...values.map((target) => target.p95_ms || 0), ...Object.values(p95Budget).map((value) => Number(value) || 0));
    const sizeMax = Math.max(...values.map((target) => target.size_mb || 0), Number(sizeBudget) || 0);
    body.innerHTML = Object.entries(run.targets).map(([id, target], index) => {
      const laneKey = fleetLanes[target.lane];
      const tick = p95Budget[id] === undefined ? "" : `<i class="bar-tick" style="--tick:${frac(p95Budget[id], latencyMax)}"></i>`;
      const sizeTick = id.includes("int8") && sizeBudget !== undefined ? `<i class="bar-tick" style="--tick:${frac(sizeBudget, sizeMax)}"></i>` : "";
      return `<tr style="--i:${index}"><th scope="row">${esc(fleetTargets[id] || id)}<small>${esc(target.host?.runtime_name || "—")} ${esc(target.host?.runtime_version || "")}</small></th>`
        + `<td><span class="lane lane-${esc(target.lane)}">${esc(laneKey ? t(laneKey) : target.lane)}</span>${id === "arm64_tflite_int8" ? `<small>${esc(t("trendLaneNote"))}</small>` : ""}</td>`
        + `<td>${esc(fmtVal("map4", target.map50_proxy))}</td>`
        + `<td><b>${esc(fmtVal("ms", target.p50_ms))} ms</b><i class="bar" style="--frac:${frac(target.p50_ms, latencyMax)}"></i></td>`
        + `<td><b>${esc(fmtVal("ms", target.p95_ms))} ms</b><i class="bar" style="--frac:${frac(target.p95_ms, latencyMax)}"></i>${tick}</td>`
        + `<td><b>${esc(fmtVal("mb", target.size_mb))} MB</b><i class="bar" style="--frac:${frac(target.size_mb, sizeMax)}"></i>${sizeTick}</td></tr>`;
    }).join("");
    cite.textContent = t("sourceLine", { path: FLEET_SOURCE, field: "targets" });
    observeOnce(body, (el) => el.classList.add("in-view"), { threshold: 0.2 });
  }

  store.subscribe(["evidence", "language"], build);
  build();
}
