variable "project_id" {
  description = "Dedicated GCP project for Peregrine."
  type        = string
  default     = "peregrine-edge-mlops"

  validation {
    condition     = var.project_id == "peregrine-edge-mlops"
    error_message = "Peregrine infrastructure must stay isolated in peregrine-edge-mlops."
  }
}

variable "region" {
  description = "Single region used for data and ML artifacts."
  type        = string
  default     = "us-central1"
}

variable "service_image" {
  description = "Immutable Artifact Registry image digest. Empty during repository bootstrap."
  type        = string
  default     = ""

  validation {
    condition     = var.service_image == "" || can(regex("@sha256:[0-9a-f]{64}$", var.service_image))
    error_message = "service_image must be empty or pinned by sha256 digest."
  }
}
