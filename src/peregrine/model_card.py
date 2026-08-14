"""Model card renderer for observed Peregrine runs."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def render_model_card(run: dict[str, Any]) -> str:
    """Render a concise markdown model card from observed evidence."""
    targets = run["targets"]
    verdict = run["release_verdict"]
    cost = run["cost"]["training_run_usd"]
    lineage_rows = [
        f"| `{key}` | `{value if value is not None else 'not yet observed'}` |"
        for key, value in run["lineage"].items()
    ]
    lines = [
        f"# {run['model']['name']} INT8 model card",
        "",
        f"Run: `{run['run_id']}`",
        f"Observed at: `{run['observed_at']}`",
        f"Fingerprint: `{run['fingerprint']}`",
        f"Dataset hash: `{run['dataset_hash']}`",
        f"Environment hash: `{run['environment']['env_hash']}`",
        f"Accuracy basis: {run['accuracy_basis']}",
        f"Cost: `{cost if cost is not None else 'not yet observed'}`",
        "",
        "## Lineage",
        "",
        "| Field | Value |",
        "|---|---|",
        *lineage_rows,
        "",
        "## Metrics by target",
        "",
        "| Target | mAP50 | mAP50-95 | p50 ms | p95 ms | Size MB | Lane | Host |",
        "|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for target, metrics in targets.items():
        lines.append(
            f"| `{target}` | {metrics['map50_proxy']:.4f} | {metrics['map5095_proxy']:.4f} | "
            f"{metrics['p50_ms']:.2f} | {metrics['p95_ms']:.2f} | {metrics['size_mb']:.1f} | "
            f"{metrics.get('lane', 'contract')} | {metrics.get('host', run['environment'])} |"
        )
    lines.extend(
        [
            "",
            "## Release verdict",
            "",
            f"Decision: `{'PROMOTE' if verdict['passed'] else 'BLOCK'}`",
            f"Failed gates: `{', '.join(verdict['failed_gate_ids']) or 'none'}`",
            "",
            "## Boundaries",
            "",
        ]
    )
    for key, value in run["boundaries"].items():
        lines.append(f"- **{key}:** {value}")
    lines.extend(
        [
            "",
            "## License decision",
            "",
            str(run["model"]["license_note"]),
            "",
        ]
    )
    return "\n".join(lines)


def write_model_card(path: Path, run: dict[str, Any]) -> str:
    """Write a model card and return its text."""
    text = render_model_card(run)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return text
