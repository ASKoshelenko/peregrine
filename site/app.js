const EVIDENCE_URL = "/artifacts/observed/latest.json";
const API_BASE = window.PEREGRINE_API_BASE || "";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const pains = [
  ["The INT8 accuracy cliff", "A checkpoint passes evaluation; conversion quietly changes the answer.", "Version calibration membership and gate the converted model.", "Open Q1 in the Gate Lab", "Which target bites you hardest today—TFLite, TensorRT or the DSP?"],
  ["Research → production", "A notebook and a checkpoint are not an operational handoff.", "Ship a package, resolved config, fingerprints and an explicit serving contract.", "Trace the run lineage", "What does a handoff artifact look like in your team today?"],
  ["A heterogeneous fleet", "Runtime and delegate updates change what executes where.", "Keep a target matrix with separate quality, latency and size budgets.", "Compare the device lanes", "What re-validates models when a runtime changes?"],
  ["The dataset keeps moving", "Relabels break comparison even when no new image appears.", "Version snapshots, label space and calibration membership together.", "Inspect the dataset fingerprint", "Does a label-only change force a re-baseline today?"],
  ["January cannot be reproduced", "Configs become folklore and dashboards drift.", "Materialize the full config and bind it to model, dataset and environment hashes.", "Open the evidence chain", "Could January's run be rebuilt from its config alone?"],
  ["Queues, quotas and the bill", "Compute availability fails exactly when a release needs proof.", "Register the question and cost bound before allocating a run; retain failed attempts.", "Read the Vertex run ledger", "Who owns the training bill—and has quota blocked a deadline?"],
];

let evidence;
let selectedFile;
let previewUrl;
const $ = (selector) => document.querySelector(selector);
const fmt = (value, digits = 1) => value == null ? "—" : Number(value).toFixed(digits);
const short = (value) => value ? `${value.slice(0, 12)}…` : "—";

function metric(value, label, note) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

async function loadEvidence() {
  const response = await fetch(EVIDENCE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`evidence HTTP ${response.status}`);
  return response.json();
}

function renderEvidence(run) {
  const onnx = run.targets.x86_onnx_fp32;
  const int8 = run.targets.x86_tflite_int8;
  const drop = onnx.map50_proxy - int8.map50_proxy;
  $("#metrics").innerHTML = [
    metric(`${fmt(onnx.map50_proxy, 4)} → ${fmt(int8.map50_proxy, 4)}`, "Held-out mAP@0.50", `quantization cost ${fmt(drop, 4)}`),
    metric(`${fmt(int8.p95_ms)} ms`, "x86 INT8 p95", "100 measured invocations"),
    metric(`${fmt(int8.size_mb, 2)} MB`, "INT8 artifact", `${fmt(onnx.size_mb / int8.size_mb, 1)}× smaller than ONNX`),
    metric(run.release_verdict.passed ? "PROMOTE" : "BLOCK", "Observed verdict", `${run.release_verdict.gates.length} committed gates`),
  ].join("");
  $("#hero-verdict").textContent = run.release_verdict.passed ? "PROMOTE" : "BLOCK";
  $("#hero-verdict").className = run.release_verdict.passed ? "pass" : "block";
  $("#evidence-stamp").textContent = `${run.run_id} · ${run.accuracy_basis}`;
  $("#footer-run").textContent = `run ${run.run_id}`;
  renderGateLab(run);
  renderTrace(run);
  renderFleet(run);
  renderBoundaries(run);
}

function renderMissingEvidence(error) {
  $("#metrics").innerHTML = metric("—", "Evidence unavailable", "No observed number is substituted");
  $("#evidence-stamp").textContent = `Evidence not loaded: ${error.message}`;
  $("#scenario-verdict").innerHTML = "<span>Scenario unavailable</span><strong>—</strong><p>Observed evidence is required.</p>";
}

function renderGateLab(run) {
  const numeric = run.release_verdict.gates.filter((gate) => typeof gate.budget === "number");
  $("#gate-controls").innerHTML = numeric.map((gate) => {
    const max = Math.max(gate.budget * 2, gate.measured * 2);
    const step = max < 1 ? 0.005 : max < 10 ? 0.1 : 1;
    return `<label class="gate-control" for="budget-${gate.gate_id}"><span><b>${gate.gate_id}</b>${gate.name}</span><output id="out-${gate.gate_id}">${gate.budget}</output><input id="budget-${gate.gate_id}" data-gate="${gate.gate_id}" type="range" min="${step}" max="${max}" step="${step}" value="${gate.budget}" /></label>`;
  }).join("");
  $("#gate-controls").querySelectorAll("input").forEach((input) => input.addEventListener("input", updateScenario));
  $("#lineage-toggle").addEventListener("change", updateScenario);
  $("#reset-gates").addEventListener("click", () => {
    numeric.forEach((gate) => { $(`#budget-${gate.gate_id}`).value = gate.budget; });
    $("#lineage-toggle").checked = true;
    updateScenario();
  });
  updateScenario();
}

function updateScenario() {
  if (!evidence) return;
  const results = evidence.release_verdict.gates.map((gate) => {
    const control = $(`#budget-${gate.gate_id}`);
    const budget = control ? Number(control.value) : gate.budget;
    const passed = gate.gate_id === "Q5" ? $("#lineage-toggle").checked : gate.measured <= budget;
    if (control) $(`#out-${gate.gate_id}`).textContent = budget;
    return { ...gate, budget, passed };
  });
  const failed = results.filter((gate) => !gate.passed);
  $("#gate-list").innerHTML = results.map((gate) => `<article class="gate-row ${gate.passed ? "gate-pass" : "gate-block"}"><span class="gate-mark" aria-hidden="true">${gate.passed ? "✓" : "×"}</span><div><b>${gate.gate_id} · ${gate.name}</b><small>${gate.detail}</small></div><div class="gate-values"><span>${gate.measured}</span><small>≤ ${gate.budget}</small></div><strong>${gate.passed ? "PASS" : "BLOCK"}</strong></article>`).join("");
  $("#scenario-verdict").className = `verdict-card ${failed.length ? "verdict-block" : "verdict-pass"}`;
  $("#scenario-verdict").innerHTML = `<span>Scenario simulation</span><strong>${failed.length ? "BLOCK" : "PROMOTE"}</strong><p>${failed.length ? `First refusal: ${failed[0].gate_id} · ${failed[0].name}` : "Every hypothetical budget accepts the observed measurements."}</p>`;
}

function renderTrace(run) {
  const items = [["Run", run.run_id], ["Model config", run.lineage.config_sha256], ["Dataset", run.lineage.dataset_fingerprint], ["Calibration", run.lineage.calibration_hash], ["Budget commit", run.lineage.budget_commit], ["Source commit", run.lineage.source_commit], ["W&B", run.lineage.wandb_run]];
  $("#trace-chain").innerHTML = items.map(([label, value], index) => `<details ${index === 0 ? "open" : ""}><summary><span>${String(index + 1).padStart(2, "0")}</span><b>${label}</b><code>${short(value)}</code></summary><div><code>${value || "—"}</code><button type="button" data-copy="${value || ""}">Copy</button></div></details>`).join("");
  $("#trace-chain").querySelectorAll("button").forEach((button) => button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.dataset.copy);
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = "Copy"; }, 1500);
  }));
}

function renderFleet(run) {
  const labels = { x86_onnx_fp32: "x86 · ONNX · FP32", x86_tflite_int8: "x86 · TFLite · INT8", arm64_tflite_int8: "ARM64 · TFLite · INT8" };
  $("#fleet-body").innerHTML = Object.entries(run.targets).map(([key, target]) => `<tr><th>${labels[key] || key}<small>${target.host.runtime_name} ${target.host.runtime_version}</small></th><td><span class="lane lane-${target.lane}">${target.lane}</span></td><td>${fmt(target.map50_proxy, 4)}</td><td>${fmt(target.p50_ms)} ms</td><td>${fmt(target.p95_ms)} ms</td><td>${fmt(target.size_mb, 2)} MB</td></tr>`).join("");
}

function renderBoundaries(run) {
  $("#boundaries").innerHTML = Object.entries(run.boundaries).map(([key, value]) => `<div class="method-row"><b>${key}</b><p>${value}</p></div>`).join("");
}

function renderPains() {
  $("#pain-list").innerHTML = pains.map(([title, pain, approach, link, question], index) => `<article class="pain-row"><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${title}</h3><p>${pain}</p></div><div><p>${approach}</p><a href="${index === 0 ? "#gate-lab" : index === 2 ? "#fleet" : "#trace"}">${link} →</a></div><blockquote>${question}</blockquote></article>`).join("");
}

function setInferenceStatus(message, error = false) {
  $("#inference-status").textContent = message;
  $("#inference-status").classList.toggle("is-error", error);
}

function chooseFile(file) {
  if (!file) return;
  if (!ALLOWED_TYPES.has(file.type)) return setInferenceStatus("Use a JPEG, PNG or WebP image.", true);
  if (file.size > MAX_UPLOAD_BYTES) return setInferenceStatus("Image exceeds the 5 MiB limit.", true);
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  $("#preview-image").src = previewUrl;
  $("#preview-image").alt = `Uploaded image: ${file.name}`;
  $("#image-stage").hidden = false;
  $("#canvas-empty").hidden = true;
  $("#boxes").innerHTML = "";
  $("#run-inference").disabled = false;
  setInferenceStatus(`${file.name} ready. Run live inference.`);
}

async function runInference() {
  if (!selectedFile) return;
  const button = $("#run-inference");
  button.disabled = true;
  button.textContent = "Waking the model…";
  setInferenceStatus("The first request may wait for a scale-to-zero cold start.");
  try {
    const response = await fetch(`${API_BASE}/api/predict?confidence=${$("#confidence").value}`, { method: "POST", headers: { "Content-Type": selectedFile.type }, body: selectedFile });
    const body = await response.json();
    if (!response.ok) throw new Error(body.detail || `API HTTP ${response.status}`);
    renderInference(body);
    setInferenceStatus(`${body.detections.length} detections · image processed in memory and not retained.`);
  } catch (error) {
    setInferenceStatus(`Inference did not complete: ${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = "Run live inference";
  }
}

function renderInference(result) {
  const svg = $("#boxes");
  svg.setAttribute("viewBox", `0 0 ${result.image.width} ${result.image.height}`);
  svg.innerHTML = result.detections.map((item) => {
    const [x1, y1, x2, y2] = item.box;
    return `<g class="box box-${item.label}"><rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}"/><text x="${x1}" y="${Math.max(18, y1)}">${item.label} ${Math.round(item.confidence * 100)}%</text></g>`;
  }).join("");
  $("#runtime-facts").innerHTML = `<div><dt>Runtime</dt><dd>${result.runtime}</dd></div><div><dt>Model</dt><dd title="${result.model_sha256}">${short(result.model_sha256)}</dd></div><div><dt>Inference</dt><dd>${fmt(result.inference_ms)} ms</dd></div>`;
  $("#detection-list").innerHTML = result.detections.length ? result.detections.map((item) => `<div><span class="detection-dot detection-${item.label}"></span><b>${item.label}</b><span>${fmt(item.confidence * 100)}%</span><small>${item.box.map((value) => Math.round(value)).join(", ")}</small></div>`).join("") : "<p>No objects passed this confidence threshold.</p>";
}

function bindInteractions() {
  const input = $("#image-input");
  input.addEventListener("change", () => chooseFile(input.files[0]));
  ["dragenter", "dragover"].forEach((name) => $("#dropzone").addEventListener(name, (event) => { event.preventDefault(); $("#dropzone").classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach((name) => $("#dropzone").addEventListener(name, (event) => { event.preventDefault(); $("#dropzone").classList.remove("is-dragging"); }));
  $("#dropzone").addEventListener("drop", (event) => chooseFile(event.dataTransfer.files[0]));
  $("#confidence").addEventListener("input", () => { $("#confidence-output").value = $("#confidence").value; });
  $("#run-inference").addEventListener("click", runInference);
}

renderPains();
bindInteractions();
try {
  evidence = await loadEvidence();
  renderEvidence(evidence);
} catch (error) {
  renderMissingEvidence(error);
}
