"""Dataset license verification gate executed before any fetch stage."""

from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import yaml

REQUIRED_FIELDS = (
    "license_spdx",
    "license_url",
    "attribution_text",
    "verified_at",
    "source_url",
)
SUPPORTED_LICENSES = {"CC-BY-4.0"}


class LicenseVerificationError(ValueError):
    """Raised when a dataset cannot pass the pre-fetch license gate."""


def verify_dataset_license(config_path: Path, notice_path: Path) -> dict[str, str]:
    """Validate structured license metadata and its committed attribution notice."""
    raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise LicenseVerificationError("dataset config must be a mapping")

    values: dict[str, str] = {}
    for field in REQUIRED_FIELDS:
        value = raw.get(field)
        if not isinstance(value, str) or not value.strip():
            raise LicenseVerificationError(f"missing required license field: {field}")
        values[field] = value.strip()

    if values["license_spdx"] not in SUPPORTED_LICENSES:
        raise LicenseVerificationError(f"unsupported license: {values['license_spdx']}")
    for field in ("license_url", "source_url"):
        parsed = urlparse(values[field])
        if parsed.scheme != "https" or not parsed.netloc:
            raise LicenseVerificationError(f"{field} must be an https URL")

    notice = notice_path.read_text(encoding="utf-8")
    for expected in (
        values["license_spdx"],
        values["license_url"],
        values["source_url"],
        values["attribution_text"],
    ):
        if expected not in notice:
            raise LicenseVerificationError(f"dataset notice does not contain: {expected}")
    return values


def verify_label_mapping(config_path: Path) -> dict[str, str | None]:
    """Verify that every source class maps to a declared target class or explicit ignore."""
    raw = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise LicenseVerificationError("dataset config must be a mapping")
    classes = raw.get("classes")
    mapping = raw.get("class_mapping")
    targets = raw.get("target_classes")
    if not isinstance(classes, list) or not all(isinstance(item, str) for item in classes):
        raise LicenseVerificationError("classes must be a list of strings")
    if not isinstance(mapping, dict):
        raise LicenseVerificationError("class_mapping must be a mapping")
    if not isinstance(targets, list) or not all(isinstance(item, str) for item in targets):
        raise LicenseVerificationError("target_classes must be a list of strings")
    if set(mapping) != set(classes):
        missing = sorted(set(classes) - set(mapping))
        extra = sorted(set(mapping) - set(classes))
        raise LicenseVerificationError(f"class_mapping mismatch: missing={missing} extra={extra}")
    target_set = set(targets)
    if len(target_set) != len(targets):
        raise LicenseVerificationError("target_classes must be unique")
    result: dict[str, str | None] = {}
    for source, target in mapping.items():
        if not isinstance(source, str) or (target is not None and not isinstance(target, str)):
            raise LicenseVerificationError("class_mapping values must be strings or null")
        if target is not None and target not in target_set:
            raise LicenseVerificationError(f"undeclared target class: {target}")
        result[source] = target
    if set(result.values()) - {None} != target_set:
        raise LicenseVerificationError("every target class must be reachable from class_mapping")
    return result
