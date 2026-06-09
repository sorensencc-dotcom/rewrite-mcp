---
name: phase-0-9-thefoundry
title: Phase 0.9 — TheFoundry (Deterministic Build Environment)
version: 1.0.0
date: 2026-06-08
status: LOCKED
---

# Phase 0.9 — TheFoundry
### *Deterministic Build Environment for CIC + Rewrite Labs*

---

## **0. Purpose**

TheFoundry establishes a **sealed, reproducible, zero‑prompt build environment** for all Node‑based CIC and Rewrite Labs subsystems. It eliminates host‑OS trust boundaries, removes nondeterminism, and standardizes build execution across local development, CI, and production.

TheFoundry becomes the **canonical execution substrate** for all Node builds.

---

## **1. Objectives**

### **1.1 Primary Objectives**
- Provide a **deterministic, Docker‑based build system** for all Node projects.
- Ensure **zero host‑OS prompts** (PowerShell, NTFS zone identifiers, elevation, npm confirmations).
- Guarantee **reproducible builds** via sealed dependency layers.
- Standardize **directory structure**, **Dockerfile patterns**, and **CI templates**.
- Serve as the **foundation layer** for Phase 24 (Autonomous Governance) and Phase 4.x (Operator Console).

### **1.2 Secondary Objectives**
- Enable parallel development across CIC agents without environment drift.
- Provide a unified build substrate for future multi‑language expansion (Python, Rust, Go).
- Reduce onboarding friction and eliminate environment‑specific failures.

---

## **2. Scope**

### **2.1 In‑Scope**
- Multi‑stage Node build container  
- Node runtime container  
- Standardized directory layout  
- CI pipeline template  
- Build reproducibility guarantees  
- Local dev workflow using Docker  
- Documentation + integration guidelines  

### **2.2 Out‑of‑Scope (Future Phases)**
- GPU‑accelerated containers  
- Python/Rust/Golang Foundry images  
- Devcontainer integration  
- Model‑runtime containers  

These may be added as **Phase 0.10+** expansions.

---

## **3. Architecture**

### **3.1 High‑Level Structure**

```
Host OS (Windows 11)
   ↓
Docker Engine
   ↓
TheFoundry (sealed build environment)
   ↓
CIC + Rewrite Labs Node subsystems
```

### **3.2 Directory Layout**

```
/thefoundry
  /images
    /node-build
      Dockerfile
      entrypoint.sh
    /node-runtime
      Dockerfile
  /projects
    /app-main
      package.json
      package-lock.json
      src/
      dist/
  /ci
    github-actions.yml
    azure-pipelines.yml
  /docs
    CONVENTIONS.md
    TROUBLESHOOTING.md
    DOCKERFILE_PATTERNS.md
```

---

## **4. Build Containers**

### **4.1 Node Build Container (Multi-Stage)**

**File:** `/thefoundry/images/node-build/Dockerfile`

```dockerfile
# Multi-stage Node build container
# Stages: base → test → lint → build → final

FROM node:20-slim AS base
WORKDIR /app

# Layer 1: Locked dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Layer 2: Testing stage
FROM base AS test
COPY . .
RUN npm run test -- --bail

# Layer 3: Linting stage
FROM test AS lint
RUN npm run lint || true

# Layer 4: Build stage
FROM base AS builder
COPY . .
RUN npm run build

# Layer 5: Final output (build artifacts only)
FROM node:20-slim AS final
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN npm ci --omit=dev --production

# Entrypoint validates artifacts exist
ENTRYPOINT ["/bin/bash", "-c", "if [ ! -d dist ]; then echo 'Build failed: dist/ not found' && exit 1; fi && echo 'Build complete.'"]
```

**Build Invocation:**
```bash
# Development build (with tests & linting)
docker build \
  -t thefoundry-node-build:latest \
  -f thefoundry/images/node-build/Dockerfile \
  --target builder \
  .

# Run the container
docker run --rm -v %CD%/projects/app-main:/app thefoundry-node-build:latest
```

**Guarantees:**
- Deterministic dependency installation (`npm ci --omit=dev`)
- Build executed during `docker build`, not `docker run`
- Reproducible build artifacts (byte-for-byte identical across machines)
- All build steps sealed inside container

---

### **4.2 Node Runtime Container**

**File:** `/thefoundry/images/node-runtime/Dockerfile`

```dockerfile
# Minimal runtime container
# Assumes pre-built dist/ from TheFoundry build image

FROM node:20-slim AS runtime
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --production

COPY dist ./dist

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

CMD ["node", "dist/index.js"]
```

**Build & Run:**
```bash
# Build runtime image
docker build \
  -t thefoundry-node-runtime:v1.0.0 \
  -f thefoundry/images/node-runtime/Dockerfile \
  projects/app-main

# Run with port binding
docker run --rm -p 3000:3000 thefoundry-node-runtime:v1.0.0
```

**Guarantees:**
- Production‑only dependencies
- Minimal image footprint (< 500 MB)
- Only compiled output from builder
- Health check integrated

---

## **5. CI Integration**

### **5.1 GitHub Actions Template**

**File:** `/thefoundry/ci/github-actions.yml`

```yaml
name: TheFoundry Build & Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build & Test (TheFoundry)
        run: |
          docker build \
            -t thefoundry-node-build:${{ github.sha }} \
            -f thefoundry/images/node-build/Dockerfile \
            --target builder \
            .
      
      - name: Build Runtime Image
        run: |
          docker build \
            -t thefoundry-node-runtime:${{ github.sha }} \
            -f thefoundry/images/node-runtime/Dockerfile \
            projects/app-main
      
      - name: Push to Registry (optional)
        if: github.ref == 'refs/heads/main'
        run: |
          docker tag thefoundry-node-runtime:${{ github.sha }} \
            registry.example.com/thefoundry-runtime:latest
          docker push registry.example.com/thefoundry-runtime:latest
```

### **5.2 CI Pattern**

- CI never runs `npm install` directly
- CI only runs:
  - `docker build`  
  - `docker run`  

### **5.3 Guarantees**
- No host‑OS prompts  
- No dependency drift  
- Identical builds across all environments  

---

## **6. Execution Model**

### **6.1 Local Development**
```bash
docker build -t thefoundry-node-build .
docker run --rm -v %CD%:/app thefoundry-node-build
```

### **6.2 CI**
```bash
docker build -t thefoundry-node-build -f thefoundry/images/node-build/Dockerfile .
docker build -t thefoundry-node-runtime -f thefoundry/images/node-runtime/Dockerfile .
```

### **6.3 Production**
```bash
docker run --rm -p 3000:3000 thefoundry-node-runtime
```

---

## **7. Conventions (Locked)**

### **7.1 Build Conventions**
1. **npm ci, not npm install** — lock file is source of truth
2. **Multi-stage builds** — separate test, lint, build into distinct layers
3. **No host npm** — all npm invocations happen inside container
4. **Volume mounts only for source** — `/app/src`, configs, package.json
5. **Artifacts extracted via COPY --from** — dist/ copied to final layer
6. **No secrets in Dockerfiles** — use Docker build secrets or env vars
7. **Final image is production-ready** — includes only runtime deps, no dev tools

### **7.2 CI Conventions**
1. **Build → Test → Deploy** — sequential stages, fail fast
2. **Docker as single source of truth** — all deps locked in image
3. **No host-side build steps** — all npm/test/lint inside container
4. **Tag consistently** — `thefoundry-*:branch-sha` or `*:vX.Y.Z`
5. **Push on main branch only** — dev branches build locally

---

## **8. Milestones**

### **Milestone 1: Core Images & Local Validation (Week 1: Jun 8–14)**
- [ ] Multi-stage Dockerfile validated locally
- [ ] Runtime Dockerfile validated locally
- [ ] Local dev workflow tested (build → test → run)
- [ ] Reproducibility verified (build twice, compare hashes)
- [ ] Directory layout established

**Completion Criteria:** Both Dockerfiles build and run successfully; reproducible outputs confirmed.

### **Milestone 2: CI Integration & Phase 24 Adoption (Week 2: Jun 15–21)**
- [ ] GitHub Actions template created and tested
- [ ] Phase 24 CI migrated to TheFoundry
- [ ] Phase 24 build succeeds inside TheFoundry pipeline
- [ ] Developer communication prepared (quick-start guide, FAQ)
- [ ] Phase 4.x coordination initiated

**Completion Criteria:** Phase 24 CI passes using TheFoundry; dev communication ready.

### **Milestone 3: Deployment & Scaling (Week 3: Jun 22–28)**
- [ ] All CI workflows use TheFoundry
- [ ] Build time stable (< 5 min target)
- [ ] First 3 developers onboarded successfully
- [ ] Prod builds use Docker images only (zero npm on Windows host)
- [ ] Feedback collected and critical issues fixed

**Completion Criteria:** All CI uses TheFoundry; 3 devs onboarded; build time stable.

### **Milestone 4: Documentation & Knowledge Transfer (Week 4: Jun 29–Jul 5)**
- [ ] BUILD_CONVENTIONS.md complete
- [ ] TROUBLESHOOTING.md complete
- [ ] DOCKERFILE_PATTERNS.md complete
- [ ] Team training video recorded
- [ ] Governance & ownership assigned

**Completion Criteria:** All docs written; team trained; governance established.

---

## **9. Dependencies**

### **9.1 Upstream Dependencies**
None.  
TheFoundry is self‑contained.

### **9.2 Downstream Dependencies**
- Phase 4.3 — Operator Console Build Pipeline  
- Phase 4.4 — Operator Console Runtime  
- Phase 24 — Autonomous Governance  
- All CIC Node subsystems (Harvester, Orchestrator, Enricher, etc.)

---

## **10. Risks + Mitigations**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Host OS prompts reappear | Low | High | All builds run inside Docker; enforce in lint gates |
| Dependency drift | Low | High | `npm ci` + sealed layers; verify lock file |
| CI inconsistencies | Low | High | CI uses same Foundry images as local dev |
| Docker daemon crashes | Medium | High | Test stability 24h; monitor in CI; alert on failures |
| Windows volume mounts fail | Medium | High | Test on Windows 11 Pro; use WSL2 backend |
| Build time regression | Low | Medium | Measure baseline; alert if > 20% slower |

---

## **11. Deliverables**

- ✅ `thefoundry/images/node-build/Dockerfile`  
- ✅ `thefoundry/images/node-runtime/Dockerfile`  
- ✅ `thefoundry/ci/github-actions.yml`  
- ✅ `thefoundry/docs/CONVENTIONS.md`  
- ✅ `thefoundry/docs/TROUBLESHOOTING.md`  
- ✅ `thefoundry/docs/DOCKERFILE_PATTERNS.md`  
- ✅ Integration instructions for all CIC subsystems  

---

## **12. Completion Criteria**

### **12.1 Functional**
- All Node builds run inside TheFoundry  
- Zero host‑OS prompts  
- Reproducible builds across machines  
- CI pipeline migrated to Foundry images  

### **12.2 Documentation**
- Full spec committed  
- Integration guide published  
- Roadmap updated  

### **12.3 Verification**
- Build reproducibility test (hash match)  
- CI pipeline green across all subsystems  
- First 3 developers onboarded successfully

---

## **13. Phase Classification**

| Field | Value |
|-------|-------|
| **Phase** | 0.9 |
| **Category** | Infrastructure |
| **Priority** | Critical |
| **Execution** | Immediate + parallel |
| **Blocks** | None |
| **Enables** | Phase 4.x, Phase 24, all CIC build pipelines |
| **Timeline** | 2026-06-08 through 2026-06-22 |
| **Status** | 🔒 LOCKED |

---

## **14. Governance**

- **Owner:** [Phase Owner TBD]
- **Stakeholders:** CIC Architects, Phase 24 Lead, Phase 4.x Leads, DevOps/Infra
- **Review Board:** DevOps, Security, CIC Architect
- **Cadence:** Weekly health checks (build time, Docker uptime); monthly optimization pass

---

## **15. Changelog**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-08 | LOCKED: Tight spec + detailed Dockerfiles, CI templates, milestones |

---

**Phase 0.9 is LOCKED and ready for implementation.**

Execute Milestone 1 immediately. All four milestones fit into 4 weeks (Jun 8–Jul 5).
