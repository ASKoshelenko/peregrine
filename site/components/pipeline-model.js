const TRUTHS = ["LIVE", "RECORDED", "DEFINED"];
const OUTCOMES = ["PASS", "BLOCK", "DEFINED"];
const SOURCES = ["platform", "evidence", "predict"];
const CHIP_CLASS = { LIVE: "truth-live", RECORDED: "truth-recorded", DEFINED: "truth-defined", SIMULATED: "truth-simulated" };
const CHIP_DETAIL = { LIVE: "truthLiveChip", RECORDED: "truthRecordedChip", DEFINED: "truthDefinedChip", SIMULATED: "truthSimulatedChip" };
const BIND_TRUTH = { platform: "LIVE", predict: "LIVE", evidence: "RECORDED" };
const REQUIRED_STAGE_FIELDS = ["id", "name", "outcome", "source", "depends_on"];

const text = (value) => typeof value === "string" && value.trim().length > 0;
const pair = (value) => !!value && text(value.en) && text(value.uk);
const cut = (value, size) => (text(value) ? (value.length > size ? `${value.slice(0, size)}…` : value) : "—");
const num = (value) => (value === null || value === "" || value === undefined ? null : Number(value));

function assertMeta(entries, where) {
  if (entries === undefined) return;
  if (!Array.isArray(entries)) throw new Error(`${where} meta is not a list`);
  for (const entry of entries) {
    if (!pair(entry?.label)) throw new Error(`${where} meta entry is missing a bilingual label`);
    if (!text(entry.value)) throw new Error(`${where} meta ${entry.label.en} has no value`);
    if (!text(entry.source)) throw new Error(`${where} meta ${entry.label.en} is unsourced`);
  }
}

function assertLive(binds, where) {
  if (binds === undefined) return;
  if (!Array.isArray(binds)) throw new Error(`${where} live is not a list`);
  for (const bind of binds) {
    if (!SOURCES.includes(bind?.source)) throw new Error(`${where} live bind has an unknown source ${bind?.source}`);
    if (!text(bind.pointer) || !bind.pointer.startsWith("/")) throw new Error(`${where} live bind pointer ${bind.pointer} is not an RFC6901 pointer`);
    if (!pair(bind.label)) throw new Error(`${where} live bind ${bind.pointer} is missing a bilingual label`);
  }
}

function assertFragments(fragments, where) {
  if (fragments === undefined) return;
  if (!Array.isArray(fragments)) throw new Error(`${where} fragments is not a list`);
  for (const fragment of fragments) {
    if (!text(fragment?.kind) || !text(fragment.target)) throw new Error(`${where} fragment is missing kind or target`);
    if (!text(fragment.observed_at)) throw new Error(`${where} fragment ${fragment.kind}-${fragment.target} has no observed_at`);
    if (fragment.sha256 !== null && !/^[0-9a-f]{64}$/.test(fragment.sha256 || "")) throw new Error(`${where} fragment ${fragment.kind}-${fragment.target} has an invalid sha256`);
    if (!pair(fragment.key?.label) || !text(fragment.key?.value)) throw new Error(`${where} fragment ${fragment.kind}-${fragment.target} has no key value`);
  }
}

function assertStage(stage, pipeline, seen) {
  const where = `${pipeline.id}.${stage?.id || "unknown"}`;
  if (REQUIRED_STAGE_FIELDS.some((field) => !(field in (stage || {})))) throw new Error(`incomplete stage ${where}`);
  if (seen.has(stage.id)) throw new Error(`duplicate stage ${where}`);
  if (!pair(stage.name)) throw new Error(`stage ${where} is missing a bilingual name`);
  if (!text(stage.source)) throw new Error(`unsourced stage ${where}`);
  if (!OUTCOMES.includes(stage.outcome)) throw new Error(`stage ${where} has an unknown outcome ${stage.outcome}`);
  if (stage.truth !== undefined && !TRUTHS.includes(stage.truth)) throw new Error(`stage ${where} has an unknown truth ${stage.truth}`);
  if (!Array.isArray(stage.depends_on)) throw new Error(`stage ${where} has no depends_on list`);
  const unresolved = stage.depends_on.filter((parent) => !seen.has(parent));
  if (unresolved.length) throw new Error(`stage ${where} has unresolved parents: ${unresolved.join(", ")}`);
  const truth = stage.truth || pipeline.truth;
  if ((truth === "DEFINED") !== (stage.outcome === "DEFINED")) throw new Error(`stage ${where} is ${truth} but its outcome is ${stage.outcome}`);
  if (truth === "DEFINED" && stage.duration_recorded !== undefined) throw new Error(`DEFINED stage ${where} carries a duration`);
  if (stage.pace_ms !== undefined && !(Number.isFinite(stage.pace_ms) && stage.pace_ms > 0)) throw new Error(`stage ${where} has an invalid pace_ms`);
  for (const field of ["artifact", "control", "console"]) {
    if (stage[field] !== undefined && !pair(stage[field])) throw new Error(`stage ${where} has a non-bilingual ${field}`);
  }
  for (const link of stage.links || []) {
    if (!pair(link?.label) || !text(link.href)) throw new Error(`stage ${where} has an incomplete link`);
  }
  assertLive(stage.live, `stage ${where}`);
  assertFragments(stage.fragments, `stage ${where}`);
  seen.add(stage.id);
}

export async function loadPipelineModel(url = "/pipelines.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`pipeline model HTTP ${response.status}`);
  const model = await response.json();
  if (model.schema_version !== 1) throw new Error("invalid pipeline model version");
  if (!pair(model.boundary)) throw new Error("pipeline model has no bilingual boundary");
  if (!Array.isArray(model.pipelines) || model.pipelines.length === 0) throw new Error("pipeline model has no pipelines");
  const stages = new Set();
  const ids = new Set();
  for (const pipeline of model.pipelines) {
    if (!text(pipeline?.id)) throw new Error("pipeline without an id");
    if (ids.has(pipeline.id)) throw new Error(`duplicate pipeline ${pipeline.id}`);
    if (!pair(pipeline.name)) throw new Error(`pipeline ${pipeline.id} is missing a bilingual name`);
    if (!TRUTHS.includes(pipeline.truth)) throw new Error(`pipeline ${pipeline.id} has an unknown truth ${pipeline.truth}`);
    if (!text(pipeline.trigger)) throw new Error(`pipeline ${pipeline.id} has no trigger`);
    if (!text(pipeline.source)) throw new Error(`unsourced pipeline ${pipeline.id}`);
    if (pipeline.truth === "DEFINED" && !pair(pipeline.boundary)) throw new Error(`DEFINED pipeline ${pipeline.id} has no bilingual boundary`);
    if (!Array.isArray(pipeline.stages) || pipeline.stages.length === 0) throw new Error(`pipeline ${pipeline.id} has no stages`);
    assertMeta(pipeline.meta, `pipeline ${pipeline.id}`);
    const seen = new Set();
    for (const stage of pipeline.stages) {
      assertStage(stage, pipeline, seen);
      stages.add(`${pipeline.id}.${stage.id}`);
    }
    ids.add(pipeline.id);
  }
  for (const handoff of model.handoffs || []) {
    if (!stages.has(handoff?.from) || !stages.has(handoff?.to)) throw new Error(`handoff ${handoff?.from} → ${handoff?.to} does not resolve`);
    if (!pair(handoff.artifact)) throw new Error(`handoff ${handoff.from} → ${handoff.to} has no bilingual artifact`);
    if (!text(handoff.source)) throw new Error(`unsourced handoff ${handoff.from} → ${handoff.to}`);
  }
  return model;
}

export function resolvePointer(object, pointer) {
  if (pointer === "") return object;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) return undefined;
  let node = object;
  for (const raw of pointer.slice(1).split("/")) {
    if (node === null || typeof node !== "object") return undefined;
    const token = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(node)) {
      if (!/^(0|[1-9][0-9]*)$/.test(token)) return undefined;
      node = node[Number(token)];
    } else node = Object.prototype.hasOwnProperty.call(node, token) ? node[token] : undefined;
  }
  return node;
}

export function fmtVal(format, value) {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "ms": return Number.isFinite(num(value)) ? num(value).toFixed(1) : "—";
    case "mb": return Number.isFinite(num(value)) ? num(value).toFixed(2) : "—";
    case "map4": return Number.isFinite(num(value)) ? num(value).toFixed(4) : "—";
    case "int": return Number.isFinite(num(value)) ? String(Math.trunc(num(value))) : "—";
    case "hash8": return cut(value, 8);
    case "hash12": return cut(value, 12);
    default: return String(value);
  }
}

export function bindLive(stage, registry = {}) {
  return (stage?.live || []).map((bind) => {
    const raw = resolvePointer(registry[bind.source], bind.pointer);
    const value = raw === undefined ? null : raw;
    return { label: bind.label, value, truth: BIND_TRUTH[bind.source], format: bind.format || "raw", source: bind.source, pointer: bind.pointer, text: fmtVal(bind.format, value) };
  });
}

export function truthChip(state, { detailKey, inline = false, quiet = false } = {}) {
  const truth = String(state || "").toUpperCase();
  const chip = CHIP_CLASS[truth];
  if (!chip) return "";
  return `<span class="${chip}${inline ? " truth-inline" : ""}${quiet ? " is-quiet" : ""}" data-i18n-aria="${detailKey || CHIP_DETAIL[truth]}">${truth}</span>`;
}

export function consoleLine(stage, binds, lang = "en") {
  const template = stage?.console?.[lang] ?? stage?.console?.en;
  if (!text(template)) return "";
  return template.replace(/\{(\d+)\}/g, (match, index) => binds[Number(index)]?.text ?? "—");
}

export function stageRef(model, reference) {
  const [pipelineId, stageId] = String(reference || "").split(".");
  const pipeline = model?.pipelines?.find((entry) => entry.id === pipelineId);
  const stage = pipeline?.stages.find((entry) => entry.id === stageId);
  return pipeline && stage ? { pipeline, stage } : null;
}
