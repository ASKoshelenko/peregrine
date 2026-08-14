from pathlib import Path

import pytest

from peregrine.dataset_license import (
    LicenseVerificationError,
    verify_dataset_license,
    verify_label_mapping,
)


def test_committed_dataset_license_passes() -> None:
    metadata = verify_dataset_license(
        Path("configs/data/warehouse.yaml"), Path("docs/DATASET_LICENSE.md")
    )
    assert metadata["license_spdx"] == "CC-BY-4.0"


def test_committed_label_mapping_covers_all_source_classes() -> None:
    mapping = verify_label_mapping(Path("configs/data/warehouse.yaml"))
    assert mapping["pallets"] == "pallet"
    assert mapping["pallet"] == "pallet"
    assert mapping["boxes"] == "carton"


def test_missing_attribution_blocks_fetch(tmp_path: Path) -> None:
    config = tmp_path / "dataset.yaml"
    notice = tmp_path / "notice.md"
    config.write_text(
        "\n".join(
            (
                "license_spdx: CC-BY-4.0",
                "license_url: https://creativecommons.org/licenses/by/4.0/",
                "source_url: https://example.test/dataset",
                'verified_at: "2026-08-13"',
            )
        ),
        encoding="utf-8",
    )
    notice.write_text("empty", encoding="utf-8")
    with pytest.raises(LicenseVerificationError, match="attribution_text"):
        verify_dataset_license(config, notice)


def test_notice_must_match_structured_metadata(tmp_path: Path) -> None:
    config = tmp_path / "dataset.yaml"
    notice = tmp_path / "notice.md"
    config.write_text(
        "\n".join(
            (
                "license_spdx: CC-BY-4.0",
                "license_url: https://creativecommons.org/licenses/by/4.0/",
                "source_url: https://example.test/dataset",
                "attribution_text: Example attribution",
                'verified_at: "2026-08-13"',
            )
        ),
        encoding="utf-8",
    )
    notice.write_text("CC-BY-4.0", encoding="utf-8")
    with pytest.raises(LicenseVerificationError, match="does not contain"):
        verify_dataset_license(config, notice)


def test_unmapped_source_class_blocks_fetch(tmp_path: Path) -> None:
    config = tmp_path / "dataset.yaml"
    config.write_text(
        "\n".join(
            (
                "classes: [Box, pallets]",
                "class_mapping:",
                "  Box: carton",
                "target_classes: [carton]",
            )
        ),
        encoding="utf-8",
    )
    with pytest.raises(LicenseVerificationError, match=r"missing=.*pallets"):
        verify_label_mapping(config)
