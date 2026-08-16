// System vocabulary is never translated: LIVE / RECORDED / DEFINED / SIMULATED / PROMOTE / BLOCK / PASS,
// gate ids, run ids, hashes, digests, repo paths, file names, commands and product names stay verbatim in both dicts.
export const en = {
  skip: "Skip to the release bench", navPlatform: "Platform", navControl: "Control room", navGate: "Gate lab", navDetector: "Detector", navOps: "Evidence", source: "Source ↗", backToTop: "Top", footer: "Peregrine · a platform story backed by running evidence", footerRun: "run {run}", docTitle: "Peregrine — the platform that qualifies an edge model", switchLabel: "УКР",
  tabStory: "Story", tabControl: "Control", tabGates: "Gates", tabDetector: "Detector", tabEvidence: "Evidence", mobilePlatform: "Platform", mobileTry: "Try detector",

  heroEyebrow: "Platform engineering · MLOps · edge inference", heroTitle: "I did not deploy a model. I built the system that decides if it deserves deployment.", heroLede: "Dataset lineage, reproducible training, target-specific conversion, release gates, immutable infrastructure and a live service form one <em>operating model</em>.", heroPrimary: "Walk the platform", heroSecondary: "Run the product",
  qualificationLabel: "PLATFORM / OBSERVED EVIDENCE", qualificationChips: "RECORDED run · LIVE service", qData: "Version data", qTrain: "Train & track", qQualify: "Qualify targets", qGate: "Enforce policy", qServe: "Serve safely",
  evidenceLoading: "Loading observed run evidence…", evidenceStamp: "{run} · observed {date} · {basis}", evidenceNotLoaded: "Evidence not loaded: {msg}", evidenceUnavailable: "Evidence unavailable", noSubstitution: "No observed number is substituted",
  metricQuality: "Held-out mAP@0.50", metricQuantCost: "quantization cost {v}", metricP95: "x86 INT8 p95", metricInvocations: "{n} measured invocations", metricProtocol: "fixed benchmark protocol", metricInt8: "INT8 artifact", metricSmaller: "{n}× smaller than ONNX", metricVerdict: "Observed verdict", metricGates: "{n} committed gates",

  platformEyebrow: "The platform under the model", platformTitle: "Follow one artifact through the whole system.", platformLead: "Select a layer. The map shows what it owns, what it emits, and which engineering control prevents a quiet failure.",
  layerSource: "Source & contract", layerSourceBody: "The repository is the control plane: Hydra configs, schemas, target budgets and architecture decisions are reviewed before compute starts.", layerSourceEmits: "versioned application · resolved configs · decision record", layerSourceControl: "make check · strict mypy · pytest",
  layerData: "Data plane", layerDataBody: "A reviewed Roboflow version becomes a validated two-class snapshot. DVC points to private GCS objects; the dataset fingerprint follows every child.", layerDataEmits: "data/raw → data/processed → calibration manifest", layerDataControl: "license gate · split leakage check · sha256",
  layerTrain: "Experiment plane", layerTrainBody: "The free Colab T4 run consumes the pinned snapshot. W&B carries experiment telemetry; the repository carries the reproducible contract.", layerTrainEmits: "best.pt · resolved config · run metadata", layerTrainControl: "deterministic seeds · config hash · run commit",
  layerQualify: "Qualification plane", layerQualifyBody: "FP32 ONNX and INT8 TFLite are treated as different products. Each is re-evaluated, benchmarked and labeled by target and host.", layerQualifyEmits: "best.onnx · best-int8.tflite · benchmark fragments", layerQualifyControl: "golden preprocess · calibration membership · target matrix",
  layerRelease: "Release control", layerReleaseBody: "A budget commit predates the measurements. Five gates join quality, latency, size and lineage into one machine-readable verdict.", layerReleaseEmits: "artifacts/observed/latest.json · model card", layerReleaseControl: "budget-before-run · first-failure refusal · immutable parents",
  layerServe: "Serving plane", layerServeBody: "Terraform enables only the required APIs, pins the image digest and creates a role-free runtime identity. Azure DNS delegates the product hostname to Cloud Run.", layerServeEmits: "Artifact Registry → Cloud Run → peregrine.devopsdive.com", layerServeControl: "SHA startup check · min 0/max 1 · TLS · in-memory uploads",
  selectedLayer: "SELECTED LAYER", emits: "Emits", control: "Control", layerStatus: "Layer {n} of {total} — {name}", ownershipLabel: "What I owned end to end", ownershipValue: "Architecture · IaC · MLOps contracts · security boundaries · cost controls · product UX · production verification",
  liveOffline: "Live deployment identity unavailable", checkedAgo: "checked {s}s ago", liveUnavailable: "live confirmation unavailable — contract only, no state is implied",

  pipelineEyebrow: "Delivery, not a notebook", pipelineTitle: "Every transition leaves proof.", pipelineLead: "The pipeline is an evidence conveyor: each stage consumes pinned parents, emits an immutable artifact and may stop the release.", legendArtifact: "artifact", legendControl: "control", legendEvidence: "evidence",
  stageDataName: "Validate snapshot", stageDataArtifact: "dataset fingerprint", stageDataControl: "license · schema · leakage",
  stageTrainName: "Reproduce experiment", stageTrainArtifact: "checkpoint + config", stageTrainControl: "seed · W&B · commit",
  stageConvertName: "Build target artifacts", stageConvertArtifact: "ONNX + INT8", stageConvertControl: "calibration hash",
  stageMeasureName: "Test every target", stageMeasureArtifact: "accuracy + p95 + size", stageMeasureControl: "host provenance",
  stageDecideName: "Execute Q1—Q5", stageDecideArtifact: "PROMOTE / BLOCK", stageDecideControl: "committed budgets",
  stageServeName: "Pin and deploy digest", stageServeArtifact: "live revision", stageServeControl: "readiness · max 1",
  replayLane: "Replay the lane ⟳", laneRecordedNote: "RECORDED · run {run} · replay speed is illustrative — the real training run took 8 m 45 s, cost $0", laneRecordedNoteShort: "RECORDED · run {run} · replay speed is illustrative", stageStatus: "Stage {n} of {total} — {name}", targetArtifacts: "target artifacts: {n}", trainTelemetry: "full telemetry retained in W&B ↗",

  controlEyebrow: "Platform control room", controlTitle: "Watch the system build its own proof.", controlLead: "Replay the recorded, evidence-backed release. Live state is polled from production; defined automation is never presented as executed.",
  truthLive: "queried now", truthRecorded: "real retained run", truthDefined: "automation contract", truthSimulated: "your hypothetical",
  truthLiveChip: "LIVE · queried now", truthRecordedChip: "RECORDED · real retained run", truthDefinedChip: "DEFINED · automation contract", truthSimulatedChip: "SIMULATED — your hypothetical, nothing executed", contractWatermark: "CONTRACT PLAYBACK — order only, never executed",
  replayRun: "Replay real release", replayBoundary: "No compute is started. This replays retained evidence.", replayRunning: "Replaying retained evidence…", replaySummary: "Replay complete: {gates} gates checked, verdict {verdict}",
  automationTitle: "Automation surfaces", autoCi: "PR quality", autoCiTrigger: "pull_request · workflow_dispatch", autoCiNote: "Executable CI; intentionally not triggered on main push.",
  autoTrain: "Model qualification", autoTrainTrigger: "workflow_dispatch · lane", autoTrainNote: "Real retained evidence from the judged release.",
  autoMatrix: "Target matrix", autoMatrixTrigger: "workflow_dispatch", autoMatrixNote: "Matrix definition exists; no empty Actions run was spent.",
  autoDeploy: "Production rollout", autoDeployTrigger: "workflow_dispatch", autoDeployNote: "The running revision is joined below from production.",
  walkCi: "Walk the CI contract", ciBadge: "DEFINED · executable CI contract — playback shows order, not an executed run", matrixBadge: "matrix DEFINED in release.yml · numbers RECORDED from run {run} · no Actions minutes were spent", noRetainedMeasurement: "— no retained measurement",
  infraTitle: "Infrastructure creation and request path", infraProvision: "End-to-end build", infraTerraform: "Terraform plane", infraRuntime: "Runtime request", buildPlatform: "Build the platform", buildPlay: "Play the build", buildPause: "Pause", buildSummary: "Build replay complete. Events: {events}, recorded BLOCK: {blocks}.", replayingNow: "Replaying: {name} — {evidence}",
  workbenchBoundary: "Sanitized replay of retained execution evidence. It does not allocate resources or rerun compute.",
  terraformBadge: "RECORDED · plans retained: peregrine-serving-bootstrap.tfplan · peregrine-serving-release.tfplan · live state joined from /api/platform", confirmedLive: "confirmed live · {revision} · {digest}", liveRevision: "Live revision", dependsOn: "Depends on", tfBootstrap: "bootstrap", tfDeploy: "deploy", eventModelUnavailable: "Platform event model unavailable: {msg}", pipelineModelUnavailable: "Pipeline model unavailable: {msg}", sourceLine: "Source {path} → {field}",

  gateEyebrow: "Policy as executable code", gateTitle: "Make the release system say no.", gateLead: "Change a hypothetical budget. The observed measurements stay fixed; only your scenario changes.",
  scenarioControls: "Scenario controls", lineagePresent: "Dataset lineage is present", resetRelease: "Reset to observed release", simulationBoundary: "Hypothetical simulation. It does not change committed budgets, artifacts or the model registry.", scenarioSimulation: "Scenario simulation", waitingEvidence: "Waiting for evidence.", scenarioUnavailable: "Scenario unavailable", evidenceRequired: "Observed evidence is required.",
  firstRefusal: "First refusal: {q}", allBudgetsAccept: "Every hypothetical budget accepts the observed measurements.", lineagePinned: "lineage pinned · sha256 present", lineageMissing: "lineage absent · the model card names no snapshot", budgetSource: "budget source: configs/targets/matrix.yaml", verdictStatus: "{verdict} — first refusal {q}",
  gateQ1Name: "post-quant mAP@0.50 drop", gateQ1Detail: "converted TFLite INT8 is evaluated as a new model",
  gateQ2Name: "x86 TFLite p95 latency", gateQ2Detail: "budget is target-specific and checked after conversion",
  gateQ3Name: "ARM64 TFLite p95 latency", gateQ3Detail: "execution substrate is benchmark provenance, not part of the target id",
  gateQ4Name: "INT8 artifact size", gateQ4Detail: "size budget protects device rollout constraints",
  gateQ5Name: "dataset lineage pinned", gateQ5Detail: "model card must name the dataset snapshot used for evaluation",

  detectorEyebrow: "The product, in your hands", detectorTitle: "Bring a warehouse frame.", detectorLead: "The image goes to the live scale-to-zero ONNX API, is processed in memory and is not retained.",
  dropImage: "Drop an image or choose a file", dropLimit: "JPEG, PNG or WebP · maximum 5 MiB", confidence: "Confidence threshold", runInference: "Run live inference", chooseImage: "Choose an image to begin.", canvasEmpty: "Your frame and detections appear here.", liveResponse: "Live response", runtime: "Runtime", model: "Model", modelHash: "SHA-256", requestTime: "Request time", noDetections: "No detections yet.", timingBoundary: "Per-request time is interactive timing on Cloud Run, not the controlled benchmark p95.",
  wakingModel: "Waking the model…", coldStartWait: "The first request may wait for a scale-to-zero cold start.", fileReady: "{name} ready. Run live inference.", detectionsDone: "Detections: {n} · image processed in memory and not retained.", inferenceFailed: "Inference did not complete: {msg}", noObjectsThreshold: "No objects passed this confidence threshold.", uploadType: "Use a JPEG, PNG or WebP image.", uploadSize: "Image exceeds the 5 MiB limit.", liveRequestInFlight: "live request in flight…", verifyMatch: "verified · matches the Dockerfile pin", copy: "Copy", copied: "Copied",

  traceEyebrow: "Evidence, not confidence", traceTitle: "Every parent of the verdict, on screen.", traceLead: "Open any link in the chain to see the full immutable identifier behind the short label.",
  traceRun: "Run", traceConfig: "Model config", traceDataset: "Dataset", traceCalibration: "Calibration", traceBudgetCommit: "Budget commit", traceSourceCommit: "Source commit", traceWandb: "W&B",

  fleetEyebrow: "One model, several runtimes", fleetTitle: "The target is part of the release.", fleetLead: "Reference and trend lanes stay visibly separate; ARM64 container timing is not presented as physical-device latency.", thTarget: "Target", thLane: "Lane", thQuality: "Quality", thSize: "Size", laneReference: "reference", laneTrend: "trend", trendLaneNote: "trend lane — not device latency",

  opsEyebrow: "Production posture", opsTitle: "Cheap when idle. Bounded when busy. Explainable always.", opsLead: "Platform engineering is the set of constraints that remain true after the demo ends.",
  opsIdentity: "IDENTITY", opsIdentityTitle: "No ambient project power", opsIdentityBody: "The runtime service account has no project roles. The model is bundled and fingerprint-checked at startup.",
  opsSupply: "SUPPLY CHAIN", opsSupplyTitle: "Digest, not a mutable tag", opsSupplyBody: "Terraform pins the exact container digest. Artifact Registry deletes untagged images after seven days.",
  opsCost: "COST", opsCostTitle: "Scale 0 → 1, never beyond", opsCostBody: "One CPU, 1 GiB, concurrency four, request-only CPU and no always-on instance.",
  opsFailure: "FAILURE", opsFailureTitle: "Fail closed at every seam", opsFailureBody: "Model hash mismatch blocks readiness; missing evidence renders a dash; failed gates block promotion.",
  routeIdle: "DEFINED path · no request in flight", hopTimingNote: "hop timing illustrative — only total request time and inference_ms are measured", hopBrowser: "Browser", hopDns: "Azure DNS", hopFrontend: "Google Frontend", hopRun: "Cloud Run", hopOnnx: "ONNX Runtime",

  storyEyebrow: "Why this exists", storyTitle: "Six failure modes, one operating model.", methodEyebrow: "Method and scope", methodTitle: "What this system proves.", methodLead: "Observed numbers come from versioned artifacts. Missing evidence renders a dash, never a convenient fallback.", developerContract: "Developer contract", returnPlatform: "Return to the platform map ↑",

  sourceLabel: "Source", labelMeasured: "measured", labelBudget: "budget", laneDefault: "default", openGateLab: "Open the gate lab ↑", playLane: "Play the lane ▶", fanInLead: "One committed command composes nine retained fragments into the observed run.", inferenceTime: "Inference time", verifyLabel: "Model verification",
  truthSimulatedNote: "your hypothetical — nothing executed",

  rail: {
    scrub: "Scrub the build", start: "start — nothing replayed", source: "Source {path}", noParents: "no parents",
    lineage: "Lineage: {n} parents highlighted · Escape clears", lineageRoot: "Lineage: no parents — this is a root event",
    phase: { design: "design", foundation: "foundation", data: "data", train: "train", qualify: "qualify", release: "release", portability: "portability", serve: "serve", edge: "edge", product: "product" },
  },

  aria: {
    home: "Peregrine home", workspaces: "Application workspaces", switchLang: "Перейти українською", qualification: "Model qualification sequence", metrics: "Observed metrics", layers: "Platform layers", legend: "Evidence state legend", route: "Production request route", backToTop: "Back to top",
    workspaceTabs: "Workspaces", automation: "Automation lanes", tfMode: "Terraform mode",
    uploadedFrame: "Uploaded warehouse frame", uploadedImage: "Uploaded image: {name}",
  },
};
