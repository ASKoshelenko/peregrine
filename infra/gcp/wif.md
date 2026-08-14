# GitHub OIDC -> GCP WIF plan

Two service accounts, matching the Verdis split-control pattern:

- `peregrine-eval`: read GCS/DVC artifacts, read Vertex Model Registry, write benchmark summaries.
- `peregrine-deploy`: write Vertex Model Registry champion aliases and deploy Cloud Run revisions.

No JSON keys. Release jobs request `id-token: write`; deploy jobs are protected by the `demo-production` environment.
