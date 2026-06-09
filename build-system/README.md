# Phase 0.7 — Unified CIC + Rewrite Labs Build System

Deterministic, multi-agent build orchestration for CIC ingestion, Rewrite Labs pipeline, and Nemotron/NIM inference.

## Quick Start

### 1. Build All Agents

**Manual builds:**

```bash
# Build CIC agents (parallel)
docker build -f docker/cic/Dockerfile.ingestion -t cic/ingestion:0.7.0 .
docker build -f docker/cic/Dockerfile.evolution -t cic/evolution:0.7.0 .

# Build Labs agents (with dependency ordering)
docker build -f docker/labs/Dockerfile.discovery -t labs/discovery:0.7.0 .
docker build -f docker/labs/Dockerfile.extractor -t labs/extractor:0.7.0 .
docker build -f docker/labs/Dockerfile.redesign.gpu -t labs/redesign-gpu:0.7.0 .
docker build -f docker/labs/Dockerfile.outreach -t labs/outreach:0.7.0 .

# Build Nemotron inference agent (requires NVIDIA CUDA)
docker build -f docker/inference/Dockerfile.nemotron-nano-30b -t inference/nemotron:0.7.0 .
```

**Automated:**

```bash
bash examples/build-all-agents.sh
```

All 7 agents will be built with:
- Deterministic multi-stage builds
- SBOM + provenance generation
- Policy validation (OPA)
- Lineage packet metadata

### 2. Validate Policies

```bash
# Install conftest
brew install conftest

# Validate Dockerfiles against policies
conftest test -p policies/ docker/cic/Dockerfile.ingestion
conftest test -p policies/ docker/labs/Dockerfile.redesign.gpu
```

### 3. Generate Lineage Packets

```bash
python3 scripts/gen_lineage_packet.py \
  --agent labs.redesign.gpu \
  --build-id build-20260609-134500 \
  --output lineage.json
```

### 4. Push to Registry

```bash
# Set registry endpoint
export REGISTRY=registry.example.com

# Push all agents
docker tag cic/ingestion:0.7.0 $REGISTRY/cic/ingestion:0.7.0
docker push $REGISTRY/cic/ingestion:0.7.0

# ... repeat for all agents
```

## Directory Structure

```
build-system/
├── docker/                    # Multi-stage Dockerfiles
│   ├── cic/                   # CIC agents
│   ├── labs/                  # Rewrite Labs agents
│   └── inference/             # Nemotron/NIM inference
├── schemas/                   # JSON/YAML schemas
│   ├── lineage-packet.schema.json
│   ├── agent-registration.schema.json
│   ├── build-graph.json
│   └── routing-map.yaml
├── policies/                  # OPA/Conftest policies
│   ├── docker.rego
│   ├── agent.rego
│   └── governance.rego
├── ci/                        # CI/CD templates
│   └── github-actions/
│       └── phase-0-7-build.yml
├── examples/                  # Scripts and examples
│   ├── build-all-agents.sh
│   ├── validate-lineage.sh
│   └── agent-registration-example.json
└── README.md
```

## Agents

### CIC Agents

- **cic.ingestion** — Archive ingestion, classification, lineage tracking
- **cic.evolution** — Plan generation, capability discovery, roadmap synthesis

### Rewrite Labs Agents

- **labs.discovery** — Site discovery, URL mapping, categorization
- **labs.extractor** — Content extraction, normalization, analysis
- **labs.redesign.gpu** — Design suggestion, Nemotron/NIM integration
- **labs.outreach** — Outreach packet generation, contact discovery

### Inference Agent

- **inference.nemotron** — Nemotron Nano 30B inference gateway

## Schemas

### Lineage Packet

Artifact lineage and provenance tracking. See `schemas/lineage-packet.schema.json`.

Example:
```json
{
  "artifact_id": "labs.redesign.gpu:0.7.0-20260609-01",
  "agent_id": "labs.redesign.gpu",
  "version": "0.7.0",
  "build_id": "build-20260609-134500",
  "phase": "0.7",
  "provenance": {
    "git_sha": "abc123...",
    "timestamp": "2026-06-09T13:45:00Z",
    "sbom_ref": "sbom://...",
    "builder": "cic.build-system.earthly"
  }
}
```

### Agent Registration

Self-registration payload for agents. See `schemas/agent-registration.schema.json`.

Example:
```json
{
  "agent_id": "labs.redesign.gpu",
  "version": "0.7.0",
  "kind": "container",
  "image": "registry.example.com/labs/redesign-gpu:0.7.0",
  "phase": "0.7",
  "capabilities": ["redesign", "nemotron-inference"],
  "dependencies": ["labs.extractor", "inference.nemotron"]
}
```

### Routing Map

Agent communication channels and message flow. See `schemas/routing-map.yaml`.

## Policies

### Docker Policy (`policies/docker.rego`)

Validates:
- Allowed base images (python:3.11-slim, node:20-slim, nvidia/cuda:...)
- No SSH port (22) exposed
- No `:latest` tags
- No root user

### Agent Policy (`policies/agent.rego`)

Validates:
- Agent ID in allowed list
- Phase identifier = "0.7"
- Provenance git_sha and sbom_ref present
- Lineage packet structure

## CI/CD

### GitHub Actions Workflow

Automated build pipeline: `.github/workflows/phase-0-7-build.yml`

Runs on:
- Every push to main/develop
- Changes in `src/` or `build-system/`

Steps:
1. Parallel agent builds
2. Policy validation (conftest)
3. Lineage packet generation
4. Registry push
5. Prometheus metrics ingestion

## Observability

All agents emit metrics, logs, and lineage packets to:

- **Prometheus** — metrics (build duration, error rates, throughput)
- **Loki** — logs (structured JSON)
- **CIC Lineage Vault** — artifacts (lineage packets, SBOM references)

Access dashboards:
- Prometheus: http://prometheus:9090
- Grafana: http://grafana:3000
- Loki: http://loki:3100

## Troubleshooting

### Build Fails

1. Check Dockerfile validity:
   ```bash
   conftest test -p policies/ docker/cic/Dockerfile.ingestion
   ```

2. Verify base image availability:
   ```bash
   docker pull python:3.11-slim
   docker pull nvidia/cuda:12.4.1-runtime-ubuntu22.04
   ```

3. Check build logs:
   ```bash
   docker build -f docker/cic/Dockerfile.ingestion . --progress=plain
   ```

### Lineage Packet Invalid

1. Validate schema:
   ```bash
   python3 -m jsonschema -i lineage.json schemas/lineage-packet.schema.json
   ```

2. Check required fields:
   - `artifact_id`, `agent_id`, `version`, `build_id`, `provenance`

### Agent Registration Fails

1. Validate payload:
   ```bash
   python3 -m jsonschema -i agent-registration.json schemas/agent-registration.schema.json
   ```

2. Ensure required fields:
   - `agent_id`, `version`, `kind`, `image`, `phase`

## Integration with CIC

Phase 0.7 integrates with CIC infrastructure:

1. **Lineage Vault** — MemoryStore Tier 2 integration
2. **Observability** — Metrics flow to Prometheus, logs to Loki
3. **Governance** — Policy enforcement via OPA
4. **Phase 0.9 (TheFoundry)** — Refines Node.js build stages
5. **Phase 24 (Autonomous Governance)** — Governance packets

See `/docs/cic/phase-0-7-unified-build.md` for full integration spec.

## Next Steps

1. Generate concrete files for one end-to-end path (e.g., Labs Redesign GPU)
2. Wire into existing TheFoundry setup
3. Test multi-agent orchestration
4. Integrate with CIC observability stack
5. Promote to production builds

## References

- [Phase 0.7 Specification](/docs/cic/phase-0-7-unified-build.md)
- [Nemotron NIM Operator](https://github.com/NVIDIA/k8s-nim-operator)
- [OPA/Conftest Documentation](https://www.conftest.dev/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
