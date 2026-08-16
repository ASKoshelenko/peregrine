export const pains = [
  { href: "#gate-lab", en: ["The INT8 accuracy cliff", "A checkpoint passes evaluation; conversion quietly changes the answer.", "Version calibration membership and gate the converted model.", "Open Q1 in the Gate Lab", "Which target bites you hardest today—TFLite, TensorRT or the DSP?"], uk: ["INT8 cliff якості", "Checkpoint проходить evaluation, а конвертація непомітно змінює відповідь.", "Версіонуйте calibration membership і перевіряйте вже конвертовану модель.", "Відкрити Q1 у релізному гейті", "Яка ціль сьогодні болить найбільше — TFLite, TensorRT чи DSP?"] },
  { href: "#trace", en: ["Research → production", "A notebook and a checkpoint are not an operational handoff.", "Ship a package, resolved config, fingerprints and an explicit serving contract.", "Trace the run lineage", "What does a handoff artifact look like in your team today?"], uk: ["Дослідження → production", "Ноутбук і checkpoint — це не операційна передача.", "Передавайте package, resolved config, fingerprints і явний serving contract.", "Пройти lineage запуску", "Як сьогодні виглядає handoff artifact у вашій команді?"] },
  { href: "#fleet", en: ["A heterogeneous fleet", "Runtime and delegate updates change what executes where.", "Keep a target matrix with separate quality, latency and size budgets.", "Compare the device lanes", "What re-validates models when a runtime changes?"], uk: ["Неоднорідний fleet", "Оновлення runtime і delegate змінюють, що й де виконується.", "Тримайте target matrix з окремими бюджетами якості, latency й size.", "Порівняти device lanes", "Що повторно валідує моделі після зміни runtime?"] },
  { href: "#trace", en: ["The dataset keeps moving", "Relabels break comparison even when no new image appears.", "Version snapshots, label space and calibration membership together.", "Inspect the dataset fingerprint", "Does a label-only change force a re-baseline today?"], uk: ["Дані постійно рухаються", "Relabeling ламає порівняння навіть без нових зображень.", "Версіонуйте snapshot, label space і calibration membership разом.", "Перевірити fingerprint даних", "Чи змушує зміна лише labels робити re-baseline?"] },
  { href: "#trace", en: ["January cannot be reproduced", "Configs become folklore and dashboards drift.", "Materialize the full config and bind it to model, dataset and environment hashes.", "Open the evidence chain", "Could January's run be rebuilt from its config alone?"], uk: ["Січень не відтворити", "Конфіги стають фольклором, а dashboards дрейфують.", "Матеріалізуйте повний config і звʼязуйте його з hash моделі, даних та environment.", "Відкрити evidence chain", "Чи можна відбудувати січневий run лише з його config?"] },
  { href: "#trace", en: ["Queues, quotas and the bill", "Compute availability fails exactly when a release needs proof.", "Register the question and cost bound before allocating a run; retain failed attempts.", "Open the retained run evidence", "Who owns the training bill—and has quota blocked a deadline?"], uk: ["Черги, квоти й рахунок", "Compute availability підводить саме тоді, коли релізу потрібен доказ.", "Запишіть питання й cost bound до allocation; зберігайте невдалі спроби.", "Відкрити збережені докази запуску", "Хто володіє training bill — і чи блокувала quota дедлайн?"] },
];

export const layerOrder = ["source", "data", "train", "qualify", "release", "serve"];

export const platformLayers = {
  source: { title: "layerSource", body: "layerSourceBody", emits: "layerSourceEmits", control: "layerSourceControl" },
  data: { title: "layerData", body: "layerDataBody", emits: "layerDataEmits", control: "layerDataControl" },
  train: { title: "layerTrain", body: "layerTrainBody", emits: "layerTrainEmits", control: "layerTrainControl" },
  qualify: { title: "layerQualify", body: "layerQualifyBody", emits: "layerQualifyEmits", control: "layerQualifyControl" },
  release: { title: "layerRelease", body: "layerReleaseBody", emits: "layerReleaseEmits", control: "layerReleaseControl" },
  serve: { title: "layerServe", body: "layerServeBody", emits: "layerServeEmits", control: "layerServeControl" },
};

export const fleetTargets = { x86_onnx_fp32: "x86 · ONNX · FP32", x86_tflite_int8: "x86 · TFLite · INT8", arm64_tflite_int8: "ARM64 · TFLite · INT8" };
export const fleetLanes = { reference: "laneReference", trend: "laneTrend" };
