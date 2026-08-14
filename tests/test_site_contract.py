import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_public_story_has_platform_web_app_controls() -> None:
    html = (ROOT / "site/index.html").read_text()
    assert 'id="platform"' in html
    assert 'id="pipeline"' in html
    assert 'id="language-switch"' in html
    assert 'id="back-to-top"' in html
    assert 'id="reading-progress"' in html
    assert 'id="control-room"' in html
    assert 'id="build-platform"' in html
    assert 'rel="manifest"' in html
    assert html.count('data-workspace="') >= 10


def test_public_story_does_not_deep_link_internal_docs() -> None:
    html = (ROOT / "site/index.html").read_text()
    assert "github.com/ASKoshelenko/peregrine/tree/" not in html
    assert "docs/private" not in html
    assert "status.yaml" not in html


def test_ukrainian_story_is_first_class() -> None:
    app = (ROOT / "site/app.js").read_text()
    assert 'heroTitle: "Я не просто розгорнув модель.' in app
    assert 'platformTitle: "Пройдіть шлях одного артефакту' in app
    assert app.count("backToTop:") == 2


def test_platform_replay_is_real_dependency_ordered_evidence() -> None:
    model = json.loads((ROOT / "site/platform-events.json").read_text())
    assert model["schema_version"] == 1
    assert len(model["events"]) >= 20
    seen: set[str] = set()
    outcomes = set()
    for event in model["events"]:
        assert set(event) == {
            "id",
            "phase",
            "resource",
            "action",
            "depends_on",
            "control",
            "evidence",
            "outcome",
        }
        assert set(event["depends_on"]) <= seen
        seen.add(event["id"])
        outcomes.add(event["outcome"])
    assert {"PASS", "BLOCK", "LIVE"} <= outcomes


def test_pwa_shell_caches_story_but_never_api_requests() -> None:
    manifest = json.loads((ROOT / "site/manifest.webmanifest").read_text())
    service_worker = (ROOT / "site/sw.js").read_text()
    assert manifest["display"] == "standalone"
    assert "/platform-events.json" in service_worker
    assert 'pathname.startsWith("/api/")' in service_worker
    assert (ROOT / "site/components/platform-event-model.js").is_file()
    assert (ROOT / "site/components/pwa-shell.js").is_file()
