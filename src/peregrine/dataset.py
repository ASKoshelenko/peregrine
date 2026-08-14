"""Tiny warehouse detection contract fixture.

This is not a training dataset. It is a deterministic contract set that lets the pipeline
prove preprocessing, metric accounting, target gates, lineage hashes, and API shape offline.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

from peregrine.hashing import sha256_json

Label = Literal["pallet", "carton", "tote"]


@dataclass(frozen=True, slots=True)
class Box:
    """One normalized bounding box."""

    label: Label
    x1: float
    y1: float
    x2: float
    y2: float


@dataclass(frozen=True, slots=True)
class ImageRecord:
    """One image and its ground-truth boxes."""

    image_id: str
    width: int
    height: int
    split: Literal["train", "calibration", "eval"]
    boxes: tuple[Box, ...]


DATASET_VERSION = "warehouse-contract-v1"
LABEL_SPACE_VERSION = "warehouse-3-v1"

DATASET: tuple[ImageRecord, ...] = (
    ImageRecord("wh-0001", 1280, 720, "train", (Box("pallet", 0.10, 0.18, 0.42, 0.74),)),
    ImageRecord("wh-0002", 1280, 720, "train", (Box("carton", 0.48, 0.21, 0.74, 0.56),)),
    ImageRecord("wh-0003", 1280, 720, "calibration", (Box("tote", 0.20, 0.30, 0.40, 0.62),)),
    ImageRecord("wh-0004", 1280, 720, "calibration", (Box("carton", 0.52, 0.16, 0.84, 0.60),)),
    ImageRecord("wh-0005", 1280, 720, "eval", (Box("pallet", 0.08, 0.20, 0.38, 0.78),)),
    ImageRecord("wh-0006", 1280, 720, "eval", (Box("carton", 0.43, 0.24, 0.75, 0.57),)),
    ImageRecord("wh-0007", 1280, 720, "eval", (Box("tote", 0.16, 0.33, 0.38, 0.66),)),
    ImageRecord(
        "wh-0008",
        1280,
        720,
        "eval",
        (Box("pallet", 0.58, 0.18, 0.88, 0.69), Box("carton", 0.12, 0.22, 0.32, 0.48)),
    ),
    ImageRecord(
        "wh-0009",
        1280,
        720,
        "eval",
        (Box("pallet", 0.06, 0.15, 0.34, 0.70), Box("tote", 0.55, 0.40, 0.72, 0.68)),
    ),
    ImageRecord(
        "wh-0010",
        1280,
        720,
        "eval",
        (Box("carton", 0.10, 0.15, 0.34, 0.44), Box("carton", 0.60, 0.20, 0.86, 0.52)),
    ),
    ImageRecord("wh-0011", 1280, 720, "eval", (Box("tote", 0.30, 0.35, 0.52, 0.66),)),
    ImageRecord(
        "wh-0012",
        1280,
        720,
        "eval",
        (Box("pallet", 0.14, 0.25, 0.46, 0.80), Box("carton", 0.66, 0.30, 0.84, 0.50)),
    ),
)


def dataset_payload() -> dict[str, object]:
    """Return the committed dataset contract as JSON-compatible data."""
    return {
        "dataset_version": DATASET_VERSION,
        "label_space_version": LABEL_SPACE_VERSION,
        "records": [asdict(record) for record in DATASET],
    }


def dataset_hash() -> str:
    """Hash the dataset contract exactly as the pipeline observes it."""
    return sha256_json(dataset_payload())


def split_counts() -> dict[str, int]:
    """Count images per split."""
    counts = {"train": 0, "calibration": 0, "eval": 0}
    for record in DATASET:
        counts[record.split] += 1
    return counts
