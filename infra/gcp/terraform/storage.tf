locals {
  common_labels = {
    project     = "peregrine"
    environment = "demo"
    managed_by  = "terraform"
  }
}

resource "google_storage_bucket" "dvc" {
  name                        = "${var.project_id}-dvc"
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = merge(local.common_labels, { purpose = "dataset-lineage" })

  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      days_since_noncurrent_time = 30
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "artifacts" {
  name                        = "${var.project_id}-artifacts"
  project                     = var.project_id
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = merge(local.common_labels, { purpose = "ml-artifacts" })

  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      days_since_noncurrent_time = 30
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}
