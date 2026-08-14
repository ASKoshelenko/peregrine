terraform {
  required_version = ">= 1.10, < 2.0"

  backend "gcs" {
    bucket = "peregrine-edge-mlops-artifacts"
    prefix = "terraform/foundation"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}
