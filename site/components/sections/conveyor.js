import { renderLane } from "../lane.js";
import { observeOnce, reduced } from "../motion.js";
import { lang, t } from "../i18n.js";

const byId = (id) => document.getElementById(id);
const WIDE = matchMedia("(min-width: 900px)");
const RECORDED_DURATION = "8 m 45 s";

export function mountConveyor({ store, registry }) {
  const mount = byId("pipeline-flow");
  const status = byId("lane-status");
  const badge = byId("lane-badge");
  const replay = byId("replay-lane");
  let handle = null;
  let armed = false;
  let ran = false;

  const model = () => (store.get().pipelines?.pipelines || []).find((pipeline) => pipeline.id === "model") || null;

  function build() {
    const pipeline = model();
    if (!pipeline) return;
    const state = store.get();
    if (handle) handle.destroy();
    status.textContent = "";
    handle = renderLane(mount, pipeline, {
      mode: "linear",
      lang: lang(),
      registry: registry(),
      reach: !WIDE.matches,
      scope: "story",
      surface: "#pipeline-flow",
      expandedId: state.expandedStage,
      onExpand: (id) => store.patch({ expandedStage: id }),
      onStatus: (text) => { status.textContent = text; },
    });
    const recorded = pipeline.stages.find((stage) => stage.id === "train")?.duration_recorded;
    const key = recorded === RECORDED_DURATION ? "laneRecordedNote" : "laneRecordedNoteShort";
    badge.textContent = t(key, { run: state.evidence?.run_id || "—" });
    replay.hidden = false;
    if (!armed) {
      armed = true;
      observeOnce(mount, () => { if (!ran && WIDE.matches && !reduced()) { ran = true; handle.run(); } }, { threshold: 0.3 });
    }
  }

  replay.hidden = true;
  replay.addEventListener("click", () => { if (handle) handle.run(); });
  WIDE.addEventListener("change", build);
  store.subscribe(["pipelines", "evidence", "platformRevision", "language"], build);
  store.subscribe(["pipelinesError"], (state) => { if (state.pipelinesError) status.textContent = t("pipelineModelUnavailable", { msg: state.pipelinesError }); });
  build();
}
