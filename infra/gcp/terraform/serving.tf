resource "google_project_service" "serving" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "serving" {
  project       = var.project_id
  location      = var.region
  repository_id = "peregrine-serving"
  description   = "Immutable, CPU-only Peregrine inference images"
  format        = "DOCKER"
  labels        = merge(local.common_labels, { purpose = "serving" })

  cleanup_policy_dry_run = false

  cleanup_policies {
    id     = "delete-untagged"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"
    }
  }

  depends_on = [google_project_service.serving]
}

resource "google_service_account" "runtime" {
  project      = var.project_id
  account_id   = "peregrine-runtime"
  display_name = "Peregrine Cloud Run runtime"
  description  = "No project roles: the immutable model is bundled in the image."
}

resource "google_cloud_run_v2_service" "api" {
  count = var.service_image == "" ? 0 : 1

  project             = var.project_id
  name                = "peregrine"
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"
  labels              = merge(local.common_labels, { purpose = "interactive-demo" })

  template {
    service_account                  = google_service_account.runtime.email
    timeout                          = "30s"
    max_instance_request_concurrency = 4

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.service_image

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 5
        period_seconds        = 5
        failure_threshold     = 24
        http_get {
          path = "/readyz"
        }
      }

      liveness_probe {
        timeout_seconds   = 2
        period_seconds    = 30
        failure_threshold = 3
        http_get {
          path = "/healthz"
        }
      }
    }
  }

  depends_on = [google_project_service.serving]
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.service_image == "" ? 0 : 1

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
