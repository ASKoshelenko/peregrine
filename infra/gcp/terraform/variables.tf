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

