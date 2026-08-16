import { countUp, reduced } from "../motion.js";
import { applyStatic, esc, t } from "../i18n.js";
import { fmtVal, truthChip } from "../pipeline-model.js";

const byId = (id) => document.getElementById(id);
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COPY_MS = 1500;

export function mountDetector({ store, api }) {
  const input = byId("image-input");
  const zone = byId("dropzone");
  const stage = byId("image-stage");
  const empty = byId("canvas-empty");
  const preview = byId("preview-image");
  const boxes = byId("boxes");
  const runButton = byId("run-inference");
  const statusEl = byId("inference-status");
  const confidence = byId("confidence");
  const output = byId("confidence-output");
  const facts = { runtime: byId("fact-runtime"), model: byId("fact-model"), inference: byId("fact-inference"), request: byId("fact-request") };
  const hashRow = byId("model-hash-row");
  const hashShort = byId("model-hash-short");
  const hashFull = byId("model-hash-full");
  const hashCopy = byId("model-hash-copy");
  const verify = byId("verify-chip");
  const verifyValue = byId("verify-value");
  const detections = byId("detection-list");
  let file = null;
  let previewUrl = "";
  let copyTimer = 0;
  let said = { key: "chooseImage", params: null, error: false };

  const pinnedSha = () => {
    const image = (store.get().pipelines?.pipelines || []).find((pipeline) => pipeline.id === "image");
    return image?.meta?.find((entry) => /sha256/i.test(entry.label.en))?.value || null;
  };

  const status = (key, params = null, error = false) => {
    said = { key, params, error };
    statusEl.textContent = t(key, params);
    statusEl.classList.toggle("is-error", error);
  };

  function choose(next) {
    if (!next) return;
    if (!TYPES.has(next.type)) return status("uploadType", null, true);
    if (next.size > MAX_BYTES) return status("uploadSize", null, true);
    file = next;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(next);
    preview.src = previewUrl;
    preview.alt = t("aria.uploadedImage", { name: next.name });
    stage.hidden = false;
    empty.hidden = true;
    boxes.innerHTML = "";
    runButton.disabled = false;
    status("fileReady", { name: next.name });
  }

  function paintVerify(result) {
    const pin = pinnedSha();
    const match = Boolean(result?.model_sha256 && pin && result.model_sha256 === pin);
    verify.classList.toggle("is-verified", match);
    verifyValue.textContent = match ? t("verifyMatch") : "—";
    const chip = verify.querySelector(".truth-live");
    if (chip) chip.remove();
    if (match) { verify.insertAdjacentHTML("beforeend", truthChip("LIVE", { inline: true })); applyStatic(verify); }
  }

  function paintHash(value) {
    hashShort.textContent = value ? fmtVal("hash12", value) : "—";
    hashFull.textContent = value || "—";
    hashCopy.dataset.copy = value || "";
    hashCopy.hidden = !value;
  }

  function paintResult(result, elapsed) {
    boxes.setAttribute("viewBox", `0 0 ${Number(result.image.width)} ${Number(result.image.height)}`);
    boxes.innerHTML = result.detections.map((item, index) => {
      const [x1, y1, x2, y2] = item.box.map(Number);
      return `<g class="box box-${esc(item.label)}" style="--i:${index}"><rect pathLength="1" x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}"/>`
        + `<text x="${x1}" y="${Math.max(18, y1)}">${esc(item.label)} ${Math.round(item.confidence * 100)}%</text></g>`;
    }).join("");
    if (!reduced()) requestAnimationFrame(() => boxes.classList.add("is-drawn"));
    else boxes.classList.add("is-drawn");
    facts.runtime.textContent = result.runtime;
    facts.model.textContent = fmtVal("hash12", result.model_sha256);
    facts.request.textContent = `${fmtVal("ms", elapsed)} ms`;
    facts.inference.textContent = `${fmtVal("ms", result.inference_ms)} ms`;
    countUp(facts.inference, `${fmtVal("ms", result.inference_ms)} ms`, { ms: 500 });
    paintHash(result.model_sha256);
    paintVerify(result);
    paintDetections(result);
  }

  function paintDetections(result) {
    if (!result) return;
    detections.innerHTML = result.detections.length
      ? result.detections.map((item) => `<div><span class="detection-dot detection-${esc(item.label)}"></span><b>${esc(item.label)}</b><span>${fmtVal("ms", item.confidence * 100)}%</span><small>${item.box.map((value) => Math.round(value)).join(", ")}</small></div>`).join("")
      : `<p>${esc(t("noObjectsThreshold"))}</p>`;
  }

  async function predict() {
    if (!file) return;
    const started = performance.now();
    runButton.disabled = true;
    runButton.textContent = t("wakingModel");
    boxes.classList.remove("is-drawn");
    if (!reduced()) stage.classList.add("is-scanning");
    status(reduced() ? "coldStartWait" : "liveRequestInFlight");
    store.patch({ predict: { status: "pending", result: null, error: null } });
    try {
      const response = await fetch(`${api}/api/predict?confidence=${confidence.value}`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || `API HTTP ${response.status}`);
      paintResult(payload, performance.now() - started);
      status("detectionsDone", { n: payload.detections.length });
      store.patch({ predict: { status: "done", result: payload, error: null } });
    } catch (error) {
      status("inferenceFailed", { msg: error.message }, true);
      store.patch({ predict: { status: "error", result: null, error: error.message } });
    } finally {
      stage.classList.remove("is-scanning");
      runButton.disabled = false;
      runButton.textContent = t("runInference");
    }
  }

  input.addEventListener("change", () => choose(input.files[0]));
  for (const name of ["dragenter", "dragover"]) zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add("is-dragging"); });
  for (const name of ["dragleave", "drop"]) zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove("is-dragging"); });
  zone.addEventListener("drop", (event) => choose(event.dataTransfer.files[0]));
  confidence.addEventListener("input", () => { output.value = confidence.value; });
  runButton.addEventListener("click", predict);
  hashCopy.addEventListener("click", async () => {
    if (!hashCopy.dataset.copy) return;
    try { await navigator.clipboard.writeText(hashCopy.dataset.copy); } catch { return; }
    hashCopy.textContent = t("copied");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { hashCopy.textContent = t("copy"); }, COPY_MS);
  });

  paintHash(null);
  hashRow.hidden = false;
  store.subscribe(["language"], () => {
    status(said.key, said.params, said.error);
    if (file) preview.alt = t("aria.uploadedImage", { name: file.name });
    runButton.textContent = t(store.get().predict.status === "pending" ? "wakingModel" : "runInference");
    paintVerify(store.get().predict.result);
    paintDetections(store.get().predict.result);
  });
  store.subscribe(["pipelines"], () => paintVerify(store.get().predict.result));
}
