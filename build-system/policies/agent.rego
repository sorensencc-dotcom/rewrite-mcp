package cic.agent

default allow := false

allow {
  input.agent_id != ""
  input.phase == "0.7"
  input.lineage.provenance.git_sha != ""
  input.lineage.provenance.sbom_ref != ""
  valid_agent_id
}

valid_agent_id {
  input.agent_id == "cic.ingestion"
} {
  input.agent_id == "cic.evolution"
} {
  input.agent_id == "labs.discovery"
} {
  input.agent_id == "labs.extractor"
} {
  input.agent_id == "labs.redesign.gpu"
} {
  input.agent_id == "labs.outreach"
} {
  input.agent_id == "inference.nemotron"
}

# Lint: ensure provenance builder is set
warn_no_builder {
  not input.lineage.provenance.builder
}

# Lint: ensure inputs/outputs documented
warn_no_inputs {
  not input.lineage.inputs
}

warn_no_outputs {
  not input.lineage.outputs
}
