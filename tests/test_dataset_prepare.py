from pathlib import Path

import pytest
import yaml
from PIL import Image

from peregrine.dataset_prepare import (
    DatasetPreparationError,
    materialize_calibration_dataset,
    prepare_dataset,
    prepare_smoke_dataset,
)


def _fixture(root: Path, *, duplicate: bool = False) -> Path:
    names = ["Box", "Barcode", "pallets"]
    (root / "data.yaml").parent.mkdir(parents=True)
    (root / "data.yaml").write_text(yaml.safe_dump({"names": names}), encoding="utf-8")
    for index, split in enumerate(("train", "valid", "test")):
        images = root / split / "images"
        labels = root / split / "labels"
        images.mkdir(parents=True)
        labels.mkdir(parents=True)
        image_path = images / f"{split}.jpg"
        color = (1, 2, 3) if duplicate else (index, index + 1, index + 2)
        Image.new("RGB", (2, 2), color).save(image_path)
        source_id = 2 if split == "train" else 0
        ignored = "1 0.4 0.4 0.1 0.1\n" if split == "test" else ""
        (labels / f"{split}.txt").write_text(
            f"{source_id} 0.5 0.5 0.2 0.2\n{ignored}", encoding="utf-8"
        )
    return root


def _config(path: Path) -> Path:
    path.write_text(
        yaml.safe_dump(
            {
                "name": "fixture-v1",
                "classes": ["Box", "Barcode", "pallets"],
                "class_mapping": {"Box": "carton", "Barcode": None, "pallets": "pallet"},
                "target_classes": ["pallet", "carton"],
                "label_space_version": "fixture-2-v1",
                "calibration_images": 1,
            }
        ),
        encoding="utf-8",
    )
    return path


def test_prepare_remaps_and_fingerprints_dataset(tmp_path: Path) -> None:
    prepared = prepare_dataset(
        _fixture(tmp_path / "raw"), tmp_path / "processed", _config(tmp_path / "config.yaml")
    )
    assert prepared.images == 3
    assert prepared.boxes == 3
    assert prepared.empty_annotations == 0
    assert len(prepared.fingerprint) == 64
    data_config = yaml.safe_load((prepared.root / "data.yaml").read_text(encoding="utf-8"))
    assert data_config["path"] == str(prepared.root)
    assert (prepared.root / "train/labels/train.txt").read_text(encoding="utf-8").startswith("0 ")
    assert (prepared.root / "valid/labels/valid.txt").read_text(encoding="utf-8").startswith("1 ")
    assert "1 0.4" not in (prepared.root / "test/labels/test.txt").read_text(encoding="utf-8")


def test_prepare_rejects_cross_split_duplicate(tmp_path: Path) -> None:
    with pytest.raises(DatasetPreparationError, match="duplicate image content"):
        prepare_dataset(
            _fixture(tmp_path / "raw", duplicate=True),
            tmp_path / "processed",
            _config(tmp_path / "config.yaml"),
        )


def test_prepare_rejects_invalid_box(tmp_path: Path) -> None:
    raw = _fixture(tmp_path / "raw")
    (raw / "train/labels/train.txt").write_text("2 0.5 0.5 0 0.2\n", encoding="utf-8")
    with pytest.raises(DatasetPreparationError, match="non-positive extent"):
        prepare_dataset(raw, tmp_path / "processed", _config(tmp_path / "config.yaml"))


def test_prepare_converts_segmentation_polygon_to_box(tmp_path: Path) -> None:
    raw = _fixture(tmp_path / "raw")
    (raw / "train/labels/train.txt").write_text(
        "2 0.1 0.2 0.5 0.2 0.5 0.8 0.1 0.8\n", encoding="utf-8"
    )
    prepared = prepare_dataset(raw, tmp_path / "processed", _config(tmp_path / "config.yaml"))
    row = (prepared.root / "train/labels/train.txt").read_text(encoding="utf-8").split()
    assert row[0] == "0"
    assert [float(value) for value in row[1:]] == pytest.approx([0.3, 0.5, 0.4, 0.6])
    manifest = yaml.safe_load((prepared.root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["source_annotation_rows"]["polygon_converted_to_box"] == 1


def test_prepare_rejects_corrupt_image(tmp_path: Path) -> None:
    raw = _fixture(tmp_path / "raw")
    (raw / "valid/images/valid.jpg").write_bytes(b"not-an-image")
    with pytest.raises(DatasetPreparationError, match="cannot be decoded"):
        prepare_dataset(raw, tmp_path / "processed", _config(tmp_path / "config.yaml"))


def test_smoke_subset_is_deterministic_and_mechanics_only(tmp_path: Path) -> None:
    raw = tmp_path / "raw"
    names = ["Box", "Barcode", "pallets"]
    (raw / "data.yaml").parent.mkdir(parents=True)
    (raw / "data.yaml").write_text(yaml.safe_dump({"names": names}), encoding="utf-8")
    for split, count in (("train", 4), ("valid", 2), ("test", 1)):
        for index in range(count):
            images = raw / split / "images"
            labels = raw / split / "labels"
            images.mkdir(parents=True, exist_ok=True)
            labels.mkdir(parents=True, exist_ok=True)
            split_color = {"train": 10, "valid": 20, "test": 30}[split]
            Image.new("RGB", (2, 2), (index, split_color, index + 1)).save(
                images / f"{split}-{index}.png"
            )
            (labels / f"{split}-{index}.txt").write_text("0 0.5 0.5 0.2 0.2\n", encoding="utf-8")
    config = _config(tmp_path / "config.yaml")
    payload = yaml.safe_load(config.read_text(encoding="utf-8"))
    payload.update({"smoke_train_images": 3, "smoke_valid_images": 1})
    config.write_text(yaml.safe_dump(payload), encoding="utf-8")
    prepared = prepare_dataset(raw, tmp_path / "processed", config)
    smoke = prepare_smoke_dataset(prepared.root, tmp_path / "smoke", config)
    assert smoke.images == 4
    manifest = yaml.safe_load((smoke.root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["purpose"] == "mechanics-only; never use for accuracy claims"
    assert manifest["parent_fingerprint"] == prepared.fingerprint
    assert len(list((smoke.root / "train/images").iterdir())) == 3


def test_calibration_materializes_manifest_membership_exactly(tmp_path: Path) -> None:
    raw = _fixture(tmp_path / "raw")
    prepared = prepare_dataset(raw, tmp_path / "processed", _config(tmp_path / "config.yaml"))
    calibration_hash = materialize_calibration_dataset(
        prepared.root, tmp_path / "calibration", count=1
    )
    parent = yaml.safe_load((prepared.root / "manifest.json").read_text(encoding="utf-8"))
    child = yaml.safe_load((tmp_path / "calibration/manifest.json").read_text(encoding="utf-8"))
    assert child["members"] == parent["calibration"][:1]
    assert child["calibration_hash"] == calibration_hash
