from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_public_story_has_platform_web_app_controls() -> None:
    html = (ROOT / "site/index.html").read_text()
    assert 'id="platform"' in html
    assert 'id="pipeline"' in html
    assert 'id="language-switch"' in html
    assert 'id="back-to-top"' in html
    assert 'id="reading-progress"' in html


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
