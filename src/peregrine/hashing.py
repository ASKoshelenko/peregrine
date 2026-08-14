"""Stable hashing helpers for evidence files."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def canonical_json(value: Any) -> str:
    """Return deterministic JSON for hashing and committed fixtures."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sha256_json(value: Any) -> str:
    """Hash a JSON-compatible value."""
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()
