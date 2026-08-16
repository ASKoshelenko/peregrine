# Peregrine design system — conventions for the design agent

Peregrine is a dark, evidence-first engineering aesthetic: near-black green ground, hairline borders, monospace data voice, restrained motion. Components come from `window.Peregrine.*` (16 components); the look ships entirely through `styles.css` and its import closure — no other stylesheet exists.

**Ground rules (product law, non-negotiable).** This system narrates a real MLOps platform. Its truth-state grammar is binding: `LIVE` = queried now (solid green chip), `RECORDED` = retained real run (amber), `DEFINED` = written plan never executed here (dashed blue outline, hollow nodes, dashed connectors, never a ✓/×), `SIMULATED` = the user's what-if (amber outline). Never present DEFINED content as executed; never attach LIVE to anything not freshly queried; BLOCK/refusal states are first-class content to display proudly, not errors to hide. When refining screens built on this system, extend and polish — do not remove or simplify away evidence surfaces (event rails, pipelines, BLOCK events, truth chips, source citations).

**Setup.** No provider needed. Components read CSS custom properties from `styles.css`; the page ground is dark by default (`body` carries `var(--ground)`). Give layout glue inline styles or the tokens below — do not invent new class names; the class vocabulary belongs to the compiled components.

**Tokens (all defined in `styles.css` `:root`).** Surfaces: `--ground` `--surface` `--raised`; ink: `--ink` `--ink-2` `--muted`; lines: `--line` `--line-strong`; semantics: `--signal` (green: evidence/live/pass), `--amber` (recorded/control), `--red` (block/refusal), `--blue` (defined/contract); fonts: `--font-ui`, `--font-data` (monospace — all data, chips, labels, commands); spacing: `--pad`, `--track`. Data values, ids, hashes, commands always render in `var(--font-data)`.

**Composition idioms.** `TruthChip state="…" quiet` — quiet tier when a chip merely repeats the surface's declared default; loud only for deviation or declaration. `Lane` wraps 3+ `LaneStage` children (set `defined` on the Lane for contract playback; include a BLOCK stage when telling a release story). `ConsoleFrame` holds `ConsoleLine kind="cmd|ok|fail|note|promote|live"` rows — commands must be real, outputs honest. `GateRow` values sit above their meter; `VerdictCard simulated` for hypotheticals. `Metric` for stat tiles (an em dash value means missing evidence — never invent numbers). `ExplainCard`/`GlossTerm` carry the plain-language layer.

**Where the truth lives.** Read `styles.css` (+ `_ds_bundle.css`) before styling anything; each component's `components/general/<Name>/<Name>.d.ts` is its exact API and `<Name>.prompt.md` its usage reference.

**Idiomatic snippet** (verified render):
```jsx
const { ChapterHead, Metric, VerdictCard, TruthChip } = window.Peregrine;
<div style={{ background: "var(--ground)", padding: "24px var(--pad, 24px)" }}>
  <ChapterHead eyebrow="Release control" title="Make the release system say no." />
  <div style={{ display: "flex", gap: 1 }}>
    <Metric label="Held-out mAP@0.50" value="0.9713 → 0.9451" note="quantization cost 0.0262" />
    <Metric label="x86 INT8 p95" value="182.0 ms" note="fixed benchmark protocol" />
  </div>
  <VerdictCard verdict="PROMOTE" note="Every hypothetical budget accepts the observed measurements." simulated />
</div>
```
