// Системний словник ніколи не перекладається: LIVE / RECORDED / DEFINED / SIMULATED / PROMOTE / BLOCK / PASS,
// ідентифікатори гейтів і запусків, хеші, digest, шляхи в репозиторії, назви файлів, команди та назви продуктів лишаються дослівними в обох словниках.
export const uk = {
  skip: "Перейти до платформи", navPlatform: "Платформа", navControl: "Control room", navGate: "Релізний гейт", navDetector: "Детектор", navOps: "Докази", source: "Код ↗", backToTop: "Вгору", footer: "Peregrine · історія платформи, підтверджена працюючими доказами", footerRun: "run {run}", docTitle: "Peregrine — платформа, що кваліфікує edge-модель", switchLabel: "ENG",
  tabStory: "Історія", tabControl: "Контроль", tabGates: "Гейти", tabDetector: "Детектор", tabEvidence: "Докази", mobilePlatform: "Платформа", mobileTry: "Спробувати",

  heroEyebrow: "Platform engineering · MLOps · edge inference", heroTitle: "Я не просто розгорнув модель. Я побудував систему, яка вирішує, чи заслуговує вона на реліз.", heroLede: "Походження даних, відтворюване навчання, конвертація під ціль, релізні гейти, незмінна інфраструктура й живий сервіс утворюють одну <em>операційну модель</em>.", heroPrimary: "Пройти платформу", heroSecondary: "Запустити продукт",
  qualificationLabel: "ПЛАТФОРМА / ВИМІРЯНІ ДОКАЗИ", qualificationChips: "RECORDED run · LIVE сервіс", qData: "Версіонувати дані", qTrain: "Навчити й відстежити", qQualify: "Перевірити цілі", qGate: "Застосувати політику", qServe: "Безпечно обслуговувати",
  evidenceLoading: "Завантажую докази виміряного запуску…", evidenceStamp: "{run} · виміряно {date} · {basis}", evidenceNotLoaded: "Докази не завантажені: {msg}", evidenceUnavailable: "Докази недоступні", noSubstitution: "Жодне виміряне число не підставляється",
  metricQuality: "Held-out mAP@0.50", metricQuantCost: "ціна квантизації {v}", metricP95: "x86 INT8 p95", metricInvocations: "{n} виміряних запусків", metricProtocol: "фіксований протокол benchmark", metricInt8: "INT8 артефакт", metricSmaller: "{n}× менше за ONNX", metricVerdict: "Виміряний вердикт", metricGates: "{n} зафіксованих гейтів",

  platformEyebrow: "Платформа під моделлю", platformTitle: "Пройдіть шлях одного артефакту крізь усю систему.", platformLead: "Оберіть шар. Карта покаже, чим він володіє, що випускає і який інженерний контроль не дає помилці пройти непомітно.",
  layerSource: "Код і контракт", layerSourceBody: "Репозиторій — це control plane: Hydra-конфіги, схеми, бюджети цілей та архітектурні рішення проходять ревʼю до запуску compute.", layerSourceEmits: "versioned application · resolved configs · decision record", layerSourceControl: "make check · strict mypy · pytest",
  layerData: "Контур даних", layerDataBody: "Перевірена версія Roboflow стає валідованим двокласовим snapshot. DVC вказує на приватні обʼєкти GCS; fingerprint даних іде з кожним нащадком.", layerDataEmits: "data/raw → data/processed → calibration manifest", layerDataControl: "license gate · перевірка leakage · sha256",
  layerTrain: "Контур експериментів", layerTrainBody: "Безкоштовний Colab T4 run споживає зафіксований snapshot. W&B несе телеметрію, репозиторій — відтворюваний контракт.", layerTrainEmits: "best.pt · resolved config · run metadata", layerTrainControl: "deterministic seeds · config hash · run commit",
  layerQualify: "Контур кваліфікації", layerQualifyBody: "FP32 ONNX та INT8 TFLite вважаються різними продуктами. Кожен повторно оцінюється, benchmark-иться й маркується за target та host.", layerQualifyEmits: "best.onnx · best-int8.tflite · benchmark fragments", layerQualifyControl: "golden preprocess · calibration membership · target matrix",
  layerRelease: "Релізний контроль", layerReleaseBody: "Commit із бюджетами існує до вимірювань. Пʼять гейтів зводять якість, latency, size і lineage в один machine-readable verdict.", layerReleaseEmits: "artifacts/observed/latest.json · model card", layerReleaseControl: "budget-before-run · first-failure refusal · immutable parents",
  layerServe: "Контур обслуговування", layerServeBody: "Terraform вмикає лише потрібні API, фіксує digest image і створює runtime identity без ролей. Azure DNS делегує hostname продукту в Cloud Run.", layerServeEmits: "Artifact Registry → Cloud Run → peregrine.devopsdive.com", layerServeControl: "SHA startup check · min 0/max 1 · TLS · in-memory uploads",
  selectedLayer: "ОБРАНИЙ ШАР", emits: "Випускає", control: "Контроль", layerStatus: "Шар {n} з {total} — {name}", ownershipLabel: "За що я відповідав end to end", ownershipValue: "Архітектура · IaC · MLOps-контракти · межі безпеки · контроль вартості · UX продукту · production verification",
  liveOffline: "Ідентичність живого deployment недоступна", checkedAgo: "перевірено {s} с тому", liveUnavailable: "live-підтвердження недоступне — лише контракт, стан не стверджується",

  pipelineEyebrow: "Поставка, а не ноутбук", pipelineTitle: "Кожен перехід залишає доказ.", pipelineLead: "Пайплайн — це конвеєр доказів: кожен етап споживає зафіксованих батьків, випускає незмінний артефакт і може зупинити реліз.", legendArtifact: "артефакт", legendControl: "контроль", legendEvidence: "доказ",
  stageDataName: "Перевірити snapshot", stageDataArtifact: "fingerprint даних", stageDataControl: "ліцензія · схема · leakage",
  stageTrainName: "Відтворити експеримент", stageTrainArtifact: "checkpoint + config", stageTrainControl: "seed · W&B · commit",
  stageConvertName: "Зібрати target artifacts", stageConvertArtifact: "ONNX + INT8", stageConvertControl: "calibration hash",
  stageMeasureName: "Перевірити кожну ціль", stageMeasureArtifact: "accuracy + p95 + size", stageMeasureControl: "host provenance",
  stageDecideName: "Виконати Q1—Q5", stageDecideArtifact: "PROMOTE / BLOCK", stageDecideControl: "зафіксовані бюджети",
  stageServeName: "Закріпити й розгорнути digest", stageServeArtifact: "жива ревізія", stageServeControl: "readiness · max 1",
  replayLane: "Повторити конвеєр ⟳", laneRecordedNote: "RECORDED · run {run} · швидкість replay ілюстративна — реальне навчання тривало 8 хв 45 с, вартість $0", laneRecordedNoteShort: "RECORDED · run {run} · швидкість replay ілюстративна", stageStatus: "Етап {n} з {total} — {name}", targetArtifacts: "target-артефактів: {n}", trainTelemetry: "повна телеметрія збережена у W&B ↗",

  controlEyebrow: "Центр керування платформою", controlTitle: "Подивіться, як система будує власний доказ.", controlLead: "Відтворіть реальний збережений реліз. Live-стан опитується з production, а визначена автоматизація ніколи не видається за виконану.",
  truthLive: "опитано зараз", truthRecorded: "реальний збережений run", truthDefined: "контракт автоматизації", truthSimulated: "ваша гіпотеза",
  truthLiveChip: "LIVE · опитано зараз", truthRecordedChip: "RECORDED · реальний збережений run", truthDefinedChip: "DEFINED · контракт автоматизації", truthSimulatedChip: "SIMULATED — ваша гіпотеза, нічого не виконується", contractWatermark: "ПРОГРАВАННЯ КОНТРАКТУ — лише порядок, не виконання",
  replayRun: "Відтворити реальний реліз", replayBoundary: "Новий compute не запускається. Це replay збережених доказів.", replayRunning: "Відтворюю збережені докази…", replaySummary: "Replay завершено: {gates} гейтів перевірено, вердикт {verdict}",
  automationTitle: "Контури автоматизації", autoCi: "Якість PR", autoCiTrigger: "pull_request · workflow_dispatch", autoCiNote: "Виконуваний CI; навмисно не запускається на main push.",
  autoTrain: "Кваліфікація моделі", autoTrainTrigger: "workflow_dispatch · lane", autoTrainNote: "Реальні збережені докази оціненого релізу.",
  autoMatrix: "Матриця цілей", autoMatrixTrigger: "workflow_dispatch", autoMatrixNote: "Matrix визначена; порожні хвилини Actions не витрачалися.",
  autoDeploy: "Production rollout", autoDeployTrigger: "workflow_dispatch", autoDeployNote: "Поточна revision приєднується нижче безпосередньо з production.",
  walkCi: "Пройти CI-контракт", ciBadge: "DEFINED · виконуваний CI-контракт — програвання показує порядок, а не виконаний run", matrixBadge: "матриця DEFINED у release.yml · числа RECORDED з run {run} · хвилини Actions не витрачалися", noRetainedMeasurement: "— немає збереженого виміру",
  infraTitle: "Створення інфраструктури та шлях запиту", infraProvision: "End-to-end build", infraTerraform: "Terraform-контур", infraRuntime: "Runtime-запит", buildPlatform: "Побудувати платформу", buildPlay: "Програти build", buildPause: "Пауза", buildSummary: "Replay build завершено. Подій: {events}, збережених BLOCK: {blocks}.", replayingNow: "Відтворюю: {name} — {evidence}",
  workbenchBoundary: "Санітизований replay збережених доказів виконання. Ресурси не виділяються, compute не перезапускається.",
  terraformBadge: "RECORDED · збережені plans: peregrine-serving-bootstrap.tfplan · peregrine-serving-release.tfplan · live-стан приєднано з /api/platform", confirmedLive: "підтверджено live · {revision} · {digest}", liveRevision: "Жива revision", dependsOn: "Залежить від", tfBootstrap: "bootstrap", tfDeploy: "deploy", eventModelUnavailable: "Модель подій платформи недоступна: {msg}", pipelineModelUnavailable: "Модель пайплайнів недоступна: {msg}", sourceLine: "Джерело {path} → {field}",

  gateEyebrow: "Політика як виконуваний код", gateTitle: "Змусьте релізну систему сказати «ні».", gateLead: "Змініть гіпотетичний бюджет. Виміряні значення залишаються незмінними — змінюється лише ваш сценарій.",
  scenarioControls: "Керування сценарієм", lineagePresent: "Lineage даних присутній", resetRelease: "Скинути до виміряного релізу", simulationBoundary: "Гіпотетична симуляція. Вона не змінює зафіксовані бюджети, артефакти чи реєстр моделей.", scenarioSimulation: "Симуляція сценарію", waitingEvidence: "Очікую на докази.", scenarioUnavailable: "Сценарій недоступний", evidenceRequired: "Потрібні виміряні докази.",
  firstRefusal: "Перша відмова: {q}", allBudgetsAccept: "Усі гіпотетичні бюджети приймають виміряні значення.", lineagePinned: "lineage зафіксовано · sha256 присутній", lineageMissing: "lineage відсутній · model card не називає snapshot", budgetSource: "джерело бюджетів: configs/targets/matrix.yaml", verdictStatus: "{verdict} — перша відмова {q}",
  gateQ1Name: "падіння mAP@0.50 після квантизації", gateQ1Detail: "конвертована TFLite INT8 оцінюється як нова модель",
  gateQ2Name: "x86 TFLite p95 latency", gateQ2Detail: "бюджет привʼязаний до target і перевіряється після конвертації",
  gateQ3Name: "ARM64 TFLite p95 latency", gateQ3Detail: "середовище виконання — provenance benchmark, а не частина target id",
  gateQ4Name: "розмір INT8 артефакту", gateQ4Detail: "бюджет розміру захищає обмеження device rollout",
  gateQ5Name: "lineage даних зафіксовано", gateQ5Detail: "model card має називати snapshot даних для evaluation",

  detectorEyebrow: "Продукт у ваших руках", detectorTitle: "Завантажте кадр зі складу.", detectorLead: "Зображення йде до живого ONNX API зі scale-to-zero, обробляється в памʼяті й не зберігається.",
  dropImage: "Перетягніть зображення або оберіть файл", dropLimit: "JPEG, PNG або WebP · максимум 5 MiB", confidence: "Поріг впевненості", runInference: "Запустити живий inference", chooseImage: "Оберіть зображення, щоб почати.", canvasEmpty: "Ваш кадр і детекції зʼявляться тут.", liveResponse: "Жива відповідь", runtime: "Runtime", model: "Модель", modelHash: "SHA-256", requestTime: "Час запиту", noDetections: "Ще немає детекцій.", timingBoundary: "Час на запит — це інтерактивний вимір на Cloud Run, а не контрольований benchmark p95.",
  wakingModel: "Буджу модель…", coldStartWait: "Перший запит може чекати на холодний старт після scale-to-zero.", fileReady: "Файл {name} готовий. Запустіть живий inference.", detectionsDone: "Детекцій: {n} · зображення оброблено в памʼяті й не збережено.", inferenceFailed: "Inference не завершився: {msg}", noObjectsThreshold: "Жоден обʼєкт не пройшов цей поріг впевненості.", uploadType: "Потрібне зображення JPEG, PNG або WebP.", uploadSize: "Зображення перевищує ліміт 5 MiB.", liveRequestInFlight: "живий запит виконується…", verifyMatch: "перевірено · збігається з pin у Dockerfile", copy: "Копіювати", copied: "Скопійовано",

  traceEyebrow: "Докази замість упевненості", traceTitle: "Кожен предок вердикту — на екрані.", traceLead: "Розкрийте будь-яку ланку, щоб побачити повний незмінний ідентифікатор.",
  traceRun: "Запуск", traceConfig: "Конфіг моделі", traceDataset: "Дані", traceCalibration: "Калібрування", traceBudgetCommit: "Commit бюджетів", traceSourceCommit: "Commit коду", traceWandb: "W&B",

  fleetEyebrow: "Одна модель, кілька runtime", fleetTitle: "Цільова платформа — частина релізу.", fleetLead: "Еталонні й трендові контури розділені; ARM64 container timing не видається за latency фізичного пристрою.", thTarget: "Ціль", thLane: "Контур", thQuality: "Якість", thSize: "Розмір", laneReference: "еталон", laneTrend: "тренд", trendLaneNote: "трендовий контур — не latency пристрою",

  opsEyebrow: "Production posture", opsTitle: "Дешево у спокої. Обмежено під навантаженням. Пояснювано завжди.", opsLead: "Platform engineering — це набір обмежень, які залишаються правдивими після завершення демо.",
  opsIdentity: "ІДЕНТИЧНІСТЬ", opsIdentityTitle: "Жодної фонової влади над проєктом", opsIdentityBody: "Runtime service account не має project roles. Модель вбудована й перевіряється за fingerprint під час старту.",
  opsSupply: "ЛАНЦЮГ ПОСТАЧАННЯ", opsSupplyTitle: "Digest, а не змінний тег", opsSupplyBody: "Terraform фіксує точний digest контейнера. Artifact Registry видаляє untagged images через сім днів.",
  opsCost: "ВАРТІСТЬ", opsCostTitle: "Scale 0 → 1, і ніколи вище", opsCostBody: "Один CPU, 1 GiB, concurrency чотири, CPU лише під час запиту й жодного постійного інстансу.",
  opsFailure: "ВІДМОВА", opsFailureTitle: "Fail closed на кожному шві", opsFailureBody: "Невірний hash моделі блокує readiness; відсутній доказ дає тире; провалений гейт блокує promotion.",
  routeIdle: "DEFINED шлях · запит не виконується", hopTimingNote: "тривалість хопів ілюстративна — вимірюються лише загальний час запиту та inference_ms", hopBrowser: "Браузер", hopDns: "Azure DNS", hopFrontend: "Google Frontend", hopRun: "Cloud Run", hopOnnx: "ONNX Runtime",

  storyEyebrow: "Навіщо це існує", storyTitle: "Шість режимів відмови, одна операційна модель.", methodEyebrow: "Метод і межі", methodTitle: "Що доводить ця система.", methodLead: "Виміряні числа приходять із версіонованих артефактів. Відсутній доказ дає тире, а не зручну підстановку.", developerContract: "Контракт для розробника", returnPlatform: "Повернутися до карти платформи ↑",

  sourceLabel: "Джерело", labelMeasured: "виміряно", labelBudget: "бюджет", laneDefault: "типово", openGateLab: "Відкрити релізний гейт ↑", playLane: "Програти контур ▶", fanInLead: "Одна зафіксована команда складає девʼять збережених фрагментів у виміряний запуск.", inferenceTime: "Час інференсу", verifyLabel: "Перевірка моделі",
  truthSimulatedNote: "ваша гіпотеза — нічого не виконується",

  rail: {
    scrub: "Прокрутити build", start: "старт — нічого не відтворено", source: "Джерело {path}", noParents: "без батьків",
    lineage: "Lineage: підсвічено {n} батьківських подій · Escape скидає", lineageRoot: "Lineage: без батьків — це коренева подія",
    phase: { design: "проєктування", foundation: "фундамент", data: "дані", train: "навчання", qualify: "кваліфікація", release: "реліз", portability: "портативність", serve: "сервіс", edge: "edge", product: "продукт" },
  },

  aria: {
    home: "Головна Peregrine", workspaces: "Робочі простори застосунку", switchLang: "Switch to English", qualification: "Послідовність кваліфікації моделі", metrics: "Виміряні показники", layers: "Шари платформи", legend: "Легенда станів доказів", route: "Маршрут production-запиту", backToTop: "Вгору",
    workspaceTabs: "Робочі простори", automation: "Контури автоматизації", tfMode: "Режим Terraform",
    uploadedFrame: "Завантажений кадр зі складу", uploadedImage: "Завантажене зображення: {name}",
  },
};
