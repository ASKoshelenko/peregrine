---
name: qa-web
description: Browser QA of the Peregrine site — exact mobile viewports, real-tap sweeps, WebKit/iPhone emulation, bilingual localization audit, animation checks. Use for "проверь в браузере", mobile/tap bugs, l10n verification, or post-deploy acceptance.
---

# QA the Peregrine web app

## Viewports (Chrome extension can't resize a fullscreen window)
Create a throwaway harness `site/_qa.html` (DELETE it before any commit/deploy — it must never ship):
```html
<!doctype html><meta charset="utf-8"><title>QA harness</title>
<style>html,body{margin:0;background:#333}iframe{display:block;border:0}</style>
<iframe id="f" src="/"></iframe>
<script>const p=new URLSearchParams(location.search),f=document.getElementById("f");
f.style.width=(p.get("w")||390)+"px";f.style.height=(p.get("h")||640)+"px";
if(p.get("src"))f.src=p.get("src");</script>
```
Open `http://127.0.0.1:8017/_qa.html?w=390&h=640` (same-origin: JS scroll works) or `?src=https%3A%2F%2Fperegrine.devopsdive.com%2F` (prod: coordinate taps work, JS scroll/wheel into the iframe does NOT — navigate the iframe to `#section` hashes instead). Keep h ≤ window innerHeight so the bottom tab bar is clickable.

## Traps that produce false bugs
- **Stale service worker**: first load after a deploy serves the previous shell. Before judging anything: `getRegistrations()→unregister` + `caches.keys()→delete`, reload.
- **Hidden tab honesty**: occluded Chrome windows report `document.hidden` → the site pauses animations (`html.is-paused`), IO reveals don't fire, countUps land instantly. For motion QA bring the window forward: `osascript -e 'tell application "Google Chrome" to activate'` (+ select the tab by title via AppleScript if needed).
- **Programmatic scroll before user activation** may be refused; after one real gesture it works. Use `behavior:'instant'`.
- Restart the local uvicorn after ANY backend/site file change before testing.

## WebKit ground truth (what Chrome can't tell you)
`playwright-webkit` is installed in the scratchpad's node_modules (pattern scripts there: `webkit-*.mjs`):
```js
import { webkit, devices } from "playwright-webkit";
const page = await (await (await webkit.launch()).newContext({...devices["iPhone 15 Pro"]})).newPage();
page.on("pageerror", e => errors.push(e.message));   // console capture per tap
await page.tap("selector"); await page.locator("#image-input").setInputFiles("/tmp/x.jpg");
```
Sweep every interactive element (tabs, replays, scrubber `dispatchEvent(new Event('input',{bubbles:true}))`, sliders via `touchscreen.tap` at boundingBox fractions, drawers, copy) asserting state changes programmatically; zero console errors is part of the acceptance bar.

## Bilingual (EN/УКР) audit
Dict parity is CI-enforced; runtime gaps are found by DOM diff: unhide all workspaces (`[data-workspace].hidden=false`), open all `details`/panels, TreeWalker-harvest text nodes + aria-label/alt/placeholder + document.title per language, align by CSS path, flag identical EN==UK pairs, filter system vocabulary (LIVE/RECORDED/DEFINED/SIMULATED/PROMOTE/BLOCK/PASS, verbatim commands, paths, proper names, digits/hashes — those are correct untranslated by the i18n law). Separately sweep every `button.gloss[data-g]` popover per language and check the PLAIN/ПРОСТО toggle label + `details.explain-card` contents. Dynamic strings need flows: replay summary, lane status, gate BLOCK verdict, detector statuses, scope offer/result, error paths.

## Acceptance bar (owner's)
Pixel-perfect at 360/390/768/1024/1440, both locales, every interactive state, no horizontal body scroll, reduced-motion still renders final states, evidence surfaces never simplified away.
