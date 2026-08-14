"""Secure Roboflow dataset export and manifest validation."""

from __future__ import annotations

import json
import os
import shutil
import stat
import tempfile
from pathlib import Path, PurePosixPath
from typing import BinaryIO
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen
from zipfile import BadZipFile, ZipFile, ZipInfo

import yaml

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


class DatasetFetchError(RuntimeError):
    """Raised when the remote export or local dataset manifest is unsafe or invalid."""


def fetch_roboflow_dataset(config_path: Path, destination: Path, api_key: str) -> Path:
    """Fetch one immutable Roboflow export and atomically install it after validation."""
    if not api_key.strip():
        raise DatasetFetchError("ROBOFLOW_API_KEY is missing")
    if destination.exists():
        raise DatasetFetchError(f"destination already exists: {destination}")
    config = _load_config(config_path)
    export_url = _request_export_url(config, api_key)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="peregrine-dataset-", dir=destination.parent) as tmp:
        archive_path = Path(tmp) / "dataset.zip"
        extracted = Path(tmp) / "extracted"
        try:
            with urlopen(export_url, timeout=120) as response:
                _copy_limited(response, archive_path, max_bytes=8 * 1024**3)
        except (OSError, URLError) as error:
            raise DatasetFetchError("dataset archive download failed") from error
        _safe_extract(archive_path, extracted)
        root = _dataset_root(extracted)
        validate_dataset_manifest(root, config)
        shutil.move(str(root), destination)
    return destination


def fetch_from_environment(config_path: Path, destination: Path) -> Path:
    """Fetch using the local process environment without persisting the credential."""
    return fetch_roboflow_dataset(config_path, destination, os.environ.get("ROBOFLOW_API_KEY", ""))


def validate_dataset_manifest(root: Path, config: dict[str, object]) -> dict[str, int]:
    """Validate exported split and total image counts against committed expectations."""
    expected_raw = config.get("expected_split_images")
    if not isinstance(expected_raw, dict):
        raise DatasetFetchError("expected_split_images must be a mapping")
    counts: dict[str, int] = {}
    for split in ("train", "valid", "test"):
        expected = expected_raw.get(split)
        if not isinstance(expected, int):
            raise DatasetFetchError(f"expected split count must be an integer: {split}")
        image_dir = root / split / "images"
        if not image_dir.is_dir():
            raise DatasetFetchError(f"missing image split: {split}")
        count = sum(path.suffix.lower() in IMAGE_SUFFIXES for path in image_dir.iterdir())
        counts[split] = count
        if count != expected:
            raise DatasetFetchError(f"split {split} has {count} images; expected {expected}")
    expected_total = config.get("expected_images")
    if not isinstance(expected_total, int) or sum(counts.values()) != expected_total:
        raise DatasetFetchError(
            f"dataset has {sum(counts.values())} images; expected {expected_total}"
        )
    if not (root / "data.yaml").is_file():
        raise DatasetFetchError("export is missing data.yaml")
    return counts


def _load_config(path: Path) -> dict[str, object]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise DatasetFetchError("dataset config must be a mapping")
    return raw


def _request_export_url(config: dict[str, object], api_key: str) -> str:
    required = ("workspace", "project", "version", "export_format")
    if any(key not in config for key in required):
        raise DatasetFetchError("dataset config is missing Roboflow export coordinates")
    coordinates = "/".join(str(config[key]) for key in required)
    request_url = f"https://api.roboflow.com/{coordinates}?{urlencode({'api_key': api_key})}"
    try:
        with urlopen(request_url, timeout=30) as response:
            payload = json.load(response)
    except (OSError, URLError, ValueError) as error:
        raise DatasetFetchError("Roboflow export request failed") from error
    if not isinstance(payload, dict):
        raise DatasetFetchError("Roboflow export response must be an object")
    export = payload.get("export")
    link = export.get("link") if isinstance(export, dict) else None
    if not isinstance(link, str) or not link.startswith("https://"):
        raise DatasetFetchError("Roboflow export response has no secure download link")
    return link


def _copy_limited(source: BinaryIO, destination: Path, max_bytes: int) -> None:
    written = 0
    with destination.open("wb") as output:
        while chunk := source.read(1024 * 1024):
            written += len(chunk)
            if written > max_bytes:
                raise DatasetFetchError("dataset archive exceeds the configured size limit")
            output.write(chunk)


def _safe_extract(archive_path: Path, destination: Path) -> None:
    destination.mkdir(parents=True)
    try:
        with ZipFile(archive_path) as archive:
            for member in archive.infolist():
                _validate_archive_member(member)
            archive.extractall(destination)
    except BadZipFile as error:
        raise DatasetFetchError("dataset archive is not a valid ZIP") from error


def _validate_archive_member(member: ZipInfo) -> None:
    path = PurePosixPath(member.filename)
    if path.is_absolute() or ".." in path.parts or any(part.startswith(".") for part in path.parts):
        raise DatasetFetchError(f"unsafe archive path: {member.filename}")
    mode = member.external_attr >> 16
    if stat.S_ISLNK(mode):
        raise DatasetFetchError(f"archive symlink is not allowed: {member.filename}")


def _dataset_root(extracted: Path) -> Path:
    manifests = list(extracted.rglob("data.yaml"))
    if len(manifests) != 1:
        raise DatasetFetchError(f"expected one data.yaml, found {len(manifests)}")
    return manifests[0].parent
