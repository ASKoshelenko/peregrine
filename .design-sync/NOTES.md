# design-sync notes — Peregrine

- Peregrine's real design system is vanilla CSS (`site/styles.css`); Claude Design needs React. The synced package is a thin adapter: `ui-kit/` (`@peregrine/ui`, 16 components) whose wrappers emit the site's REAL class names; `ui-kit/styles.css` is copied verbatim from `site/styles.css` (tokens + component rules) plus a marked `/* adapter shims */` section (layout containment only). When `site/styles.css` changes visually, re-extract the affected rules into `ui-kit/styles.css` before re-syncing.
- Build: `npm --prefix ui-kit run build` (esbuild ESM bundle + tsc declarations). Converter entry: `--entry ./ui-kit/dist/index.mjs --node-modules ui-kit/node_modules`.
- DARK GROUND: preview cards hardcode `body{background:#fff}` inline in `lib/emit.mjs` (no config knob; emit.mjs must not be forked). The DS is dark, so `ui-kit/styles.css` shims carry `body{background:var(--ground)!important;color:var(--ink)...}` — that is what makes every card render on the true ground. Do not remove.
- `cssEntry` is package-relative: `"styles.css"` (a `ui-kit/…` prefix silently misses and falls back to auto-scrape).
- Solo-calibration lesson: grade Button/TruthChip-class components only on the dark ground; on white the secondary/outline variants look broken when they are not.
- Preview content mines: `site/data/i18n.en.js`, `site/pipelines.json`, `site/platform-events.json` — real gate values (Q2 182.0363 ≤ 227.5), real events (Warehouse Pallet v1 BLOCK), real console lines. No lorem.
- Owner's law for any design work produced with this DS (also in the conventions header): refine the unified system; never remove evidence surfaces (rail, pipelines, BLOCK events, truth chips) or the infra-creation story.

## Known render warns
- (none recorded yet)

## Re-sync risks
- `ui-kit/styles.css` drifts from `site/styles.css` silently — diff the token block + component rules on every re-sync.
- The adapter components mirror JS renderers' class grammar (`pipeline-model.js truthChip`, `lane.js`, `rail.js`, `gates.js`); if those renderers change emitted classes, wrappers must follow.
- `.design-sync/.cache/` grades are machine-local; verified-state carry-forward comes from the uploaded `_ds_sync.json`.
