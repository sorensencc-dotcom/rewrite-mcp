# Rewrite Labs + CIC Infrastructure

Unified, deterministic multi-agent build orchestration and Node.js sealed build environment.

## Quick Links

- **[Phase 0.7 — Unified Build](docs/cic/phase-0-7-unified-build.md):** Multi-agent orchestration (CIC + Labs + Nemotron/NIM)
- **[Phase 0.9 — TheFoundry](thefoundry/README.md):** Deterministic Node.js build environment
- **[Phase 0.7 Build System](build-system/README.md):** Dockerfiles, schemas, policies, routing

## Architecture

```
[Code] 
  → Phase 0.7 (7-agent DAG)
    → Phase 0.9 (Node sealed builds)
      → Phase 24 (Governance + lineage)
        → Production Registry
```

## Getting Started

**Build all Phase 0.7 agents:**
```bash
bash build-system/examples/build-all-agents.sh
```

**Build with TheFoundry (Phase 0.9):**
```bash
docker build -f thefoundry/images/node-build/Dockerfile -t thefoundry:build .
docker run --rm -v $(pwd):/app thefoundry:build
```

## Status

- ✅ Phase 0.7: Unified CIC + Rewrite Labs build system (8 Dockerfiles, schemas, policies)
- ✅ Phase 0.9: TheFoundry deterministic Node.js environment
- ✅ Master roadmap updated
- ✅ Ready for Phase 24 governance integration

See `/docs/cic/CIC_MASTER_ROADMAP.md` for full roadmap.
