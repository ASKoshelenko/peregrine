export function initialState() {
  return {
    language: "en",
    workspace: "story",
    evidence: null,
    platform: null,
    platformRevision: null,
    platformFetchedAt: 0,
    platformEvents: null,
    pipelines: null,
    activeLayer: null,
    infraTab: null,
    railIndex: 0,
    expandedStage: null,
    automationLane: null,
    gateScenario: { budgets: {}, lineage: true },
    predict: { status: "idle", result: null },
  };
}

export function createStore(initial = {}) {
  const state = { ...initialState(), ...initial };
  const subscribers = new Set();
  const get = () => state;
  const patch = (partial) => {
    if (!partial) return state;
    const changed = [];
    for (const key of Object.keys(partial)) if (!Object.is(state[key], partial[key])) { state[key] = partial[key]; changed.push(key); }
    if (!changed.length) return state;
    for (const subscriber of [...subscribers]) {
      if (subscriber.keys && !changed.some((key) => subscriber.keys.has(key))) continue;
      try { subscriber.cb(state, changed); } catch (error) { console.error("store subscriber failed", error); }
    }
    return state;
  };
  const subscribe = (keys, cb) => {
    const listener = typeof keys === "function" ? keys : cb;
    if (typeof listener !== "function") return () => {};
    const subscriber = { keys: typeof keys === "function" ? null : new Set(Array.isArray(keys) ? keys : [keys]), cb: listener };
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  };
  return { get, patch, subscribe };
}
