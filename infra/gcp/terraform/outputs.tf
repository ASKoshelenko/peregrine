output "dvc_bucket_url" {
  description = "DVC remote URL."
  value       = google_storage_bucket.dvc.url
}

output "artifact_bucket_url" {
  description = "Observed-run artifact bucket URL."
  value       = google_storage_bucket.artifacts.url
}

output "container_repository" {
  description = "Regional Docker repository used by the immutable serving image."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.serving.repository_id}"
}

output "cloud_run_url" {
  description = "Cloud Run service URL; null until an immutable image is supplied."
  value       = var.service_image == "" ? null : google_cloud_run_v2_service.api[0].uri
}
