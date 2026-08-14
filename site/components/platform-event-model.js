const REQUIRED_EVENT_FIELDS = ["id", "phase", "resource", "action", "depends_on", "control", "evidence", "outcome"];

export async function loadPlatformEventModel(url = "/platform-events.json") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`platform event model HTTP ${response.status}`);
  const model = await response.json();
  if (model.schema_version !== 1 || !Array.isArray(model.events) || model.events.length === 0) throw new Error("invalid platform event model");
  const known = new Set();
  for (const event of model.events) {
    if (REQUIRED_EVENT_FIELDS.some((field) => !(field in event))) throw new Error(`incomplete platform event ${event.id || "unknown"}`);
    if (known.has(event.id)) throw new Error(`duplicate platform event ${event.id}`);
    const unresolved = event.depends_on.filter((parent) => !known.has(parent));
    if (unresolved.length) throw new Error(`platform event ${event.id} has unresolved parents: ${unresolved.join(", ")}`);
    known.add(event.id);
  }
  return model;
}
