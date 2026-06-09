package cic.docker

default allow := false

allow {
  input.kind == "Dockerfile"
  valid_base_image
  allowed_ports
  no_latest_tag
  no_root_user
}

valid_base_image {
  startswith(input.base_image, "python:3.11-slim")
} {
  startswith(input.base_image, "node:20-slim")
} {
  startswith(input.base_image, "nvidia/cuda:12.4.1-runtime-ubuntu22.04")
} {
  startswith(input.base_image, "ubuntu:22.04")
}

allowed_ports {
  not input.exposed_ports[_] == 22
}

no_latest_tag {
  not endswith(input.base_image, ":latest")
}

no_root_user {
  input.user != "root"
} {
  not input.user
}

# Lint rule: warn about missing HEALTHCHECK
warn_no_healthcheck {
  not input.healthcheck
}

# Lint rule: warn about missing labels
warn_no_labels {
  not input.labels
}
