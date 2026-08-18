import { countUp, reduced } from "../motion.js";
import { applyStatic, esc, t } from "../i18n.js";
import { fmtVal, truthChip } from "../pipeline-model.js";

const byId = (id) => document.getElementById(id);
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const COPY_MS = 1500;
const IN_DOMAIN = 0.5;
const inDomain = (result) => (result?.detections || []).some((item) => Number(item.confidence) >= IN_DOMAIN);

export function mountDetector({ store, api }) {
  const input = byId("image-input");
  const zone = byId("dropzone");
  const stage = byId("image-stage");
  const empty = byId("canvas-empty");
  const preview = byId("preview-image");
  const boxes = byId("boxes");
  const labels = byId("box-labels");
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
  const plain = byId("detector-plain");
  const samples = byId("detector-samples");
  const lane = byId("scope-lane");
  const scopeRun = byId("scope-run");
  const scopeStatus = byId("scope-status");
  const scopeResult = byId("scope-result");
  const scopeChip = byId("scope-chip");
  const scopeSaid = byId("scope-description");
  let file = null;
  let previewUrl = "";
  let copyTimer = 0;
  let busy = false;
  let said = { key: "chooseImage", params: null, error: false };
  let frame = null;

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
    clearBoxes();
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

  function clearBoxes() {
    frame = null;
    boxes.innerHTML = "";
    labels.innerHTML = "";
    boxes.classList.remove("is-drawn");
    labels.classList.remove("is-drawn");
  }

  // Labels live in HTML, not in the SVG: inside the viewBox they would be scaled
  // by image-pixels-to-CSS-pixels and stop being readable. Positions are recomputed
  // from the same contain-fit the <img> uses, so a chip never drifts off its box.
  function layoutLabels() {
    if (!frame) return;
    const width = Number(frame.width);
    const height = Number(frame.height);
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (!width || !height || !stageWidth || !stageHeight) return;
    const scale = Math.min(stageWidth / width, stageHeight / height);
    const left0 = (stageWidth - width * scale) / 2;
    const top0 = (stageHeight - height * scale) / 2;
    const placed = [];
    for (const chip of labels.children) {
      const boxWidth = Number(chip.dataset.w) * scale;
      chip.hidden = boxWidth < 22;
      if (chip.hidden) continue;
      chip.classList.remove("is-compact");
      let chipWidth = chip.offsetWidth;
      if (chipWidth > boxWidth + 24) { chip.classList.add("is-compact"); chipWidth = chip.offsetWidth; }
      const chipHeight = chip.offsetHeight;
      const boxLeft = left0 + Number(chip.dataset.x) * scale;
      const boxTop = top0 + Number(chip.dataset.y) * scale;
      const maxLeft = left0 + width * scale - chipWidth;
      const maxTop = top0 + height * scale - chipHeight;
      const x = Math.min(Math.max(boxLeft, left0), Math.max(left0, maxLeft));
      let y = boxTop - chipHeight >= top0 ? boxTop - chipHeight : boxTop;
      const hits = (other) => x < other.x + other.w && x + chipWidth > other.x && y < other.y + other.h && y + chipHeight > other.y;
      for (let guard = 0; guard < 4 && placed.some(hits) && y + chipHeight * 2 <= maxTop; guard += 1) y += chipHeight + 2;
      y = Math.min(Math.max(y, top0), Math.max(top0, maxTop));
      chip.style.left = `${Math.round(x)}px`;
      chip.style.top = `${Math.round(y)}px`;
      placed.push({ x, y, w: chipWidth, h: chipHeight });
    }
  }

  function paintResult(result, elapsed) {
    frame = result.image;
    boxes.setAttribute("viewBox", `0 0 ${Number(result.image.width)} ${Number(result.image.height)}`);
    boxes.innerHTML = result.detections.map((item, index) => {
      const [x1, y1, x2, y2] = item.box.map(Number);
      return `<g class="box box-${esc(item.label)}" style="--i:${index}"><rect pathLength="1" x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}"/></g>`;
    }).join("");
    labels.innerHTML = result.detections.map((item, index) => {
      const [x1, y1, x2] = item.box.map(Number);
      return `<b class="box-label${item.label === "pallet" ? " is-pallet" : ""}" style="--i:${index}" data-x="${x1}" data-y="${y1}" data-w="${x2 - x1}">`
        + `<i>${esc(item.label)}</i><span>${Math.round(item.confidence * 100)}%</span></b>`;
    }).join("");
    requestAnimationFrame(layoutLabels);
    if (!reduced()) requestAnimationFrame(() => { boxes.classList.add("is-drawn"); labels.classList.add("is-drawn"); });
    else { boxes.classList.add("is-drawn"); labels.classList.add("is-drawn"); }
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

  function paintPlain() {
    const state = store.get().predict;
    const result = state.status === "done" ? state.result : null;
    plain.hidden = state.status !== "pending" && !result;
    if (plain.hidden) { plain.textContent = ""; return; }
    if (state.status === "pending") { plain.textContent = t("plain.coldStartNote"); return; }
    plain.textContent = t(result.detections.length ? "plain.detected" : "plain.detectedNone", { n: result.detections.length });
  }

  function paintScope() {
    const state = store.get().predict;
    const scope = store.get().scope;
    lane.hidden = !(state.status === "done" && state.result && !inDomain(state.result));
    if (lane.hidden) return;
    scopeRun.disabled = scope.status === "pending";
    scopeStatus.textContent = scope.status === "pending" ? t("scope.running") : scope.status === "error" ? t("scope.unavailable") : "";
    const answer = scope.status === "done" && scope.result ? scope.result.description : "";
    scopeResult.hidden = !answer;
    scopeSaid.textContent = answer;
    scopeChip.innerHTML = answer ? truthChip("LIVE", { inline: true }) : "";
    if (answer) applyStatic(scopeChip);
  }

  function paintSamples() {
    for (const button of samples.querySelectorAll("[data-sample]")) {
      const image = button.querySelector("img");
      if (image) image.alt = t("scope.sampleAlt", { n: button.dataset.sample });
    }
  }

  async function askScope() {
    if (!file || store.get().scope.status === "pending") return;
    store.patch({ scope: { status: "pending", result: null } });
    try {
      const response = await fetch(`${api}/api/scope`, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const payload = await response.json();
      if (!response.ok || !payload.description) throw new Error(payload.detail || `API HTTP ${response.status}`);
      store.patch({ scope: { status: "done", result: payload } });
    } catch {
      store.patch({ scope: { status: "error", result: null } });
    }
  }

  async function useSample(n) {
    if (busy) return;
    try {
      const response = await fetch(`./assets/samples/sample-${n}.jpg`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      choose(new File([await response.blob()], `sample-${n}.jpg`, { type: "image/jpeg" }));
      await predict();
    } catch (error) {
      status("inferenceFailed", { msg: error instanceof Error ? error.message : String(error) }, true);
    }
  }

  async function predict() {
    if (!file || busy) return;
    busy = true;
    const started = performance.now();
    runButton.disabled = true;
    runButton.textContent = t("wakingModel");
    clearBoxes();
    if (!reduced()) stage.classList.add("is-scanning");
    status(reduced() ? "coldStartWait" : "liveRequestInFlight");
    store.patch({ predict: { status: "pending", result: null, error: null }, scope: { status: "idle", result: null } });
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
      busy = false;
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
  scopeRun.addEventListener("click", askScope);
  samples.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sample]");
    if (button) useSample(button.dataset.sample);
  });
  hashCopy.addEventListener("click", async () => {
    if (!hashCopy.dataset.copy) return;
    try { await navigator.clipboard.writeText(hashCopy.dataset.copy); } catch { return; }
    hashCopy.textContent = t("copied");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { hashCopy.textContent = t("copy"); }, COPY_MS);
  });

  if (typeof ResizeObserver === "function") new ResizeObserver(layoutLabels).observe(stage);
  else window.addEventListener("resize", layoutLabels);
  preview.addEventListener("load", layoutLabels);

  paintHash(null);
  paintSamples();
  paintPlain();
  paintScope();
  hashRow.hidden = false;
  store.subscribe(["predict", "scope"], () => { paintPlain(); paintScope(); });
  store.subscribe(["language"], () => {
    status(said.key, said.params, said.error);
    if (file) preview.alt = t("aria.uploadedImage", { name: file.name });
    runButton.textContent = t(store.get().predict.status === "pending" ? "wakingModel" : "runInference");
    paintVerify(store.get().predict.result);
    paintDetections(store.get().predict.result);
    paintSamples();
    paintPlain();
    paintScope();
  });
  store.subscribe(["pipelines"], () => paintVerify(store.get().predict.result));
}
