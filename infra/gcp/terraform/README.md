# Peregrine GCP foundation

This root declares the minimal storage foundation for dataset lineage and observed ML artifacts.
It does not create compute, GPUs, Vertex jobs, endpoints, or always-on services.

Safety properties:

- fixed project validation prevents accidental use of an unrelated project;
- regional placement in `us-central1`;
- uniform bucket-level access and enforced public access prevention;
- object versioning;
- soft delete disabled to avoid overlapping retention cost; object versioning is the recovery
  mechanism;
- noncurrent versions expire after 30 days to bound credit usage;
- `force_destroy=false` and `prevent_destroy=true` protect evidence from accidental deletion;
- no credentials, billing account identifiers, or Terraform state are committed.

Review-only workflow:

```bash
cd infra/gcp/terraform
terraform init
terraform fmt -check
terraform validate
terraform plan -out=peregrine.tfplan
terraform show peregrine.tfplan
```

Terraform state is stored under `gs://peregrine-edge-mlops-artifacts/terraform/foundation` and
inherits the bucket's versioning and public-access prevention. Do not commit local state or plan
files. Configure the DVC remote from the output rather than duplicating the bucket name in
application code.
