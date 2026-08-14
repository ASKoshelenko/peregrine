import { loadPlatformEventModel } from "./components/platform-event-model.js";
import { registerPwaShell } from "./components/pwa-shell.js";

const EVIDENCE_URL = "/artifacts/observed/latest.json";
const API_BASE = window.PEREGRINE_API_BASE || "";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const translations = {
  en: {
    skip: "Skip to the release bench", navPlatform: "Platform", navPipeline: "Pipeline", navControl: "Control room", navGate: "Gate lab", navDetector: "Detector", navOps: "Evidence", source: "Source ↗",
    heroEyebrow: "Platform engineering · MLOps · edge inference", heroTitle: "I did not deploy a model. I built the system that decides if it deserves deployment.", heroLede: "Dataset lineage, reproducible training, target-specific conversion, release gates, immutable infrastructure and a live service form one <em>operating model</em>.", heroPrimary: "Walk the platform", heroSecondary: "Run the product", qualificationLabel: "PLATFORM / LIVE EVIDENCE", qData: "Version data", qTrain: "Train & track", qQualify: "Qualify targets", qGate: "Enforce policy", qServe: "Serve safely",
    platformEyebrow: "01 · The platform under the model", platformTitle: "Follow one artifact through the whole system.", platformLead: "Select a layer. The map shows what it owns, what it emits, and which engineering control prevents a quiet failure.", layerSource: "Source & contract", layerData: "Data plane", layerTrain: "Experiment plane", layerQualify: "Qualification plane", layerRelease: "Release control", layerServe: "Serving plane", ownershipLabel: "What I owned end to end", ownershipValue: "Architecture · IaC · MLOps contracts · security boundaries · cost controls · product UX · production verification",
    pipelineEyebrow: "02 · Delivery, not a notebook", pipelineTitle: "Every transition leaves proof.", pipelineLead: "The pipeline is an evidence conveyor: each stage consumes pinned parents, emits an immutable artifact and may stop the release.", legendArtifact: "artifact", legendControl: "control", legendEvidence: "evidence",
    controlEyebrow: "03 · Platform control room", controlTitle: "Watch the system build its own proof.", controlLead: "Replay the recorded, evidence-backed release. Live state is polled from production; defined automation is never presented as executed.", truthLive: "queried now", truthRecorded: "real retained run", truthDefined: "automation contract", replayRun: "Replay real release", replayBoundary: "No compute is started. This replays retained evidence.", automationTitle: "Automation surfaces", infraTitle: "Infrastructure creation and request path", infraProvision: "End-to-end build", infraRuntime: "Runtime request", buildPlatform: "Build the platform",
    gateEyebrow: "03 · Policy as executable code", gateTitle: "Make the release system say no.", gateLead: "Change a hypothetical budget. The observed measurements stay fixed; only your scenario changes.", detectorEyebrow: "04 · The product, in your hands", detectorTitle: "Bring a warehouse frame.", detectorLead: "The image goes to the live scale-to-zero ONNX API, is processed in memory and is not retained.", traceEyebrow: "05 · Evidence, not confidence", traceTitle: "Every parent of the verdict, on screen.", traceLead: "Open any link in the chain to see the full immutable identifier behind the short label.", fleetEyebrow: "06 · One model, several runtimes", fleetTitle: "The target is part of the release.", fleetLead: "Reference and trend lanes stay visibly separate; ARM64 container timing is not presented as physical-device latency.", thTarget: "Target", thLane: "Lane", thQuality: "Quality", thSize: "Size",
    opsEyebrow: "07 · Production posture", opsTitle: "Cheap when idle. Bounded when busy. Explainable always.", opsLead: "Platform engineering is the set of constraints that remain true after the demo ends.", opsIdentityTitle: "No ambient project power", opsIdentityBody: "The runtime service account has no project roles. The model is bundled and fingerprint-checked at startup.", opsSupplyTitle: "Digest, not a mutable tag", opsSupplyBody: "Terraform pins the exact container digest. Artifact Registry deletes untagged images after seven days.", opsCostTitle: "Scale 0 → 1, never beyond", opsCostBody: "One CPU, 1 GiB, concurrency four, request-only CPU and no always-on instance.", opsFailureTitle: "Fail closed at every seam", opsFailureBody: "Model hash mismatch blocks readiness; missing evidence renders a dash; failed gates block promotion.", storyEyebrow: "08 · Why this exists", storyTitle: "Six failure modes, one operating model.", methodEyebrow: "09 · Method and scope", methodTitle: "What this system proves.", methodLead: "Observed numbers come from versioned artifacts. Missing evidence renders a dash, never a convenient fallback.", returnPlatform: "Return to the platform map ↑", backToTop: "Top", footer: "Peregrine · a platform story backed by running evidence", mobilePlatform: "Platform", mobileTry: "Try detector",
  },
  uk: {
    skip: "Перейти до платформи", navPlatform: "Платформа", navPipeline: "Пайплайн", navControl: "Control room", navGate: "Релізний гейт", navDetector: "Детектор", navOps: "Докази", source: "Код ↗",
    heroEyebrow: "Platform engineering · MLOps · edge inference", heroTitle: "Я не просто розгорнув модель. Я побудував систему, яка вирішує, чи заслуговує вона на реліз.", heroLede: "Походження даних, відтворюване навчання, конвертація під ціль, релізні гейти, незмінна інфраструктура й живий сервіс утворюють одну <em>операційну модель</em>.", heroPrimary: "Пройти платформу", heroSecondary: "Запустити продукт", qualificationLabel: "ПЛАТФОРМА / ЖИВІ ДОКАЗИ", qData: "Версіонувати дані", qTrain: "Навчити й відстежити", qQualify: "Перевірити цілі", qGate: "Застосувати політику", qServe: "Безпечно обслуговувати",
    platformEyebrow: "01 · Платформа під моделлю", platformTitle: "Пройдіть шлях одного артефакту крізь усю систему.", platformLead: "Оберіть шар. Карта покаже, чим він володіє, що випускає і який інженерний контроль не дає помилці пройти непомітно.", layerSource: "Код і контракт", layerData: "Контур даних", layerTrain: "Контур експериментів", layerQualify: "Контур кваліфікації", layerRelease: "Релізний контроль", layerServe: "Контур обслуговування", ownershipLabel: "За що я відповідав end to end", ownershipValue: "Архітектура · IaC · MLOps-контракти · межі безпеки · контроль вартості · UX продукту · production verification",
    pipelineEyebrow: "02 · Поставка, а не ноутбук", pipelineTitle: "Кожен перехід залишає доказ.", pipelineLead: "Пайплайн — це конвеєр доказів: кожен етап споживає зафіксованих батьків, випускає незмінний артефакт і може зупинити реліз.", legendArtifact: "артефакт", legendControl: "контроль", legendEvidence: "доказ",
    controlEyebrow: "03 · Центр керування платформою", controlTitle: "Подивіться, як система будує власний доказ.", controlLead: "Відтворіть реальний збережений реліз. Live-стан опитується з production, а визначена автоматизація ніколи не видається за виконану.", truthLive: "опитано зараз", truthRecorded: "реальний збережений run", truthDefined: "контракт автоматизації", replayRun: "Відтворити реальний реліз", replayBoundary: "Новий compute не запускається. Це replay збережених доказів.", automationTitle: "Контури автоматизації", infraTitle: "Створення інфраструктури та шлях запиту", infraProvision: "End-to-end build", infraRuntime: "Runtime-запит", buildPlatform: "Побудувати платформу",
    gateEyebrow: "03 · Політика як виконуваний код", gateTitle: "Змусьте релізну систему сказати «ні».", gateLead: "Змініть гіпотетичний бюджет. Виміряні значення залишаються незмінними — змінюється лише ваш сценарій.", detectorEyebrow: "04 · Продукт у ваших руках", detectorTitle: "Завантажте кадр зі складу.", detectorLead: "Зображення йде до живого ONNX API зі scale-to-zero, обробляється в памʼяті й не зберігається.", traceEyebrow: "05 · Докази замість упевненості", traceTitle: "Кожен предок вердикту — на екрані.", traceLead: "Розкрийте будь-яку ланку, щоб побачити повний незмінний ідентифікатор.", fleetEyebrow: "06 · Одна модель, кілька runtime", fleetTitle: "Цільова платформа — частина релізу.", fleetLead: "Еталонні й трендові контури розділені; ARM64 container timing не видається за latency фізичного пристрою.", thTarget: "Ціль", thLane: "Контур", thQuality: "Якість", thSize: "Розмір",
    opsEyebrow: "07 · Production posture", opsTitle: "Дешево у спокої. Обмежено під навантаженням. Пояснювано завжди.", opsLead: "Platform engineering — це набір обмежень, які залишаються правдивими після завершення демо.", opsIdentityTitle: "Жодної фонової влади над проєктом", opsIdentityBody: "Runtime service account не має project roles. Модель вбудована й перевіряється за fingerprint під час старту.", opsSupplyTitle: "Digest, а не змінний тег", opsSupplyBody: "Terraform фіксує точний digest контейнера. Artifact Registry видаляє untagged images через сім днів.", opsCostTitle: "Scale 0 → 1, і ніколи вище", opsCostBody: "Один CPU, 1 GiB, concurrency чотири, CPU лише під час запиту й жодного постійного інстансу.", opsFailureTitle: "Fail closed на кожному шві", opsFailureBody: "Невірний hash моделі блокує readiness; відсутній доказ дає тире; провалений гейт блокує promotion.", storyEyebrow: "08 · Навіщо це існує", storyTitle: "Шість режимів відмови, одна операційна модель.", methodEyebrow: "09 · Метод і межі", methodTitle: "Що доводить ця система.", methodLead: "Виміряні числа приходять із версіонованих артефактів. Відсутній доказ дає тире, а не зручну підстановку.", returnPlatform: "Повернутися до карти платформи ↑", backToTop: "Вгору", footer: "Peregrine · історія платформи, підтверджена працюючими доказами", mobilePlatform: "Платформа", mobileTry: "Спробувати",
  },
};

let language = localStorage.getItem("peregrine-language") || (navigator.language.startsWith("uk") ? "uk" : "en");
const t = (key) => translations[language][key] || translations.en[key] || key;

const pains = [
  ["The INT8 accuracy cliff", "A checkpoint passes evaluation; conversion quietly changes the answer.", "Version calibration membership and gate the converted model.", "Open Q1 in the Gate Lab", "Which target bites you hardest today—TFLite, TensorRT or the DSP?"],
  ["Research → production", "A notebook and a checkpoint are not an operational handoff.", "Ship a package, resolved config, fingerprints and an explicit serving contract.", "Trace the run lineage", "What does a handoff artifact look like in your team today?"],
  ["A heterogeneous fleet", "Runtime and delegate updates change what executes where.", "Keep a target matrix with separate quality, latency and size budgets.", "Compare the device lanes", "What re-validates models when a runtime changes?"],
  ["The dataset keeps moving", "Relabels break comparison even when no new image appears.", "Version snapshots, label space and calibration membership together.", "Inspect the dataset fingerprint", "Does a label-only change force a re-baseline today?"],
  ["January cannot be reproduced", "Configs become folklore and dashboards drift.", "Materialize the full config and bind it to model, dataset and environment hashes.", "Open the evidence chain", "Could January's run be rebuilt from its config alone?"],
  ["Queues, quotas and the bill", "Compute availability fails exactly when a release needs proof.", "Register the question and cost bound before allocating a run; retain failed attempts.", "Read the Vertex run ledger", "Who owns the training bill—and has quota blocked a deadline?"],
];
const painsUk = [
  ["INT8 cliff якості", "Checkpoint проходить evaluation, а конвертація непомітно змінює відповідь.", "Версіонуйте calibration membership і перевіряйте вже конвертовану модель.", "Відкрити Q1 у релізному гейті", "Яка ціль сьогодні болить найбільше — TFLite, TensorRT чи DSP?"],
  ["Research → production", "Ноутбук і checkpoint — це не операційна передача.", "Передавайте package, resolved config, fingerprints і явний serving contract.", "Пройти lineage запуску", "Як сьогодні виглядає handoff artifact у вашій команді?"],
  ["Неоднорідний fleet", "Оновлення runtime і delegate змінюють, що й де виконується.", "Тримайте target matrix з окремими бюджетами якості, latency й size.", "Порівняти device lanes", "Що повторно валідує моделі після зміни runtime?"],
  ["Дані постійно рухаються", "Relabeling ламає порівняння навіть без нових зображень.", "Версіонуйте snapshot, label space і calibration membership разом.", "Перевірити fingerprint даних", "Чи змушує зміна лише labels робити re-baseline?"],
  ["Січень не відтворити", "Конфіги стають фольклором, а dashboards дрейфують.", "Матеріалізуйте повний config і звʼязуйте його з hash моделі, даних та environment.", "Відкрити evidence chain", "Чи можна відбудувати січневий run лише з його config?"],
  ["Черги, квоти й рахунок", "Compute availability підводить саме тоді, коли релізу потрібен доказ.", "Запишіть питання й cost bound до allocation; зберігайте невдалі спроби.", "Подивитися cloud lineage", "Хто володіє training bill — і чи блокувала quota дедлайн?"],
];

const platformLayers = {
  en: {
    source: ["Source & contract", "The repository is the control plane: Hydra configs, schemas, target budgets and architecture decisions are reviewed before compute starts.", "versioned application · resolved configs · decision record", "make check · strict mypy · 64 tests"],
    data: ["Data plane", "A reviewed Roboflow version becomes a validated two-class snapshot. DVC points to private GCS objects; the dataset fingerprint follows every child.", "data/raw → data/processed → calibration manifest", "license gate · split leakage check · sha256"],
    train: ["Experiment plane", "The free Colab T4 run consumes the pinned snapshot. W&B carries experiment telemetry; the repository carries the reproducible contract.", "best.pt · resolved config · run metadata", "deterministic seeds · config hash · run commit"],
    qualify: ["Qualification plane", "FP32 ONNX and INT8 TFLite are treated as different products. Each is re-evaluated, benchmarked and labeled by target and host.", "best.onnx · best-int8.tflite · benchmark fragments", "golden preprocess · calibration membership · target matrix"],
    release: ["Release control", "A budget commit predates the measurements. Five gates join quality, latency, size and lineage into one machine-readable verdict.", "artifacts/observed/latest.json · model card", "budget-before-run · first-failure refusal · immutable parents"],
    serve: ["Serving plane", "Terraform enables only the required APIs, pins the image digest and creates a role-free runtime identity. Azure DNS delegates the product hostname to Cloud Run.", "Artifact Registry → Cloud Run → peregrine.devopsdive.com", "SHA startup check · min 0/max 1 · TLS · in-memory uploads"],
  },
  uk: {
    source: ["Код і контракт", "Репозиторій — це control plane: Hydra-конфіги, схеми, бюджети цілей та архітектурні рішення проходять ревʼю до запуску compute.", "versioned application · resolved configs · decision record", "make check · strict mypy · 64 тести"],
    data: ["Контур даних", "Перевірена версія Roboflow стає валідованим двокласовим snapshot. DVC вказує на приватні обʼєкти GCS; fingerprint даних іде з кожним нащадком.", "data/raw → data/processed → calibration manifest", "license gate · перевірка leakage · sha256"],
    train: ["Контур експериментів", "Безкоштовний Colab T4 run споживає зафіксований snapshot. W&B несе телеметрію, репозиторій — відтворюваний контракт.", "best.pt · resolved config · run metadata", "deterministic seeds · config hash · run commit"],
    qualify: ["Контур кваліфікації", "FP32 ONNX та INT8 TFLite вважаються різними продуктами. Кожен повторно оцінюється, benchmark-иться й маркується за target та host.", "best.onnx · best-int8.tflite · benchmark fragments", "golden preprocess · calibration membership · target matrix"],
    release: ["Релізний контроль", "Commit із бюджетами існує до вимірювань. Пʼять гейтів зводять якість, latency, size і lineage в один machine-readable verdict.", "artifacts/observed/latest.json · model card", "budget-before-run · first-failure refusal · immutable parents"],
    serve: ["Контур обслуговування", "Terraform вмикає лише потрібні API, фіксує digest image і створює runtime identity без ролей. Azure DNS делегує hostname продукту в Cloud Run.", "Artifact Registry → Cloud Run → peregrine.devopsdive.com", "SHA startup check · min 0/max 1 · TLS · in-memory uploads"],
  },
};

const pipelineStages = {
  en: [
    ["DATA", "Validate snapshot", "dataset fingerprint", "license · schema · leakage"],
    ["TRAIN", "Reproduce experiment", "checkpoint + config", "seed · W&B · commit"],
    ["CONVERT", "Build target artifacts", "ONNX + INT8", "calibration hash"],
    ["MEASURE", "Test every target", "accuracy + p95 + size", "host provenance"],
    ["DECIDE", "Execute Q1—Q5", "PROMOTE / BLOCK", "committed budgets"],
    ["SERVE", "Pin and deploy digest", "live revision", "readiness · max 1"],
  ],
  uk: [
    ["ДАНІ", "Перевірити snapshot", "fingerprint даних", "ліцензія · схема · leakage"],
    ["НАВЧАННЯ", "Відтворити експеримент", "checkpoint + config", "seed · W&B · commit"],
    ["КОНВЕРТАЦІЯ", "Зібрати target artifacts", "ONNX + INT8", "calibration hash"],
    ["ВИМІР", "Перевірити кожну ціль", "accuracy + p95 + size", "host provenance"],
    ["РІШЕННЯ", "Виконати Q1—Q5", "PROMOTE / BLOCK", "зафіксовані бюджети"],
    ["СЕРВІС", "Закріпити й розгорнути digest", "жива ревізія", "readiness · max 1"],
  ],
};

const automation = {
  en: [
    ["PR quality", "PR / manual", "DEFINED", "ruff → format → mypy → pytest → observe", "Executable CI; intentionally not triggered on main push."],
    ["Model qualification", "recorded run", "RECORDED", "data → train → convert → measure → Q1—Q5", "Real retained evidence from the judged release."],
    ["Target matrix", "manual release", "DEFINED", "ONNX FP32 ∥ TFLite INT8 ∥ ARM64 trend", "Matrix definition exists; no empty Actions run was spent."],
    ["Production rollout", "reviewed apply", "LIVE", "build → registry digest → Terraform plan → Cloud Run", "The running revision is joined below from production."],
  ],
  uk: [
    ["Якість PR", "PR / вручну", "DEFINED", "ruff → format → mypy → pytest → observe", "Виконуваний CI; навмисно не запускається на main push."],
    ["Кваліфікація моделі", "збережений run", "RECORDED", "data → train → convert → measure → Q1—Q5", "Реальні збережені докази оціненого релізу."],
    ["Матриця цілей", "ручний release", "DEFINED", "ONNX FP32 ∥ TFLite INT8 ∥ ARM64 trend", "Matrix визначена; порожні хвилини Actions не витрачалися."],
    ["Production rollout", "reviewed apply", "LIVE", "build → registry digest → Terraform plan → Cloud Run", "Поточна revision приєднується нижче безпосередньо з production."],
  ],
};

const infraViews = {
  en: {
    provision: {
      nodes: [["00", "Product contract", "questions + budgets"], ["01", "GCP project", "cost boundary"], ["02", "APIs + identity", "least privilege"], ["03", "GCS + DVC", "versioned data"], ["04", "Dataset gate", "790 images · 2 classes"], ["05", "Colab T4 + W&B", "tracked baseline"], ["06", "Conversion", "ONNX + INT8"], ["07", "Target matrix", "quality · p95 · size"], ["08", "Release Q1—Q5", "PROMOTE / BLOCK"], ["09", "Container + Registry", "immutable digest"], ["10", "Cloud Run", "0 → 1 instance"], ["11", "DNS + TLS + PWA", "live product"]],
      caption: "This is the recorded construction order: every node consumes the previous contract and emits a verifiable parent for the next one.",
    },
    runtime: {
      nodes: [["01", "Browser / PWA", "image bytes"], ["02", "Azure DNS", "CNAME"], ["03", "Google Frontend", "TLS"], ["04", "Cloud Run", "request CPU"], ["05", "ONNX Runtime", "verified model"], ["06", "Evidence response", "boxes + lineage"]],
      caption: "The upload is decoded and inferred in memory. No image is retained; scale-to-zero and max one instance bound idle and abuse cost.",
    },
  },
  uk: {
    provision: {
      nodes: [["00", "Контракт продукту", "питання + бюджети"], ["01", "GCP project", "межа вартості"], ["02", "API + identity", "least privilege"], ["03", "GCS + DVC", "версійовані дані"], ["04", "Dataset gate", "790 images · 2 класи"], ["05", "Colab T4 + W&B", "tracked baseline"], ["06", "Конвертація", "ONNX + INT8"], ["07", "Target matrix", "якість · p95 · size"], ["08", "Release Q1—Q5", "PROMOTE / BLOCK"], ["09", "Container + Registry", "незмінний digest"], ["10", "Cloud Run", "0 → 1 instance"], ["11", "DNS + TLS + PWA", "живий продукт"]],
      caption: "Це зафіксований порядок побудови: кожен вузол споживає попередній контракт і випускає перевірюваного батька для наступного.",
    },
    runtime: {
      nodes: [["01", "Browser / PWA", "байти image"], ["02", "Azure DNS", "CNAME"], ["03", "Google Frontend", "TLS"], ["04", "Cloud Run", "CPU на запит"], ["05", "ONNX Runtime", "перевірена модель"], ["06", "Evidence response", "boxes + lineage"]],
      caption: "Upload декодується й обробляється в памʼяті. Image не зберігається; scale-to-zero і max one instance обмежують idle та abuse cost.",
    },
  },
};

let evidence;
let platformState;
let platformEvents;
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

async function loadPlatform() {
  const response = await fetch(`${API_BASE}/api/platform`, { cache: "no-store" });
  if (!response.ok) throw new Error(`platform HTTP ${response.status}`);
  return response.json();
}

function applyLanguage() {
  const activeLayer = document.querySelector(".platform-node.is-active")?.dataset.layer || "source";
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((node) => { node.innerHTML = t(node.dataset.i18nHtml); });
  const switcher = $("#language-switch");
  switcher.textContent = language === "en" ? "УКР" : "ENG";
  switcher.setAttribute("aria-label", language === "en" ? "Перейти українською" : "Switch to English");
  document.title = language === "en" ? "Peregrine — the platform that qualifies an edge model" : "Peregrine — платформа, що кваліфікує edge-модель";
  renderPlatform(activeLayer);
  renderPipeline();
  renderAutomation();
  renderInfra(document.querySelector("[data-infra-view][aria-selected='true']")?.dataset.infraView || "provision");
  renderPains();
  if (evidence) renderEvidence(evidence);
}

function renderPlatform(layer) {
  const [title, body, artifact, control] = platformLayers[language][layer];
  document.querySelectorAll(".platform-node").forEach((node) => node.classList.toggle("is-active", node.dataset.layer === layer));
  const live = platformState ? `<div class="live-deployment"><span>LIVE</span><b>${platformState.service} · ${platformState.revision}</b><code>${short(platformState.image_digest)}</code></div>` : "";
  $("#platform-detail").innerHTML = `${live}<p class="panel-label">${language === "en" ? "SELECTED LAYER" : "ОБРАНИЙ ШАР"}</p><h3>${title}</h3><p>${body}</p><dl><div><dt>${language === "en" ? "Emits" : "Випускає"}</dt><dd>${artifact}</dd></div><div><dt>${language === "en" ? "Control" : "Контроль"}</dt><dd>${control}</dd></div></dl>`;
}

function renderPipeline() {
  const facts = [
    evidence ? short(evidence.lineage.dataset_fingerprint) : "—",
    evidence ? evidence.run_id : "—",
    evidence ? `${Object.keys(evidence.targets).length} target artifacts` : "—",
    evidence ? `${fmt(evidence.targets.x86_tflite_int8.p95_ms)} ms p95` : "—",
    evidence ? (evidence.release_verdict.passed ? "PROMOTE" : "BLOCK") : "—",
    platformState ? platformState.revision : "—",
  ];
  $("#pipeline-flow").innerHTML = pipelineStages[language].map(([code, title, artifact, control], index) => `<button class="pipeline-stage" type="button" aria-expanded="${index === 0}"><span>${String(index + 1).padStart(2, "0")} / ${code}</span><b>${title}</b><small>${artifact}</small><code>${facts[index]}</code><em>${control}</em></button>`).join("");
  $("#pipeline-flow").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    $("#pipeline-flow").querySelectorAll("button").forEach((item) => item.setAttribute("aria-expanded", "false"));
    button.setAttribute("aria-expanded", String(!expanded));
  }));
}

function renderAutomation() {
  $("#automation-list").innerHTML = automation[language].map(([name, trigger, state, flow, note]) => {
    const liveDetail = state === "LIVE" && platformState ? `${platformState.revision} · ${short(platformState.image_digest)}` : trigger;
    return `<article class="automation-row"><div><span class="truth-${state.toLowerCase()}">${state}</span><b>${name}</b></div><code>${flow}</code><p>${note}</p><small>${liveDetail}</small></article>`;
  }).join("");
}

function renderInfra(view) {
  const selected = {...infraViews[language][view]};
  if (view === "provision" && platformEvents) selected.nodes = platformEvents.events.map((event, index) => [String(index).padStart(2, "0"), event.resource, event.evidence]);
  document.querySelectorAll("[data-infra-view]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.infraView === view)));
  $("#infra-canvas").innerHTML = selected.nodes.map(([step, name, proof], index) => `<button type="button" class="infra-node" data-infra-index="${index}"><span>${step}</span><b>${name}</b><small>${proof}</small>${index < selected.nodes.length - 1 ? '<i aria-hidden="true">→</i>' : ""}</button>`).join("");
  const live = platformState ? ` ${language === "en" ? "Live revision" : "Жива revision"}: ${platformState.revision}; ${platformState.cpu} CPU / ${platformState.memory}; ${platformState.min_instances}→${platformState.max_instances}.` : "";
  $("#infra-caption").textContent = selected.caption + live;
  $("#infra-canvas").querySelectorAll(".infra-node").forEach((node) => node.addEventListener("click", () => {
    $("#infra-canvas").querySelectorAll(".infra-node").forEach((item) => item.classList.remove("is-active"));
    node.classList.add("is-active");
    const event = view === "provision" ? platformEvents?.events[Number(node.dataset.infraIndex)] : null;
    const [, name, proof] = selected.nodes[Number(node.dataset.infraIndex)];
    $("#infra-caption").textContent = event ? `${event.action}. ${language === "en" ? "Control" : "Контроль"}: ${event.control}. ${language === "en" ? "Depends on" : "Залежить від"}: ${event.depends_on.join(", ") || "—"}.` : `${name} — ${proof}. ${selected.caption}${live}`;
  }));
}

let buildTimer;
function buildPlatformReplay() {
  clearInterval(buildTimer);
  renderInfra("provision");
  const nodes = [...$("#infra-canvas").querySelectorAll(".infra-node")];
  const button = $("#build-platform");
  const body = $("#console-body");
  body.innerHTML = "";
  nodes.forEach((node) => node.classList.remove("is-active", "is-complete"));
  button.disabled = true;
  let index = 0;
  const advance = () => {
    const node = nodes[index];
    if (index > 0) nodes[index - 1].classList.replace("is-active", "is-complete");
    node.classList.add("is-active");
    const title = node.querySelector("b").textContent;
    const proof = node.querySelector("small").textContent;
    body.insertAdjacentHTML("beforeend", `<div class="console-line console-ok"><span>✓</span><code>[${node.querySelector("span").textContent}] ${title} · ${proof}</code></div>`);
    body.scrollTop = body.scrollHeight;
    $("#infra-caption").textContent = `${language === "en" ? "Building" : "Будуємо"}: ${title} — ${proof}`;
    index += 1;
    if (index === nodes.length) {
      node.classList.replace("is-active", "is-complete");
      clearInterval(buildTimer);
      button.disabled = false;
      $("#infra-caption").textContent = `${infraViews[language].provision.caption} ${platformState ? `${language === "en" ? "Result" : "Результат"}: ${platformState.service}/${platformState.revision}.` : ""}`;
    }
  };
  advance();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) while (index < nodes.length) advance();
  else buildTimer = setInterval(advance, 520);
}

function recordedConsoleLines() {
  if (!evidence) return [["warn", language === "en" ? "Observed evidence is unavailable." : "Виміряні докази недоступні."]];
  const target = evidence.targets.x86_tflite_int8;
  const verdict = evidence.release_verdict.passed ? "PROMOTE" : "BLOCK";
  return [
    ["cmd", `$ make release RUN=${evidence.run_id}`],
    ["ok", `[data] fingerprint ${short(evidence.lineage.dataset_fingerprint)}`],
    ["ok", `[train] run ${evidence.run_id}`],
    ["ok", `[convert] ONNX + INT8 · calibration ${short(evidence.lineage.calibration_hash)}`],
    ["ok", `[measure] x86_tflite_int8 · p95 ${fmt(target.p95_ms)} ms · ${fmt(target.size_mb, 2)} MB`],
    ...evidence.release_verdict.gates.map((gate) => [gate.status === "pass" ? "ok" : "fail", `[${gate.gate_id}] ${gate.status.toUpperCase()} · ${gate.measured} ≤ ${gate.budget}`]),
    [verdict === "PROMOTE" ? "promote" : "fail", `[release] ${verdict} · evidence ${short(evidence.fingerprint)}`],
    ["live", `[serve] ${platformState ? `${platformState.service}/${platformState.revision}` : "production identity unavailable"}`],
  ];
}

function activateWorkspace(targetId, updateHistory = false) {
  const target = document.getElementById(targetId) || document.getElementById("top");
  const workspace = target.dataset.workspace || "story";
  document.body.dataset.workspace = workspace;
  document.querySelectorAll("[data-workspace]").forEach((section) => { section.hidden = section.dataset.workspace !== workspace; });
  document.querySelectorAll(".topbar nav a").forEach((link) => link.classList.toggle("is-current", link.getAttribute("href") === `#${target.id}`));
  if (updateHistory) history.pushState({ workspace, target: target.id }, "", `#${target.id}`);
  requestAnimationFrame(() => target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
}

let replayTimer;
function replayRelease() {
  clearInterval(replayTimer);
  const lines = recordedConsoleLines();
  const body = $("#console-body");
  const button = $("#replay-run");
  body.innerHTML = "";
  button.disabled = true;
  $("#replay-state").textContent = language === "en" ? "Replaying retained evidence…" : "Відтворюю збережені докази…";
  let index = 0;
  const append = () => {
    const [kind, line] = lines[index++];
    body.insertAdjacentHTML("beforeend", `<div class="console-line console-${kind}"><span>${kind === "cmd" ? "$" : kind === "fail" ? "×" : "✓"}</span><code>${line}</code></div>`);
    body.scrollTop = body.scrollHeight;
    if (index >= lines.length) {
      clearInterval(replayTimer);
      button.disabled = false;
      $("#replay-state").textContent = t("replayBoundary");
    }
  };
  append();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) while (index < lines.length) append();
  else replayTimer = setInterval(append, 360);
}

function renderEvidence(run) {
  const onnx = run.targets.x86_onnx_fp32;
  const int8 = run.targets.x86_tflite_int8;
  const drop = onnx.map50_proxy - int8.map50_proxy;
  $("#metrics").innerHTML = [
    metric(`${fmt(onnx.map50_proxy, 4)} → ${fmt(int8.map50_proxy, 4)}`, language === "uk" ? "Held-out mAP@0.50" : "Held-out mAP@0.50", `${language === "uk" ? "ціна квантизації" : "quantization cost"} ${fmt(drop, 4)}`),
    metric(`${fmt(int8.p95_ms)} ms`, "x86 INT8 p95", language === "uk" ? "100 виміряних запусків" : "100 measured invocations"),
    metric(`${fmt(int8.size_mb, 2)} MB`, language === "uk" ? "INT8 артефакт" : "INT8 artifact", `${fmt(onnx.size_mb / int8.size_mb, 1)}× ${language === "uk" ? "менше за ONNX" : "smaller than ONNX"}`),
    metric(run.release_verdict.passed ? "PROMOTE" : "BLOCK", language === "uk" ? "Виміряний вердикт" : "Observed verdict", `${run.release_verdict.gates.length} ${language === "uk" ? "зафіксованих гейтів" : "committed gates"}`),
  ].join("");
  $("#hero-verdict").textContent = run.release_verdict.passed ? "PROMOTE" : "BLOCK";
  $("#hero-verdict").className = run.release_verdict.passed ? "pass" : "block";
  $("#evidence-stamp").textContent = `${run.run_id} · ${run.accuracy_basis}`;
  $("#footer-run").textContent = `run ${run.run_id}`;
  renderGateLab(run);
  renderTrace(run);
  renderFleet(run);
  renderBoundaries(run);
  renderPipeline();
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
    return `<label class="gate-control" for="budget-${gate.gate_id}"><span><b>${gate.gate_id}</b>${gateText(gate).name}</span><output id="out-${gate.gate_id}">${gate.budget}</output><input id="budget-${gate.gate_id}" data-gate="${gate.gate_id}" type="range" min="${step}" max="${max}" step="${step}" value="${gate.budget}" /></label>`;
  }).join("");
  $("#gate-controls").querySelectorAll("input").forEach((input) => input.addEventListener("input", updateScenario));
  $("#lineage-toggle").onchange = updateScenario;
  $("#reset-gates").onclick = () => {
    numeric.forEach((gate) => { $(`#budget-${gate.gate_id}`).value = gate.budget; });
    $("#lineage-toggle").checked = true;
    updateScenario();
  };
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
  $("#gate-list").innerHTML = results.map((gate) => `<article class="gate-row ${gate.passed ? "gate-pass" : "gate-block"}"><span class="gate-mark" aria-hidden="true">${gate.passed ? "✓" : "×"}</span><div><b>${gate.gate_id} · ${gateText(gate).name}</b><small>${gateText(gate).detail}</small></div><div class="gate-values"><span>${gate.measured}</span><small>≤ ${gate.budget}</small></div><strong>${gate.passed ? "PASS" : "BLOCK"}</strong></article>`).join("");
  $("#scenario-verdict").className = `verdict-card ${failed.length ? "verdict-block" : "verdict-pass"}`;
  $("#scenario-verdict").innerHTML = `<span>${language === "uk" ? "Симуляція сценарію" : "Scenario simulation"}</span><strong>${failed.length ? "BLOCK" : "PROMOTE"}</strong><p>${failed.length ? `${language === "uk" ? "Перша відмова" : "First refusal"}: ${failed[0].gate_id} · ${gateText(failed[0]).name}` : language === "uk" ? "Усі гіпотетичні бюджети приймають виміряні значення." : "Every hypothetical budget accepts the observed measurements."}</p>`;
}

function gateText(gate) {
  if (language !== "uk") return gate;
  const values = {
    Q1: ["падіння mAP@0.50 після квантизації", "конвертована TFLite INT8 оцінюється як нова модель"],
    Q2: ["x86 TFLite p95 latency", "бюджет привʼязаний до target і перевіряється після конвертації"],
    Q3: ["ARM64 TFLite p95 latency", "середовище виконання — provenance benchmark, а не частина target id"],
    Q4: ["розмір INT8 артефакту", "бюджет розміру захищає обмеження device rollout"],
    Q5: ["lineage даних зафіксовано", "model card має називати snapshot даних для evaluation"],
  };
  return { ...gate, name: values[gate.gate_id][0], detail: values[gate.gate_id][1] };
}

function renderTrace(run) {
  const labels = language === "uk" ? ["Запуск", "Конфіг моделі", "Дані", "Калібрування", "Commit бюджетів", "Commit коду", "W&B"] : ["Run", "Model config", "Dataset", "Calibration", "Budget commit", "Source commit", "W&B"];
  const items = [[labels[0], run.run_id], [labels[1], run.lineage.config_sha256], [labels[2], run.lineage.dataset_fingerprint], [labels[3], run.lineage.calibration_hash], [labels[4], run.lineage.budget_commit], [labels[5], run.lineage.source_commit], [labels[6], run.lineage.wandb_run]];
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
  const items = language === "uk" ? painsUk : pains;
  $("#pain-list").innerHTML = items.map(([title, pain, approach, link, question], index) => `<article class="pain-row"><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${title}</h3><p>${pain}</p></div><div><p>${approach}</p><a href="${index === 0 ? "#gate-lab" : index === 2 ? "#fleet" : "#trace"}">${link} →</a></div><blockquote>${question}</blockquote></article>`).join("");
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
  $("#replay-run").addEventListener("click", replayRelease);
  $("#build-platform").addEventListener("click", buildPlatformReplay);
  document.querySelectorAll("[data-infra-view]").forEach((button) => button.addEventListener("click", () => renderInfra(button.dataset.infraView)));
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link) return;
    const targetId = link.getAttribute("href").slice(1) || "top";
    if (!document.getElementById(targetId)) return;
    event.preventDefault();
    activateWorkspace(targetId, true);
  });
  window.addEventListener("popstate", () => activateWorkspace(location.hash.slice(1) || "top"));
  $("#language-switch").addEventListener("click", () => {
    language = language === "en" ? "uk" : "en";
    localStorage.setItem("peregrine-language", language);
    applyLanguage();
  });
  document.querySelectorAll(".platform-node").forEach((node) => node.addEventListener("click", () => renderPlatform(node.dataset.layer)));
  const updateScroll = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    const progress = available > 0 ? Math.min(1, window.scrollY / available) : 0;
    $("#reading-progress").style.transform = `scaleX(${progress})`;
    $("#back-to-top").classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.7);
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  $("#back-to-top").addEventListener("click", (event) => {
    event.currentTarget.blur();
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });
  updateScroll();
}

bindInteractions();
activateWorkspace(location.hash.slice(1) || "top");
applyLanguage();
try {
  evidence = await loadEvidence();
  renderEvidence(evidence);
} catch (error) {
  renderMissingEvidence(error);
}
try {
  platformEvents = await loadPlatformEventModel();
  renderInfra("provision");
} catch (error) {
  $("#infra-caption").textContent = `Platform event model unavailable: ${error.message}`;
}
try {
  platformState = await loadPlatform();
  renderPlatform(document.querySelector(".platform-node.is-active")?.dataset.layer || "source");
  renderPipeline();
} catch (error) {
  $("#platform-detail").insertAdjacentHTML("afterbegin", `<div class="live-deployment is-offline"><span>OFFLINE</span><b>${language === "en" ? "Live deployment identity unavailable" : "Ідентичність живого deployment недоступна"}</b></div>`);
}
registerPwaShell();
