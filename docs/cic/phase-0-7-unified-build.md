---
title: Phase 0.7 — Unified CIC + Rewrite Labs Build System
version: 0.7.0
date: 2026-06-09
---

# Phase 0.7 — Unified CIC + Rewrite Labs Build System

**Executive Summary:**
Phase 0.7 unifies CIC ingestion, Rewrite Labs pipeline (discovery → extractor → redesign → outreach), and Nemotron/NIM inference into a single deterministic, multi-agent build orchestration layer. All artifacts are traceable via lineage packets, validated by policy enforcement (OPA), and observable via CIC's telemetry stack (Prometheus, Grafana, Loki).

---

## 1. Build Graph Architecture

### 1.1 Logical DAG

```
[Code Repo]
  ├─→ A: CIC Ingestion Agent (Python)
  ├─→ B: CIC Evolution Agent (Python)
  ├─→ C: Labs Discovery Agent (Node)
  ├─→ D: Labs Extractor Agent (Node)
  ├─→ E: Labs Redesign GPU Agent (Python + CUDA)
  ├─→ F: Labs Outreach Agent (Node)
  └─→ G: Nemotron/NIM Inference Container (NVIDIA CUDA)

[A, B, C, D, E, F, G] ──→ [Registry + Lineage Vault]
                              ↓
                    [CIC Observability Layer]
                    (Prometheus, Loki, Grafana)
```

### 1.2 Execution Model

- **Parallel:** A, B, C, G execute in parallel (no dependencies)
- **Sequential:** D depends on C; E depends on D + G; F depends on E
- **Artifact Flow:** Each agent produces build artifacts (image, logs, SBOM, lineage packet)
- **Registry:** All images pushed to unified registry with lineage metadata
- **Observability:** All metrics/logs flow to CIC's telemetry stack

### 1.3 Build Graph JSON Schema

```json
{
  "version": "0.7.0",
  "nodes": [
    {
      "id": "cic.ingestion",
      "type": "agent",
      "image": "cic/ingestion:0.7.0",
      "language": "python",
      "depends_on": [],
      "timeout_seconds": 3600
    },
    {
      "id": "cic.evolution",
      "type": "agent",
      "image": "cic/evolution:0.7.0",
      "language": "python",
      "depends_on": [],
      "timeout_seconds": 3600
    },
    {
      "id": "labs.discovery",
      "type": "agent",
      "image": "labs/discovery:0.7.0",
      "language": "node",
      "depends_on": [],
      "timeout_seconds": 1800
    },
    {
      "id": "labs.extractor",
      "type": "agent",
      "image": "labs/extractor:0.7.0",
      "language": "node",
      "depends_on": ["labs.discovery"],
      "timeout_seconds": 3600
    },
    {
      "id": "labs.redesign.gpu",
      "type": "agent",
      "image": "labs/redesign-gpu:0.7.0",
      "language": "python",
      "gpu_required": true,
      "depends_on": ["labs.extractor", "inference.nemotron"],
      "timeout_seconds": 5400
    },
    {
      "id": "labs.outreach",
      "type": "agent",
      "image": "labs/outreach:0.7.0",
      "language": "node",
      "depends_on": ["labs.redesign.gpu"],
      "timeout_seconds": 1800
    },
    {
      "id": "inference.nemotron",
      "type": "inference",
      "image": "nvidia/nemotron-nano-30b:0.7.0",
      "language": "python",
      "gpu_required": true,
      "depends_on": [],
      "timeout_seconds": 7200,
      "models": ["nemotron-nano-30b"]
    }
  ],
  "registry": {
    "endpoint": "registry.example.com",
    "namespace": "cic-labs",
    "retention_days": 90
  }
}
```

---

## 2. Dockerfile Templates (Multi-Stage)

### 2.1 CIC Ingestion Agent

**Location:** `build-system/docker/cic/Dockerfile.ingestion`

```dockerfile
# Stage 0: base
FROM python:3.11-slim AS base
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y ca-certificates curl git && rm -rf /var/lib/apt/lists/*

# Stage 1: build
FROM base AS build
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen
COPY src/ src/
COPY tests/ tests/
RUN pytest --maxfail=1 --disable-warnings -q
RUN python -m compileall src

# Stage 2: compliance
FROM build AS compliance
RUN pip install cyclonedx-bom
RUN cyclonedx-py --output sbom.json
RUN python scripts/gen_provenance.py --out provenance.json

# Stage 3: runtime
FROM python:3.11-slim AS runtime
WORKDIR /app
COPY --from=build /app/src/ /app/src/
COPY --from=compliance /app/sbom.json /app/provenance.json /app/
ENV CIC_AGENT_ID="cic.ingestion"
ENV CIC_AGENT_VERSION="0.7.0"
ENV CIC_PHASE="0.7"
LABEL cic.agent.id="cic.ingestion" cic.phase="0.7"
HEALTHCHECK CMD python -m src.healthcheck
ENTRYPOINT ["python", "-m", "src.main"]
```

### 2.2 Labs Redesign GPU Agent (Nemotron-Aware)

**Location:** `build-system/docker/labs/Dockerfile.redesign.gpu`

```dockerfile
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04 AS base
RUN apt-get update && apt-get install -y python3 python3-pip git && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen
COPY src/ src/
RUN pytest -m "redesign" -q

FROM build AS compliance
RUN pip install cyclonedx-bom
RUN cyclonedx-py --output sbom.json
RUN python scripts/gen_provenance.py --out provenance.json

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/src/ /app/src/
COPY --from=compliance /app/sbom.json /app/provenance.json /app/
ENV LABS_AGENT_ID="labs.redesign.gpu"
ENV LABS_AGENT_VERSION="0.7.0"
ENV NIM_ENDPOINT="http://nim-gateway:8000"
ENV NEMOTRON_MODEL="nemotron-nano-30b"
LABEL labs.agent.id="labs.redesign.gpu" labs.phase="0.7"
HEALTHCHECK CMD python -m src.healthcheck
ENTRYPOINT ["python", "-m", "src.redesign_main"]
```

---

## 3. Lineage Schema

### 3.1 Artifact Lineage Packet

**Location:** `build-system/schemas/lineage-packet.schema.json`

```json
{
  "$id": "https://cic.example.com/schema/lineage/0.7.0",
  "type": "object",
  "required": ["artifact_id", "agent_id", "version", "build_id", "inputs", "outputs", "provenance"],
  "properties": {
    "artifact_id": {
      "type": "string",
      "description": "Unique artifact identifier (e.g., labs.redesign.gpu:0.7.0-20260609-01)"
    },
    "agent_id": {
      "type": "string",
      "description": "CIC agent identifier",
      "enum": ["cic.ingestion", "cic.evolution", "labs.discovery", "labs.extractor", "labs.redesign.gpu", "labs.outreach", "inference.nemotron"]
    },
    "version": {
      "type": "string",
      "description": "Semantic version (0.7.0)"
    },
    "build_id": {
      "type": "string",
      "description": "Unique build identifier (e.g., build-20260609-134500)"
    },
    "phase": {
      "type": "string",
      "enum": ["0.7"]
    },
    "inputs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Parent artifact IDs this build depends on"
    },
    "outputs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Output artifact IDs produced by this build"
    },
    "provenance": {
      "type": "object",
      "required": ["git_sha", "timestamp", "sbom_ref"],
      "properties": {
        "git_sha": {
          "type": "string",
          "description": "Git commit SHA"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "Build timestamp (ISO 8601)"
        },
        "sbom_ref": {
          "type": "string",
          "description": "Reference to SBOM artifact"
        },
        "builder": {
          "type": "string",
          "description": "Build system identifier (e.g., cic.build-system.earthly)"
        }
      }
    },
    "drift_signature": {
      "type": "string",
      "description": "SHA256 hash of build environment state"
    },
    "parent_build_id": {
      "type": "string",
      "description": "Previous build ID (for ancestry tracking)"
    }
  }
}
```

### 3.2 Example Lineage Packet

```json
{
  "artifact_id": "labs.redesign.gpu:0.7.0-20260609-01",
  "agent_id": "labs.redesign.gpu",
  "version": "0.7.0",
  "build_id": "build-20260609-134500",
  "phase": "0.7",
  "inputs": [
    "labs.extractor:0.7.0-20260609-01",
    "inference.nemotron:0.7.0-20260609-01"
  ],
  "outputs": [
    "redesign.packet:site-1234",
    "redesign.packet:site-5678"
  ],
  "provenance": {
    "git_sha": "abc123def456",
    "timestamp": "2026-06-09T13:45:00Z",
    "sbom_ref": "sbom://labs.redesign.gpu/0.7.0/build-20260609-134500",
    "builder": "cic.build-system.earthly"
  },
  "drift_signature": "sha256:deadbeefcafebabe...",
  "parent_build_id": "build-20260608-101200"
}
```

---

## 4. Policy Pack (OPA/Conftest)

### 4.1 Docker Policy

**Location:** `build-system/policies/docker.rego`

```rego
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
```

### 4.2 Agent Policy

**Location:** `build-system/policies/agent.rego`

```rego
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
```

---

## 5. Routing Maps

### 5.1 Logical Routing

**Location:** `build-system/schemas/routing-map.yaml`

```yaml
version: "0.7.0"
routes:
  - from: cic.ingestion
    to: cic.evolution
    channel: "cic.events"
    retry_policy: "exponential_backoff_3"

  - from: cic.evolution
    to: labs.discovery
    channel: "labs.discovery.requests"
    retry_policy: "exponential_backoff_3"

  - from: labs.discovery
    to: labs.extractor
    channel: "labs.extractor.requests"
    retry_policy: "exponential_backoff_3"

  - from: labs.extractor
    to: labs.redesign.gpu
    channel: "labs.redesign.requests"
    retry_policy: "exponential_backoff_3"

  - from: labs.redesign.gpu
    to: labs.outreach
    channel: "labs.outreach.requests"
    retry_policy: "exponential_backoff_3"

  - from: labs.redesign.gpu
    to: inference.nemotron
    channel: "inference.requests"
    retry_policy: "exponential_backoff_5"

  - from: "*"
    to: cic.observability
    channel: "cic.telemetry"
    async: true
```

---

## 6. Agent Registration Spec

### 6.1 Registration Payload

**Location:** `build-system/schemas/agent-registration.schema.json`

```json
{
  "agent_id": "labs.redesign.gpu",
  "version": "0.7.0",
  "kind": "container",
  "image": "registry.example.com/labs/redesign-gpu:0.7.0",
  "health_endpoint": "http://labs-redesign-gpu:8080/health",
  "telemetry_endpoint": "http://labs-redesign-gpu:8080/telemetry",
  "phase": "0.7",
  "capabilities": ["redesign", "nemotron-inference"],
  "dependencies": ["labs.extractor", "inference.nemotron"],
  "policies": ["cic.docker", "cic.agent"],
  "lineage_schema": "https://cic.example.com/schema/lineage/0.7.0",
  "startup_timeout_seconds": 60,
  "readiness_probe": {
    "path": "/health/ready",
    "interval_seconds": 10,
    "timeout_seconds": 5
  }
}
```

---

## 7. CI/CD Integration

### 7.1 GitHub Actions Workflow

**Location:** `.github/workflows/phase-0-7-build.yml`

```yaml
name: Phase 0.7 — Unified Build

on:
  push:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'build-system/**'
  workflow_dispatch:

jobs:
  build-graph:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        agent:
          - cic.ingestion
          - cic.evolution
          - labs.discovery
          - labs.extractor
          - labs.redesign.gpu
          - labs.outreach
          - inference.nemotron
    steps:
      - uses: actions/checkout@v4
      - name: Build ${{ matrix.agent }}
        run: |
          docker build \
            -f build-system/docker/cic/Dockerfile.ingestion \
            -t registry.example.com/cic/${{ matrix.agent }}:${{ github.sha }} \
            .
      - name: Validate policies
        run: |
          conftest test \
            -p build-system/policies/ \
            build-system/docker/cic/Dockerfile.ingestion
      - name: Generate lineage packet
        run: |
          python scripts/gen_lineage_packet.py \
            --agent ${{ matrix.agent }} \
            --build-id ${{ github.run_id }} \
            --output lineage.json
      - name: Push to registry
        run: |
          docker push registry.example.com/cic/${{ matrix.agent }}:${{ github.sha }}

  observability:
    needs: build-graph
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Push metrics to Prometheus
        run: |
          python scripts/push_build_metrics.py \
            --build-id ${{ github.run_id }} \
            --prometheus-endpoint http://prometheus:9090
```

---

## 8. Milestones & Timeline

| Milestone | Days | Deliverables |
|-----------|------|--------------|
| Build graph + lineage schema locked | 1–3 | DAG spec, lineage JSON schema, examples |
| Dockerfile templates validated | 4–8 | All 7 multi-stage Dockerfiles, test builds |
| Policy pack integrated | 9–12 | OPA/Conftest rules, validation CI step |
| Routing maps + agent registration | 13–15 | YAML routing, registration schema, examples |
| CI/CD pipelines automated | 16–18 | GitHub Actions workflows, build scripts |
| Documentation + operator training | 19–21 | Operator runbook, architecture guide, FAQs |

**Timeline:** 2026-06-09 through 2026-06-29 (3 weeks)

---

## 9. Success Criteria

- ✅ All 7 agents build deterministically and reproducibly
- ✅ Lineage packets generated for 100% of artifacts
- ✅ Policy pack validates 100% of Docker configurations
- ✅ Routing maps enable correct message flow between agents
- ✅ Agent registration enables CIC discovery and orchestration
- ✅ CI/CD pipelines fully automated (no manual intervention)
- ✅ All artifacts pushed to registry with provenance signing
- ✅ Observability metrics flowing to Prometheus/Grafana/Loki
- ✅ Operator runbook covers troubleshooting and common tasks

---

## 10. Integration with Phase 0.9 (TheFoundry)

Phase 0.7 and Phase 0.9 operate at different layers:

- **Phase 0.7:** Multi-agent build orchestration (CIC + Labs + Nemotron/NIM)
- **Phase 0.9:** Sealed Node.js build environment (deterministic npm builds)

**Phase 0.7 → Phase 0.9 Handoff:**
1. Phase 0.7 generates multi-stage Dockerfiles with base images
2. Phase 0.9 refines Node.js build stages (npm ci, lint, test, build)
3. Both produce images with SBOM + provenance
4. Both emit lineage packets to CIC observability

**Shared Infrastructure:**
- Registry endpoint
- Lineage vault (MemoryStore)
- Observability stack (Prometheus, Grafana, Loki)
- Policy pack (OPA/Conftest)

---

## 11. Appendix: File Manifest

```
build-system/
├── docker/
│   ├── cic/
│   │   ├── Dockerfile.ingestion
│   │   └── Dockerfile.evolution
│   ├── labs/
│   │   ├── Dockerfile.discovery
│   │   ├── Dockerfile.extractor
│   │   ├── Dockerfile.redesign.gpu
│   │   └── Dockerfile.outreach
│   └── inference/
│       └── Dockerfile.nemotron-nano-30b
├── schemas/
│   ├── build-graph.schema.json
│   ├── lineage-packet.schema.json
│   ├── agent-registration.schema.json
│   └── routing-map.yaml
├── policies/
│   ├── docker.rego
│   ├── agent.rego
│   └── governance.rego
├── ci/
│   └── github-actions/
│       └── phase-0-7-build.yml
├── examples/
│   ├── build-labs-redesign-gpu.sh
│   └── validate-lineage-packet.sh
└── README.md
```

---

**Status:** QUEUED — Ready for implementation  
**Next:** Generate concrete files, wire to TheFoundry, commit Phase 0.7 to main
