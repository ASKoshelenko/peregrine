import json
import re
from pathlib import Path

ROOT = Path(__file__).parents[1]
SITE = ROOT / "site"
INDEX = SITE / "index.html"
SW = SITE / "sw.js"
EN = SITE / "data/i18n.en.js"
UK = SITE / "data/i18n.uk.js"
PIPELINES = SITE / "pipelines.json"
EVENTS = SITE / "platform-events.json"

FORBIDDEN = ("make release", "64 tests", "100 measured invocations", "790 images · 2 classes")
FORBIDDEN_IN_JS = ("console-ok",)
PIPELINE_TRUTHS = {"LIVE", "RECORDED", "DEFINED"}
STAGE_OUTCOMES = {"PASS", "BLOCK", "DEFINED"}
BIND_SOURCES = {"platform", "evidence", "predict"}
STAGE_FIELDS = ("id", "name", "outcome", "source", "depends_on")
EVENT_FIELDS = (
    "id",
    "phase",
    "resource",
    "action",
    "depends_on",
    "control",
    "evidence",
    "outcome",
    "source",
    "truth",
)
IDENT = re.compile(r"[A-Za-z_$][\w$]*")
DICT_ANCHOR = re.compile(r"export\s+(?:default|const\s+[\w$]+\s*=)\s*\{")
GLOSS_REF = re.compile(r"""data-g=["']([\w-]+)["']""")
GLOSS_CALL = re.compile(r"""glossMark\(["']([\w-]+)""")
GLOSS_FIELD = re.compile(r"""\b(?:gloss|noteGloss):\s*["']([\w-]+)["']""")
PLAIN_NAMESPACES = ("gloss.", "plain.", "scope.")
PLAIN_WHITELIST = (
    "Q1—Q5",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "Q5",
    "mAP@0.50",
    "SHA-256",
    "sha256",
    "p95",
    "p50",
    "INT8",
    "FP32",
    "x86",
    "ARM64",
)
PLAIN_NUMERALS = re.compile(r"(?<!\d)(?:95|100)(?!\d)")
CHAPTERS = {
    "platform",
    "pipeline",
    "control",
    "gates",
    "detector",
    "trace",
    "fleet",
    "ops",
    "story",
    "method",
}


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _sw_version() -> str:
    match = re.search(r'const V = "([^"]+)";', _read(SW))
    assert match, "sw.js must declare a single version token as const V"
    return match.group(1)


def _shell() -> list[str]:
    block = re.search(r"const SHELL = \[(.*?)\];", _read(SW), re.S)
    assert block, "sw.js must declare const SHELL"
    return re.findall(r'"([^"]+)"', block.group(1))


def _index_version_tokens() -> set[str]:
    return set(re.findall(r'(?:href|src)="[^"]*\?v=([^"&#]+)"', _read(INDEX)))


def _index_urls() -> set[str]:
    urls = set()
    for raw in re.findall(r'(?:href|src)="([^"]+)"', _read(INDEX)):
        if raw.startswith(("#", "http://", "https://", "mailto:", "data:")):
            continue
        path = raw.split("?", 1)[0].split("#", 1)[0]
        if not path:
            continue
        if path.startswith("."):
            path = path[1:]
        urls.add(path if path.startswith("/") else "/" + path)
    return urls


def _disk_path(url: str) -> Path:
    if url in {"/", "/index.html"}:
        return INDEX
    if url.startswith("/artifacts/"):
        return ROOT / url.lstrip("/")
    return SITE / url.lstrip("/")


def _citations(source: str) -> list[Path]:
    paths = []
    for token in re.split(r"[+,]", source):
        cited = token.strip().split("#", 1)[0].strip()
        assert cited, f"empty repository citation in {source!r}"
        paths.append(ROOT / cited)
    return paths


def _cmd_pattern(cmd: str) -> re.Pattern[str]:
    literals = [part for part in re.split(r"<[^>]*>|\{[^}]*\}", cmd) if part]
    return re.compile(".*?".join(re.escape(part) for part in literals), re.S)


def _object_key_paths(text: str, start: int) -> set[str]:
    keys: set[str] = set()
    stack: list[str] = []
    pending = ""
    index, size, depth = start, len(text), 0
    while index < size:
        head = text[index : index + 2]
        char = text[index]
        if head == "//":
            index = text.find("\n", index)
            if index < 0:
                break
            continue
        if head == "/*":
            index = text.find("*/", index) + 2
            continue
        if char in "\"'`":
            cursor = index + 1
            while cursor < size and text[cursor] != char:
                cursor += 2 if text[cursor] == "\\" else 1
            token, index = text[index + 1 : cursor], cursor + 1
        elif IDENT.match(text, index):
            match = IDENT.match(text, index)
            assert match
            token, index = match.group(0), match.end()
        elif char in "{[":
            depth += 1
            stack.append(pending)
            pending = ""
            index += 1
            continue
        elif char in "}]":
            depth -= 1
            if stack:
                stack.pop()
            pending = ""
            index += 1
            if depth == 0:
                break
            continue
        else:
            index += 1
            continue
        cursor = index
        while cursor < size and text[cursor] in " \t\r\n":
            cursor += 1
        if cursor < size and text[cursor] == ":":
            pending = token
            keys.add(".".join([*stack[1:], token]))
    return keys


def _object_string_values(text: str, start: int) -> dict[str, str]:
    values: dict[str, str] = {}
    stack: list[str] = []
    pending, expect = "", ""
    index, size, depth = start, len(text), 0
    while index < size:
        head = text[index : index + 2]
        char = text[index]
        if head == "//":
            index = text.find("\n", index)
            if index < 0:
                break
            continue
        if head == "/*":
            index = text.find("*/", index) + 2
            continue
        if char in "\"'`":
            cursor = index + 1
            while cursor < size and text[cursor] != char:
                cursor += 2 if text[cursor] == "\\" else 1
            token, index, quoted = text[index + 1 : cursor], cursor + 1, True
        elif IDENT.match(text, index):
            match = IDENT.match(text, index)
            assert match
            token, index, quoted = match.group(0), match.end(), False
        elif char in "{[":
            depth += 1
            stack.append(pending)
            pending, expect = "", ""
            index += 1
            continue
        elif char in "}]":
            depth -= 1
            if stack:
                stack.pop()
            pending, expect = "", ""
            index += 1
            if depth == 0:
                break
            continue
        else:
            index += 1
            continue
        cursor = index
        while cursor < size and text[cursor] in " \t\r\n":
            cursor += 1
        if cursor < size and text[cursor] == ":":
            pending = token
            expect = ".".join([*stack[1:], token])
            continue
        if expect and quoted:
            values[expect] = token
        expect = ""
    return values


def _dict_strings(path: Path) -> dict[str, str]:
    text = _read(path)
    anchor = DICT_ANCHOR.search(text)
    assert anchor, f"{path.name} must export a dictionary object literal"
    return _object_string_values(text, text.index("{", anchor.start()))


def _gloss_references() -> set[str]:
    ids: set[str] = set()
    for path in [INDEX, EN, UK, *sorted(SITE.glob("components/**/*.js"))]:
        text = _read(path)
        ids |= set(GLOSS_REF.findall(text))
        ids |= set(GLOSS_CALL.findall(text))
        if path.suffix == ".js" and path.parent.name != "data":
            ids |= set(GLOSS_FIELD.findall(text))
    return ids


def _dict_keys(path: Path) -> set[str]:
    text = _read(path)
    anchor = DICT_ANCHOR.search(text)
    assert anchor, f"{path.name} must export a dictionary object literal"
    return _object_key_paths(text, text.index("{", anchor.start()))


def _require_dictionaries() -> tuple[set[str], set[str]]:
    return _dict_keys(EN), _dict_keys(UK)


def test_one_version_token_is_shared_by_index_and_service_worker() -> None:
    tokens = _index_version_tokens()
    assert len(tokens) == 1, (
        f"index.html asset refs must share one ?v= token, found {sorted(tokens)}"
    )
    token = tokens.pop()
    version = _sw_version()
    assert token == version, f"index.html pins ?v={token} while sw.js caches {version}"


def test_service_worker_shell_is_a_unique_rooted_path_list() -> None:
    shell = _shell()
    assert shell, "sw.js SHELL must not be empty"
    assert len(shell) == len(set(shell)), "SHELL holds duplicate paths"
    assert all(path.startswith("/") for path in shell), "SHELL paths must be site-rooted"
    assert not any(path.startswith("/api/") for path in shell), (
        "LIVE API responses are never cached"
    )


def test_every_url_referenced_by_index_is_precached_and_present() -> None:
    shell = set(_shell())
    for url in sorted(_index_urls()):
        assert url in shell, f"{url} is referenced by index.html but absent from the sw.js SHELL"
        assert _disk_path(url).is_file(), f"{url} is referenced by index.html but absent on disk"


def test_pipeline_model_is_valid_and_every_command_is_verbatim() -> None:
    model = json.loads(_read(PIPELINES))
    assert model["schema_version"] == 1, "pipeline-model.js validates schema_version 1"
    assert {"en", "uk"} <= set(model["boundary"]), "the model boundary renders in both languages"
    pipeline_ids: set[str] = set()
    stage_paths: set[str] = set()
    for pipeline in model["pipelines"]:
        assert pipeline["id"] not in pipeline_ids, f"duplicate pipeline {pipeline['id']}"
        pipeline_ids.add(pipeline["id"])
        assert pipeline["truth"] in PIPELINE_TRUTHS, f"pipeline {pipeline['id']} truth state"
        assert {"en", "uk"} <= set(pipeline["name"]), f"pipeline {pipeline['id']} needs both names"
        assert pipeline["source"].strip(), f"pipeline {pipeline['id']} needs a repository citation"
        if pipeline["truth"] == "DEFINED":
            assert {"en", "uk"} <= set(pipeline.get("boundary") or {}), (
                f"DEFINED pipeline {pipeline['id']} must render a boundary sentence"
            )
        known: set[str] = set()
        for stage in pipeline["stages"]:
            missing = [field for field in STAGE_FIELDS if field not in stage]
            assert not missing, f"stage {pipeline['id']}.{stage.get('id')} is missing {missing}"
            where = f"{pipeline['id']}.{stage['id']}"
            assert stage["outcome"] in STAGE_OUTCOMES, f"stage {where} outcome"
            assert stage.get("truth", "RECORDED") in PIPELINE_TRUTHS, f"stage {where} truth state"
            assert set(stage["depends_on"]) <= known, (
                f"stage {where} depends on later or unknown stages"
            )
            known.add(stage["id"])
            stage_paths.add(where)
            if "pace_ms" in stage:
                pace = stage["pace_ms"]
                assert isinstance(pace, int | float) and pace > 0, f"stage {where} pace_ms"
            for bind in stage.get("live", []):
                assert bind["source"] in BIND_SOURCES, f"stage {where} live bind source"
                assert bind["pointer"].startswith("/"), f"stage {where} needs an RFC6901 pointer"
                assert {"en", "uk"} <= set(bind["label"]), f"stage {where} live bind label"
            cited = _citations(stage["source"])
            for path in cited:
                assert path.exists(), f"{path} cited by stage {where} does not exist"
            if stage.get("cmd"):
                pattern = _cmd_pattern(stage["cmd"])
                files = [path for path in cited if path.is_file()]
                assert any(pattern.search(_read(path)) for path in files), (
                    f"cmd of stage {where} is not verbatim in {stage['source']}"
                )
    for handoff in model.get("handoffs", []):
        unresolved = {handoff["from"], handoff["to"]} - stage_paths
        assert not unresolved, f"handoff endpoints are not declared stages: {sorted(unresolved)}"


def test_i18n_dictionaries_have_identical_key_sets() -> None:
    en_keys, uk_keys = _require_dictionaries()
    assert en_keys, "no keys parsed from i18n.en.js"
    assert sorted(en_keys - uk_keys) == [], "keys missing from site/data/i18n.uk.js"
    assert sorted(uk_keys - en_keys) == [], "keys missing from site/data/i18n.en.js"


def test_platform_events_v2_are_sourced_recorded_and_dependency_ordered() -> None:
    model = json.loads(_read(EVENTS))
    assert model["schema_version"] == 2
    assert {"en", "uk"} <= set(model["boundary"])
    assert len(model["events"]) == 21
    seen: set[str] = set()
    blocks = 0
    for event in model["events"]:
        missing = [field for field in EVENT_FIELDS if field not in event]
        assert not missing, f"event {event.get('id')} is missing {missing}"
        assert event["truth"] in {"RECORDED", "LIVE"}, f"event {event['id']} truth state"
        assert event["outcome"] in {"PASS", "BLOCK"}, f"event {event['id']} outcome"
        blocks += int(event["outcome"] == "BLOCK")
        assert set(event["depends_on"]) <= seen, f"event {event['id']} is not dependency ordered"
        seen.add(event["id"])
        for path in _citations(event["source"]):
            assert path.exists(), f"{path} cited by event {event['id']} does not exist"
        if "pace_ms" in event:
            pace = event["pace_ms"]
            assert isinstance(pace, int | float) and pace > 0, f"event {event['id']} pace_ms"
        if "uk" in event:
            overrides = {"resource", "action", "control", "evidence"}
            assert set(event["uk"]) <= overrides, f"event {event['id']} uk overrides {overrides}"
    assert blocks == 4, "the four recorded BLOCK events must survive the v2 migration"


def test_every_index_translation_key_exists_in_both_dictionaries() -> None:
    en_keys, uk_keys = _require_dictionaries()
    used = set()
    for value in re.findall(r'data-i18n(?:-html|-aria|-alt)?="([^"]+)"', _read(INDEX)):
        used.add(value.split(":")[-1].strip())
    assert used, "index.html must drive its static copy through data-i18n keys"
    assert sorted(used - en_keys) == [], "index.html keys absent from site/data/i18n.en.js"
    assert sorted(used - uk_keys) == [], "index.html keys absent from site/data/i18n.uk.js"


def test_every_gloss_reference_resolves_in_both_dictionaries() -> None:
    en_keys, uk_keys = _require_dictionaries()
    ids = _gloss_references()
    assert ids, "the explanation layer must mark at least one term with data-g"
    for gloss_id in sorted(ids):
        for keys, name in ((en_keys, EN.name), (uk_keys, UK.name)):
            for field in ("term", "short"):
                assert f"gloss.{gloss_id}.{field}" in keys, (
                    f"gloss.{gloss_id}.{field} is absent from {name}"
                )


def test_plain_layer_never_ships_a_number() -> None:
    for path in (EN, UK):
        strings = _dict_strings(path)
        assert any(key.startswith("gloss.") for key in strings), f"{path.name} carries no glosses"
        for key, value in strings.items():
            if not key.startswith(PLAIN_NAMESPACES):
                continue
            rest = value
            for token in PLAIN_WHITELIST:
                rest = rest.replace(token, " ")
            rest = PLAIN_NUMERALS.sub(" ", rest)
            assert not re.search(r"\d", rest), (
                f"{path.name} {key} hardcodes a number; measured values belong to evidence "
                f"renderers: {value!r}"
            )


def test_every_chapter_has_a_plain_card() -> None:
    for keys, name in zip(_require_dictionaries(), (EN.name, UK.name), strict=True):
        chapters = {key.split(".")[-1] for key in keys if key.startswith("plain.chapter.")}
        assert chapters == CHAPTERS, f"{name} plain.chapter covers {sorted(chapters)}"
    mounted = re.findall(r"""data-i18n-html=["']plain\.chapter\.([\w-]+)["']""", _read(INDEX))
    assert sorted(mounted) == sorted(CHAPTERS), (
        f"index.html mounts explain-cards for {sorted(mounted)}"
    )


def test_the_site_never_ships_a_fabricated_command_or_number() -> None:
    for path in sorted(SITE.rglob("*")):
        if not path.is_file() or path.suffix not in {".js", ".json", ".html", ".css"}:
            continue
        text = _read(path)
        for pattern in FORBIDDEN:
            assert pattern not in text, f"{path.name} ships the forbidden string {pattern!r}"
        if path.suffix == ".js":
            for pattern in FORBIDDEN_IN_JS:
                assert pattern not in text, (
                    f"{path.name} names {pattern!r} directly; the console class is derived "
                    "from the line kind so a BLOCK can never render as a success"
                )


def test_the_rejected_dataset_count_is_never_the_accepted_gate_evidence() -> None:
    model = json.loads(_read(EVENTS))
    carriers = [
        event["id"] for event in model["events"] if "790" in json.dumps(event, ensure_ascii=False)
    ]
    assert carriers == ["dataset-reject"], "790 images is the rejected export, not evidence"
    assert next(e for e in model["events"] if e["id"] == "dataset-reject")["outcome"] == "BLOCK"
    assert "790" not in _read(INDEX)
