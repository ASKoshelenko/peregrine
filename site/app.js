const EVIDENCE_URL = "../artifacts/observed/latest.json";

const pains = [
  ["The INT8 accuracy cliff", "A checkpoint passed eval, then the converted model quietly lost accuracy on the target.", "Post-quant metrics are gated per target; calibration data is versioned with the model card.", "release.yml matrix + Q1 post-quant gate", "Which target bites you hardest on the cliff today — TFLite, TensorRT, or the DSP?"],
  ["Research to production handoff", "Researchers hand off a notebook or checkpoint; engineering inherits an ambiguous contract.", "The handoff artifact is a package plus materialized config, model fingerprint, and registry record.", "model card with dataset/env/fingerprint lineage", "What does a handoff artifact look like in your team today — a notebook, a checkpoint, or a package?"],
  ["A heterogeneous device fleet", "A runtime or delegate update changes what executes where, and the model fails without a clean error.", "The conversion matrix is code; p95, size, and parity budgets are target-specific.", "x86 ONNX / x86 TFLite / ARM64-QEMU benchmark JSON", "When a runtime updates on your devices, what re-validates the models across the fleet?"],
  ["The dataset never stops growing", "Relabels and new camera data break comparability unless snapshots are pinned.", "DVC snapshots, label-space versions, and registry links force a re-baseline when data changes.", "dataset hash in observed JSON and model card", "When labels change without new images, does anything force a re-baseline today?"],
  ["Nobody can reproduce January's experiment", "Configs become folklore and metrics drift across dashboards.", "Hydra configs and W&B artifact slots make the run reconstructable from its materialized config.", "configs/ + workflow slots + model card", "Could a January run be reproduced from its config alone?"],
  ["GPUs: queues, quotas, and the bill", "Quota fails at the deadline and cost per run is discovered after the fact.", "GPU is a scheduled resource; CPU-smoke fallback proves mechanics; cost is a model-card field.", "train.yml lane + cost boundary", "Who owns the training bill today — and has quota ever blocked a deadline?"]
];

async function loadRun() {
  const response = await fetch(EVIDENCE_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

function metric(value, label) {
  return `<article class="metric"><b>${value}</b><span>${label}</span></article>`;
}

const METRIC_LABELS = [
  "mAP@0.50 proxy FP32 to INT8",
  "x86 TFLite INT8 p95",
  "ARM64-QEMU INT8 p95",
  "INT8 artifact size"
];

function renderEvidence(run) {
  const fp32 = run.targets.x86_onnx_fp32;
  const int8 = run.targets.x86_tflite_int8;
  const arm = run.targets.arm64_qemu_tflite_int8;
  const q1 = run.release_verdict.gates.find((gate) => gate.gate_id === "Q1");
  const q1Note = q1 ? ` · Δ ${q1.measured} of ${q1.budget} budget (${q1.status})` : "";
  document.querySelector("#metrics").innerHTML = [
    metric(`${fp32.map50_proxy.toFixed(4)} -> ${int8.map50_proxy.toFixed(4)}`, `${METRIC_LABELS[0]}${q1Note}`),
    metric(`${int8.p95_ms.toFixed(1)} ms`, METRIC_LABELS[1]),
    metric(`${arm.p95_ms.toFixed(1)} ms`, METRIC_LABELS[2]),
    metric(`${int8.size_mb.toFixed(1)} MB`, METRIC_LABELS[3]),
    `<p class="evidence-note">run ${run.run_id} · dataset sha256:${run.dataset_hash.slice(0, 12)} · accuracy figures are F1-based proxies on the contract set, not COCO mAP</p>`
  ].join("");
  document.querySelector("#boundaries").innerHTML = Object.entries(run.boundaries).map(([key, value]) => `
    <div class="boundary"><span class="badge">${key}</span><span>${value}</span></div>
  `).join("");
}

function renderMissingEvidence() {
  document.querySelector("#metrics").innerHTML = [
    `<aside class="evidence-banner">Evidence file not loaded — no numbers are shown. Run <code>make observe</code>, then serve with <code>make site</code>.</aside>`,
    ...METRIC_LABELS.map((label) => metric("—", label))
  ].join("");
  document.querySelector("#boundaries").innerHTML =
    `<div class="boundary"><span class="badge">evidence</span><span>Method notes render from the observed run artifact. Run make observe.</span></div>`;
}

document.querySelector("#pain-grid").innerHTML = pains.map(([title, pain, approach, artifact, question]) => `
  <article class="pain">
    <p class="kicker">Pain</p>
    <h3>${title}</h3>
    <p>${pain}</p>
    <p>${approach}</p>
    <p class="artifact">Artifact: ${artifact}</p>
    <p class="question">${question}</p>
  </article>
`).join("");

try {
  renderEvidence(await loadRun());
} catch {
  renderMissingEvidence();
}
