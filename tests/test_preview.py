from pathlib import Path

from peregrine.preview import resolve_preview_path


def test_preview_allows_site_and_observed_artifacts(tmp_path: Path) -> None:
    assert resolve_preview_path("/site/app.js", tmp_path) == tmp_path / "site" / "app.js"
    assert (
        resolve_preview_path("/artifacts/observed/latest.json", tmp_path)
        == tmp_path / "artifacts" / "observed" / "latest.json"
    )


def test_preview_root_resolves_to_site(tmp_path: Path) -> None:
    assert resolve_preview_path("/", tmp_path) == tmp_path / "site" / "index.html"


def test_preview_denies_dotfiles_and_non_public_trees(tmp_path: Path) -> None:
    assert resolve_preview_path("/.env", tmp_path) is None
    assert resolve_preview_path("/.git/config", tmp_path) is None
    assert resolve_preview_path("/configs/data/warehouse.yaml", tmp_path) is None
    assert resolve_preview_path("/docs/CONTINUATION_PRESET.md", tmp_path) is None


def test_preview_denies_encoded_traversal(tmp_path: Path) -> None:
    assert resolve_preview_path("/site/%2e%2e/.env", tmp_path) is None
    assert resolve_preview_path("/artifacts/%2e%2e/.env", tmp_path) is None
