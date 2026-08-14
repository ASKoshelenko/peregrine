output "dvc_bucket_url" {
  description = "DVC remote URL."
  value       = google_storage_bucket.dvc.url
}

output "artifact_bucket_url" {
  description = "Observed-run artifact bucket URL."
  value       = google_storage_bucket.artifacts.url
}

