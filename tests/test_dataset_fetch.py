from pathlib import Path
from zipfile import ZipFile, ZipInfo

import pytest

from peregrine.dataset_fetch import (
    DatasetFetchError,
    _safe_extract,
    roboflow_private_key,
    validate_dataset_manifest,
)


def test_manifest_validates_expected_splits(tmp_path: Path) -> None:
    root = tmp_path / "dataset"
    expected = {"train": 2, "valid": 1, "test": 1}
    for split, count in expected.items():
        image_dir = root / split / "images"
        image_dir.mkdir(parents=True)
        for index in range(count):
            (image_dir / f"{index}.jpg").write_bytes(b"image")
    (root / "data.yaml").write_text("names: [pallet, carton]\n", encoding="utf-8")
    config: dict[str, object] = {
        "expected_split_images": expected,
        "expected_images": 4,
    }
    assert validate_dataset_manifest(root, config) == expected


def test_manifest_rejects_wrong_split_count(tmp_path: Path) -> None:
    root = tmp_path / "dataset"
    for split in ("train", "valid", "test"):
        (root / split / "images").mkdir(parents=True)
    (root / "data.yaml").write_text("names: []\n", encoding="utf-8")
    config: dict[str, object] = {
        "expected_split_images": {"train": 1, "valid": 0, "test": 0},
        "expected_images": 1,
    }
    with pytest.raises(DatasetFetchError, match="split train has 0 images"):
        validate_dataset_manifest(root, config)


def test_safe_extract_rejects_traversal(tmp_path: Path) -> None:
    archive = tmp_path / "dataset.zip"
    with ZipFile(archive, "w") as zipped:
        zipped.writestr("../escape.txt", "no")
    with pytest.raises(DatasetFetchError, match="unsafe archive path"):
        _safe_extract(archive, tmp_path / "output")


def test_safe_extract_rejects_symlink(tmp_path: Path) -> None:
    archive = tmp_path / "dataset.zip"
    symlink = ZipInfo("dataset/link")
    symlink.create_system = 3
    symlink.external_attr = 0o120777 << 16
    with ZipFile(archive, "w") as zipped:
        zipped.writestr(symlink, "target")
    with pytest.raises(DatasetFetchError, match="symlink"):
        _safe_extract(archive, tmp_path / "output")


def test_private_key_uses_official_environment_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ROBOFLOW_API_KEY", "legacy")
    monkeypatch.setenv("ROBOFLOW_PRIVATE_API_KEY", "private")
    assert roboflow_private_key() == "private"
