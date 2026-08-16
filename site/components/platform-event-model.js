const REQUIRED_EVENT_FIELDS = ["id", "phase", "resource", "action", "depends_on", "control", "evidence", "source", "truth", "outcome"];
const TRUTHS = new Set(["RECORDED", "LIVE"]);
const OUTCOMES = new Set(["PASS", "BLOCK"]);
const UK_FIELDS = new Set(["resource", "action", "control", "evidence"]);

export async function loadPlatformEventModel(url = "/platform-events.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`platform event model HTTP ${response.status}`);
  const model = await response.json();
  if (model.schema_version !== 2 || !Array.isArray(model.events) || model.events.length === 0) throw new Error("invalid platform event model");
  if (!isBilingual(model.boundary)) throw new Error("platform event model boundary must carry en and uk");
  const known = new Set();
  for (const event of model.events) {
    const id = event.id || "unknown";
    if (REQUIRED_EVENT_FIELDS.some((field) => !(field in event))) throw new Error(`incomplete platform event ${id}`);
    if (known.has(event.id)) throw new Error(`duplicate platform event ${id}`);
    if (!isText(event.source)) throw new Error(`platform event ${id} is unsourced`);
    if (!TRUTHS.has(event.truth)) throw new Error(`platform event ${id} has invalid truth ${event.truth}`);
    if (!OUTCOMES.has(event.outcome)) throw new Error(`platform event ${id} has invalid outcome ${event.outcome}`);
    if ("pace_ms" in event && !(Number.isFinite(event.pace_ms) && event.pace_ms > 0)) throw new Error(`platform event ${id} has invalid pace_ms`);
    if ("uk" in event) assertUk(id, event.uk);
    if (!Array.isArray(event.depends_on)) throw new Error(`platform event ${id} has invalid depends_on`);
    const unresolved = event.depends_on.filter((parent) => !known.has(parent));
    if (unresolved.length) throw new Error(`platform event ${id} has unresolved parents: ${unresolved.join(", ")}`);
    known.add(event.id);
  }
  return model;
}

export function pick(event, field, lang) {
  if (!event) return "";
  if (lang === "uk" && event.uk && isText(event.uk[field])) return event.uk[field];
  return event[field];
}

function assertUk(id, uk) {
  if (!uk || typeof uk !== "object" || Array.isArray(uk)) throw new Error(`platform event ${id} has an invalid uk block`);
  for (const [field, value] of Object.entries(uk)) {
    if (!UK_FIELDS.has(field)) throw new Error(`platform event ${id} has an unknown uk field ${field}`);
    if (!isText(value)) throw new Error(`platform event ${id} has an empty uk.${field}`);
  }
}

function isBilingual(value) {
  return Boolean(value) && typeof value === "object" && isText(value.en) && isText(value.uk);
}

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
