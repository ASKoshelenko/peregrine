"""Single-thread device-artifact benchmark protocol."""

from __future__ import annotations

import importlib
import json
import math
import platform
import sys
import time
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from PIL import Image

from peregrine.dataset_fetch import IMAGE_SUFFIXES


class BenchmarkError(RuntimeError):
    """Raised when a benchmark cannot satisfy the fixed protocol."""


def nearest_rank(samples: list[float], quantile: float) -> float:
    """Return ``sorted(times)[ceil(q*N)-1]`` for a non-empty sample."""
    if not samples or not 0 < quantile <= 1:
        raise BenchmarkError("nearest-rank requires samples and 0 < quantile <= 1")
    ordered = sorted(samples)
    return ordered[math.ceil(quantile * len(ordered)) - 1]


def benchmark_model(
    model: Path, target: str, lane: str, images: Path, output: Path
) -> dict[str, Any]:
    """Run 10 warmups and 100 batch-one, single-thread timed invocations."""
    if lane not in {"reference", "trend", "laboratory"}:
        raise BenchmarkError(f"invalid benchmark lane: {lane}")
    selected = sorted(path for path in images.iterdir() if path.suffix.lower() in IMAGE_SUFFIXES)[
        :20
    ]
    if not selected:
        raise BenchmarkError("benchmark image directory is empty")
    invoke, runtime_name, runtime_version = _runtime(model, selected)
    for index in range(10):
        invoke(index)
    elapsed: list[float] = []
    for index in range(100):
        started = time.perf_counter_ns()
        invoke(index)
        elapsed.append((time.perf_counter_ns() - started) / 1_000_000)
    fragment: dict[str, Any] = {
        "schema_version": 1,
        "kind": "bench",
        "target": target,
        "lane": lane,
        "p50_ms": round(nearest_rank(elapsed, 0.50), 4),
        "p95_ms": round(nearest_rank(elapsed, 0.95), 4),
        "samples": 100,
        "warmup": 10,
        "threads": 1,
        "host": {
            "os": platform.platform(),
            "arch": platform.machine(),
            "cpu_model": platform.processor() or "unknown",
            "python": sys.version.split()[0],
            "runtime_name": runtime_name,
            "runtime_version": runtime_version,
        },
        "observed_at": datetime.now(UTC).isoformat(),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(fragment, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return fragment


def _runtime(model: Path, images: list[Path]) -> tuple[Callable[[int], None], str, str]:
    numpy = importlib.import_module("numpy")
    batches = [_image_batch(path, numpy) for path in images]
    if model.suffix.lower() == ".onnx":
        ort = importlib.import_module("onnxruntime")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        session = ort.InferenceSession(
            str(model), sess_options=options, providers=["CPUExecutionProvider"]
        )
        input_name = session.get_inputs()[0].name

        def invoke(index: int) -> None:
            session.run(None, {input_name: batches[index % len(batches)]})

        return invoke, "onnxruntime", str(ort.__version__)
    if model.suffix.lower() == ".tflite":
        tensorflow = importlib.import_module("tensorflow")
        interpreter = tensorflow.lite.Interpreter(model_path=str(model), num_threads=1)
        interpreter.allocate_tensors()
        details = interpreter.get_input_details()[0]
        input_index = details["index"]

        def invoke(index: int) -> None:
            batch = batches[index % len(batches)]
            if tuple(details["shape"]) == (1, 640, 640, 3):
                batch = numpy.transpose(batch, (0, 2, 3, 1))
            interpreter.set_tensor(input_index, batch.astype(details["dtype"]))
            interpreter.invoke()

        return invoke, "tensorflow-lite", str(tensorflow.__version__)
    raise BenchmarkError(f"unsupported model suffix: {model.suffix}")


def _image_batch(path: Path, numpy: Any) -> Any:
    with Image.open(path) as image:
        rgb = image.convert("RGB")
        scale = min(640 / rgb.width, 640 / rgb.height)
        resized = rgb.resize((round(rgb.width * scale), round(rgb.height * scale)))
        canvas = Image.new("RGB", (640, 640), (114, 114, 114))
        canvas.paste(resized, ((640 - resized.width) // 2, (640 - resized.height) // 2))
        array = numpy.asarray(canvas, dtype=numpy.float32) / 255.0
    return numpy.transpose(array, (2, 0, 1))[None, ...]
