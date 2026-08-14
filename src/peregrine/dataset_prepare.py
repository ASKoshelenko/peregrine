"""Validate and materialize the two-class YOLO dataset contract."""

from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import tempfile
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import yaml
from PIL import Image, UnidentifiedImageError

from peregrine.dataset_fetch import IMAGE_SUFFIXES
from peregrine.hashing import sha256_json


class DatasetPreparationError(RuntimeError):
    """Raised when raw data cannot produce a trustworthy training snapshot."""


@dataclass(frozen=True, slots=True)
class PreparedDataset:
    """Observed metadata for an atomically materialized dataset."""

    root: Path
    fingerprint: str
    images: int
    boxes: int
    empty_annotations: int


def materialize_calibration_dataset(
    source: Path, destination: Path, count: int | None = None
) -> str:
    """Materialize the exact versioned calibration membership and return its hash."""
    if destination.exists():
        raise DatasetPreparationError(f"destination already exists: {destination}")
    manifest_path = source / "manifest.json"
    if not manifest_path.is_file():
        raise DatasetPreparationError("prepared dataset manifest is missing")
    manifest = _mapping(json.loads(manifest_path.read_text(encoding="utf-8")), "manifest")
    members = manifest.get("calibration")
    if not isinstance(members, list) or not all(isinstance(item, dict) for item in members):
        raise DatasetPreparationError("manifest calibration membership is invalid")
    selected = members if count is None else members[:count]
    if count is not None and (count < 1 or len(selected) != count):
        raise DatasetPreparationError("requested calibration count is unavailable")
    calibration_hash = sha256_json(selected)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(
        prefix="peregrine-calibration-", dir=destination.parent
    ) as tmp:
        staging = Path(tmp) / "dataset"
        for item in selected:
            relative = item.get("path")
            if not isinstance(relative, str) or not relative.startswith("train/images/"):
                raise DatasetPreparationError("calibration member path is invalid")
            image = source / relative
            label = source / "train/labels" / f"{image.stem}.txt"
            if not image.is_file() or not label.is_file():
                raise DatasetPreparationError(f"calibration member is missing: {relative}")
            image_out = staging / "images" / image.name
            label_out = staging / "labels" / label.name
            image_out.parent.mkdir(parents=True, exist_ok=True)
            label_out.parent.mkdir(parents=True, exist_ok=True)
            _link_or_copy(image, image_out)
            _link_or_copy(label, label_out)
        names = _source_names(source / "data.yaml")
        (staging / "data.yaml").write_text(
            yaml.safe_dump(
                {"path": ".", "train": "images", "val": "images", "names": dict(enumerate(names))},
                sort_keys=False,
            ),
            encoding="utf-8",
        )
        mini_manifest = {
            "schema_version": 1,
            "parent_fingerprint": manifest.get("fingerprint"),
            "members": selected,
            "images": len(selected),
            "calibration_hash": calibration_hash,
        }
        (staging / "manifest.json").write_text(
            json.dumps(mini_manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        shutil.move(str(staging), destination)
    return calibration_hash


def prepare_smoke_dataset(
    source: Path,
    destination: Path,
    config_path: Path,
) -> PreparedDataset:
    """Materialize a deterministic mechanics-only subset from prepared data."""
    if destination.exists():
        raise DatasetPreparationError(f"destination already exists: {destination}")
    manifest_path = source / "manifest.json"
    if not manifest_path.is_file():
        raise DatasetPreparationError("prepared dataset manifest is missing")
    config = _mapping(yaml.safe_load(config_path.read_text(encoding="utf-8")), "config")
    manifest = _mapping(json.loads(manifest_path.read_text(encoding="utf-8")), "manifest")
    train_count = _integer(config.get("smoke_train_images"), "smoke_train_images")
    valid_count = _integer(config.get("smoke_valid_images"), "smoke_valid_images")
    selections = {
        "train": _select_split(source, "train", train_count),
        "valid": _select_split(source, "valid", valid_count),
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="peregrine-smoke-", dir=destination.parent) as tmp:
        staging = Path(tmp) / "dataset"
        boxes = 0
        empty = 0
        members: list[dict[str, str]] = []
        for split, images in selections.items():
            for image in images:
                label = source / split / "labels" / f"{image.stem}.txt"
                if not label.is_file():
                    raise DatasetPreparationError(f"prepared label is missing: {label}")
                output_image = staging / split / "images" / image.name
                output_label = staging / split / "labels" / label.name
                output_image.parent.mkdir(parents=True, exist_ok=True)
                output_label.parent.mkdir(parents=True, exist_ok=True)
                _link_or_copy(image, output_image)
                _link_or_copy(label, output_label)
                label_rows = [row for row in label.read_text(encoding="utf-8").splitlines() if row]
                boxes += len(label_rows)
                empty += not label_rows
                members.append(
                    {
                        "split": split,
                        "path": f"{split}/images/{image.name}",
                        "sha256": _sha256_file(image),
                    }
                )
        smoke_manifest: dict[str, object] = {
            "schema_version": 1,
            "purpose": "mechanics-only; never use for accuracy claims",
            "parent_fingerprint": manifest.get("fingerprint"),
            "members": members,
            "images": sum(len(images) for images in selections.values()),
            "boxes": boxes,
            "empty_annotations": empty,
        }
        fingerprint = sha256_json(smoke_manifest)
        smoke_manifest["fingerprint"] = fingerprint
        (staging / "manifest.json").write_text(
            json.dumps(smoke_manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        targets = _string_list(config.get("target_classes"), "target_classes")
        (staging / "data.yaml").write_text(
            yaml.safe_dump(
                {
                    "path": ".",
                    "train": "train/images",
                    "val": "valid/images",
                    "names": dict(enumerate(targets)),
                },
                sort_keys=False,
            ),
            encoding="utf-8",
        )
        shutil.move(str(staging), destination)
    return PreparedDataset(
        destination,
        fingerprint,
        sum(len(images) for images in selections.values()),
        boxes,
        empty,
    )


def prepare_dataset(raw_root: Path, destination: Path, config_path: Path) -> PreparedDataset:
    """Validate, remap, fingerprint, and atomically install all dataset splits."""
    if destination.exists():
        raise DatasetPreparationError(f"destination already exists: {destination}")
    config = _mapping(yaml.safe_load(config_path.read_text(encoding="utf-8")), "config")
    source_names = _source_names(raw_root / "data.yaml")
    expected_names = _string_list(config.get("classes"), "classes")
    if source_names != expected_names:
        raise DatasetPreparationError("data.yaml class order does not match the committed config")
    class_mapping = _mapping(config.get("class_mapping"), "class_mapping")
    targets = _string_list(config.get("target_classes"), "target_classes")
    target_ids = {name: index for index, name in enumerate(targets)}
    calibration_size = _integer(config.get("calibration_images"), "calibration_images")

    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="peregrine-prepare-", dir=destination.parent) as tmp:
        staging = Path(tmp) / "dataset"
        hashes: dict[str, str] = {}
        class_counts: Counter[str] = Counter()
        annotation_formats: Counter[str] = Counter()
        empty_annotations = 0
        boxes = 0
        image_count = 0
        train_members: list[dict[str, str]] = []
        for split in ("train", "valid", "test"):
            images = _images(raw_root / split / "images")
            labels_dir = raw_root / split / "labels"
            if not labels_dir.is_dir():
                raise DatasetPreparationError(f"missing label split: {split}")
            image_stems = {path.stem for path in images}
            label_stems = {path.stem for path in labels_dir.glob("*.txt")}
            if image_stems != label_stems:
                raise DatasetPreparationError(f"image/label pairs do not match in {split}")
            for image in images:
                _verify_image(image)
                digest = _sha256_file(image)
                previous = hashes.setdefault(digest, f"{split}/{image.name}")
                if previous != f"{split}/{image.name}":
                    raise DatasetPreparationError(
                        "duplicate image content across dataset: "
                        f"{previous} and {split}/{image.name}"
                    )
                output_image = staging / split / "images" / image.name
                output_image.parent.mkdir(parents=True, exist_ok=True)
                _link_or_copy(image, output_image)
                source_label = labels_dir / f"{image.stem}.txt"
                remapped = _remap_label(
                    source_label,
                    source_names,
                    class_mapping,
                    target_ids,
                    annotation_formats,
                )
                output_label = staging / split / "labels" / source_label.name
                output_label.parent.mkdir(parents=True, exist_ok=True)
                output_label.write_text("".join(remapped), encoding="utf-8")
                if not remapped:
                    empty_annotations += 1
                for line in remapped:
                    class_counts[targets[int(line.split()[0])]] += 1
                boxes += len(remapped)
                image_count += 1
                if split == "train":
                    train_members.append({"path": f"train/images/{image.name}", "sha256": digest})
        if calibration_size > len(train_members):
            raise DatasetPreparationError("calibration set is larger than the training split")
        calibration = sorted(train_members, key=lambda item: (item["sha256"], item["path"]))[
            :calibration_size
        ]
        manifest: dict[str, object] = {
            "schema_version": 1,
            "source": config.get("name"),
            "label_space_version": config.get("label_space_version"),
            "targets": targets,
            "images": image_count,
            "boxes": boxes,
            "empty_annotations": empty_annotations,
            "class_counts": dict(sorted(class_counts.items())),
            "source_annotation_rows": dict(sorted(annotation_formats.items())),
            "content_hashes": dict(sorted(hashes.items())),
            "calibration": calibration,
        }
        fingerprint = sha256_json(manifest)
        manifest["fingerprint"] = fingerprint
        (staging / "manifest.json").write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
        )
        (staging / "data.yaml").write_text(
            yaml.safe_dump(
                {
                    "path": ".",
                    "train": "train/images",
                    "val": "valid/images",
                    "test": "test/images",
                    "names": dict(enumerate(targets)),
                },
                sort_keys=False,
            ),
            encoding="utf-8",
        )
        shutil.move(str(staging), destination)
    return PreparedDataset(destination, fingerprint, image_count, boxes, empty_annotations)


def _remap_label(
    path: Path,
    source_names: list[str],
    class_mapping: dict[str, object],
    target_ids: dict[str, int],
    annotation_formats: Counter[str] | None = None,
) -> list[str]:
    output: list[str] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        parts = raw.split()
        if not parts:
            continue
        try:
            source_id = int(parts[0])
            source_coordinates = [float(value) for value in parts[1:]]
        except ValueError as error:
            raise DatasetPreparationError(f"non-numeric YOLO row: {path}:{line_number}") from error
        if len(parts) == 5:
            coordinates = source_coordinates
            annotation_format = "detection"
        elif len(parts) >= 7 and len(parts) % 2 == 1:
            xs = source_coordinates[0::2]
            ys = source_coordinates[1::2]
            coordinates = [
                (min(xs) + max(xs)) / 2,
                (min(ys) + max(ys)) / 2,
                max(xs) - min(xs),
                max(ys) - min(ys),
            ]
            annotation_format = "polygon_converted_to_box"
        else:
            raise DatasetPreparationError(f"invalid YOLO row: {path}:{line_number}")
        if source_id < 0 or source_id >= len(source_names):
            raise DatasetPreparationError(f"class id out of range: {path}:{line_number}")
        if not all(math.isfinite(value) and 0.0 <= value <= 1.0 for value in source_coordinates):
            raise DatasetPreparationError(f"box coordinate out of range: {path}:{line_number}")
        if coordinates[2] <= 0.0 or coordinates[3] <= 0.0:
            raise DatasetPreparationError(f"box has non-positive extent: {path}:{line_number}")
        target = class_mapping.get(source_names[source_id])
        if target is None:
            continue
        if not isinstance(target, str) or target not in target_ids:
            raise DatasetPreparationError(f"unknown target class mapping: {target}")
        if annotation_formats is not None:
            annotation_formats[annotation_format] += 1
        encoded = " ".join(format(value, ".17g") for value in coordinates)
        output.append(f"{target_ids[target]} {encoded}\n")
    return output


def _source_names(path: Path) -> list[str]:
    if not path.is_file():
        raise DatasetPreparationError("raw export is missing data.yaml")
    raw = _mapping(yaml.safe_load(path.read_text(encoding="utf-8")), "data.yaml")
    names = raw.get("names")
    if isinstance(names, dict):
        try:
            return [str(names[index]) for index in sorted(names, key=int)]
        except (KeyError, ValueError) as error:
            raise DatasetPreparationError("data.yaml names mapping is invalid") from error
    return _string_list(names, "data.yaml names")


def _images(path: Path) -> list[Path]:
    if not path.is_dir():
        raise DatasetPreparationError(f"missing image directory: {path}")
    return sorted(item for item in path.iterdir() if item.suffix.lower() in IMAGE_SUFFIXES)


def _select_split(source: Path, split: str, count: int) -> list[Path]:
    images = _images(source / split / "images")
    if len(images) < count:
        raise DatasetPreparationError(f"{split} has {len(images)} images; smoke requires {count}")
    return sorted(images, key=lambda path: (_sha256_file(path), path.name))[:count]


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _verify_image(path: Path) -> None:
    try:
        with Image.open(path) as image:
            image.verify()
    except (OSError, UnidentifiedImageError) as error:
        raise DatasetPreparationError(f"image cannot be decoded: {path}") from error


def _link_or_copy(source: Path, destination: Path) -> None:
    try:
        os.link(source, destination)
    except OSError:
        shutil.copy2(source, destination)


def _mapping(value: object, name: str) -> dict[str, object]:
    if not isinstance(value, dict) or not all(isinstance(key, str) for key in value):
        raise DatasetPreparationError(f"{name} must be a string-keyed mapping")
    return value


def _string_list(value: object, name: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise DatasetPreparationError(f"{name} must be a list of strings")
    return value


def _integer(value: object, name: str) -> int:
    if not isinstance(value, int) or value < 1:
        raise DatasetPreparationError(f"{name} must be a positive integer")
    return value
