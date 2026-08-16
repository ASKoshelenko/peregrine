---
name: deploy
description: Build, verify and roll out the Peregrine site+API to Cloud Run (digest-pinned via Terraform), then verify production end to end. Use for "выкати", "deploy", "раскатай" or after any site/src change that must go live.
---

# Deploy Peregrine to production

Version discipline: every release bumps the shared token `control-room-N` in BOTH `site/index.html` (`?v=` refs) and `site/sw.js` (`const V`) — `tests/test_site_contracts.py` enforces the pairing. Pick the next N; the docker tag reuses it.

1. **Preflight** (all must be green):
   ```sh
   export PATH="$PWD/.venv/bin:$PATH" && make check        # ruff + mypy strict + pytest
   for f in $(find site -name '*.js'); do node --check "$f" || break; done
   ```
   Never run `make observe` for UI-only changes — it re-stamps `run_id`/`source_commit` in `artifacts/observed/latest.json` and breaks evidence lineage (`git checkout -- artifacts` if it happened).

2. **Commit** (repo style: `feat(site):`/`fix(site):`, body explains the why, no bullet lists).

3. **Image**:
   ```sh
   docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/peregrine-edge-mlops/peregrine-serving/api:control-room-N .
   docker push us-central1-docker.pkg.dev/peregrine-edge-mlops/peregrine-serving/api:control-room-N   # prints the sha256 digest
   ```
   Optional container smoke before pushing: run it on :8089 and check `/readyz` (model fingerprint), `/`, `/api/predict` with a JPEG from `data/processed/warehouse-calib/images/`.

4. **Terraform** (state in GCS; always `-chdir`, never `cd`):
   ```sh
   terraform -chdir=infra/gcp/terraform plan -input=false -var 'service_image=us-central1-docker.pkg.dev/peregrine-edge-mlops/peregrine-serving/api@sha256:DIGEST' -out=crN.tfplan
   terraform -chdir=infra/gcp/terraform apply -input=false crN.tfplan
   ```
   Image-only release plans exactly `0 to add, 1 to change`. Anything else — read the plan before applying.

5. **Verify prod** (peregrine.devopsdive.com):
   - `/api/platform` → new revision + the pushed digest;
   - `/` and `/sw.js` both carry `control-room-N`;
   - byte-compare assets: `curl -s https://peregrine.devopsdive.com/app.js | shasum -a 256` vs local `site/app.js` (spot-check a few incl. changed files);
   - real inference: POST a warehouse JPEG to `/api/predict` (detections, model_sha256 = Dockerfile pin);
   - if scope-lane touched: POST a non-warehouse image to `/api/scope` (expects `in_domain:false` + description).

6. `git push origin main`.

Caveats: the FIRST page load after deploy may serve the previous SW cache (network-first revalidates in background) — second load is fresh; when QA-ing, unregister the SW + clear caches first. Local server for testing: `PYTHONPATH=src PEREGRINE_MODEL_PATH=models/best.onnx PEREGRINE_SITE_DIR=site PEREGRINE_ARTIFACT_DIR=artifacts .venv/bin/uvicorn peregrine.api:app --port 8017` — restart it after every backend/site edit.
