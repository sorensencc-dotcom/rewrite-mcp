---
title: Phase 0.9 — TheFoundry Milestones & Execution Checklist
date: 2026-06-08
status: ACTIVE
---

# Phase 0.9 — TheFoundry Milestones

**Phase Owner:** [DevOps/Infra Lead]  
**Stakeholders:** CIC Architects, Phase 24 Lead, Phase 4.x Leads  
**Start Date:** 2026-06-08  
**Target Completion:** 2026-06-22  

---

## Milestone 1: Core Images & Local Validation (Week 1: Jun 8–14)

### 1.1 Build Container Implementation
- [ ] `/thefoundry/images/node-build/Dockerfile` created with:
  - [ ] base stage (node:20-slim + npm ci)
  - [ ] test stage (run npm test)
  - [ ] lint stage (run npm lint)
  - [ ] builder stage (run npm run build)
  - [ ] final stage (production runtime)
- [ ] entrypoint.sh script created for build orchestration
- [ ] Dockerfile validated locally (build succeeds, no errors)
- [ ] Multi-stage layer separation verified (each stage independent)

### 1.2 Runtime Container Implementation
- [ ] `/thefoundry/images/node-runtime/Dockerfile` created with:
  - [ ] base node:20-slim image
  - [ ] npm ci --omit=dev (production deps only)
  - [ ] COPY dist/ and package.json
  - [ ] HEALTHCHECK configured
  - [ ] CMD ["node", "dist/index.js"]
- [ ] Dockerfile validated locally (runs without errors)
- [ ] Health check tested manually
- [ ] Image size verified (< 500MB target)

### 1.3 Reproducibility Testing
- [ ] Build node-build container twice, compare SHA256 hashes
  - [ ] Hash 1: `docker build -t test1 ...` → capture digest
  - [ ] Hash 2: `docker build -t test2 ...` → capture digest
  - [ ] Hashes match? YES / NO (if NO, identify source of nondeterminism)
- [ ] Run npm ci, npm run build inside container 3 times, verify identical dist/ output
- [ ] Document any nondeterminism sources (timestamps, random seeds, etc.)

### 1.4 Local Dev Workflow
- [ ] `/thefoundry/projects/app-main` structure created with minimal Node app
- [ ] package.json with npm scripts: test, lint, build
- [ ] Build inside container: `docker run --rm -v %CD%/projects/app-main:/app thefoundry-build:latest`
  - [ ] Tests pass
  - [ ] Linting passes
  - [ ] Build succeeds, dist/ populated
- [ ] Run app inside runtime container: `docker run --rm -p 3000:3000 thefoundry-runtime:latest`
  - [ ] App starts
  - [ ] Health check returns 200
  - [ ] App accessible on localhost:3000

### 1.5 Directory Layout Validation
- [ ] `/thefoundry/images/` structure complete and documented
- [ ] `/thefoundry/projects/` structure set up for first app
- [ ] `/thefoundry/ci/` directory created (templates added in next milestone)
- [ ] `/thefoundry/docs/` structure ready (ABB-TheFoundry.md exists)

**Milestone 1 Completion Criteria:**  
✅ Both Dockerfiles build and run successfully  
✅ Local dev workflow works (build → test → run)  
✅ Builds are reproducible (byte-identical outputs)  
✅ All directory structures in place  

---

## Milestone 2: CI Integration & Phase 24 Adoption (Week 2: Jun 15–21)

### 2.1 GitHub Actions Template
- [ ] `/thefoundry/ci/github-actions.yml` created with:
  - [ ] Checkout step
  - [ ] Build & Test step (docker build --target builder)
  - [ ] Lint step (incorporated into build)
  - [ ] Build Runtime step (docker build runtime image)
  - [ ] Push to registry step (on main branch only)
- [ ] Workflow tested on actual PR
  - [ ] Build succeeds
  - [ ] Tests run inside container
  - [ ] Linting passes
  - [ ] Runtime image builds successfully

### 2.2 Azure Pipelines Template (Optional)
- [ ] `/thefoundry/ci/azure-pipelines.yml` created (reference template)
- [ ] Validated against Azure pipeline structure

### 2.3 Phase 24 Integration
- [ ] Phase 24 build scripts updated to use TheFoundry:
  - [ ] Replace direct npm commands with `docker run ...`
  - [ ] Update CI to reference TheFoundry images
  - [ ] Test Phase 24 build inside TheFoundry pipeline
- [ ] Phase 24 adopts TheFoundry as hard dependency
  - [ ] Update Phase 24 docs to reference TheFoundry
  - [ ] Add TheFoundry to Phase 24 prerequisites
  - [ ] Verify Phase 24 CI passes with TheFoundry

### 2.4 Phase 4.3 Coordination (Optional, if active)
- [ ] Contact Phase 4.3 lead
- [ ] Discuss TheFoundry integration points
- [ ] Plan Phase 4.3 migration to TheFoundry by end of Week 3

### 2.5 Developer Communication
- [ ] Announcement draft: "TheFoundry is live — all Node builds now containerized"
- [ ] Quick-start guide (5-min video or 1-page doc)
- [ ] FAQ: common Docker issues and solutions
- [ ] Share with Phase 24 team + stakeholders

**Milestone 2 Completion Criteria:**  
✅ GitHub Actions workflow runs successfully  
✅ Phase 24 CI passes using TheFoundry  
✅ Dev communication prepared  
✅ Phase 4.x coordination initiated  

---

## Milestone 3: Deployment & Scaling (Week 3: Jun 22–28)

### 3.1 CI Pipeline Rollout
- [ ] All CI workflows migrated to TheFoundry
  - [ ] GitHub Actions uses node-build:latest
  - [ ] Azure Pipelines (if used) references TheFoundry
  - [ ] GitLab CI (if used) references TheFoundry
- [ ] Build time stable (< 5 min target for full pipeline)
  - [ ] Measure build times in CI (record baseline)
  - [ ] Monitor for regressions (alert if > 20% slower)
- [ ] Docker daemon uptime monitored
  - [ ] Add health check to CI infrastructure
  - [ ] Alert on Docker daemon failures

### 3.2 Image Registry & Tagging
- [ ] Docker images tagged consistently: `thefoundry-build:branch-sha`, `thefoundry-runtime:vX.Y.Z`
- [ ] Images pushed to registry (if external registry is used):
  - [ ] On main branch: push `thefoundry-*:latest` and `thefoundry-*:vX.Y.Z`
  - [ ] On dev branches: build locally only
- [ ] Registry credentials secured (CI secrets configured)

### 3.3 First Developers Onboarded
- [ ] 3 developers try TheFoundry locally
  - [ ] Dev 1: successful build locally + runs tests
  - [ ] Dev 2: successful build locally + runs tests
  - [ ] Dev 3: successful build locally + runs tests
- [ ] Collect feedback:
  - [ ] Any friction points?
  - [ ] Any Docker daemon issues?
  - [ ] Any volume mount problems (Windows paths)?
  - [ ] Any performance concerns?
- [ ] Fix critical issues immediately
  - [ ] If Docker daemon crashes, file incident
  - [ ] If volume mounts fail, debug Windows/Docker Desktop issue
  - [ ] If build is > 10 min, optimize Dockerfile layers

### 3.4 Prod Build Readiness
- [ ] Prod builds use only Docker images (zero npm on Windows host)
- [ ] Release tagging: `thefoundry-runtime:v1.0.0` on main branch
- [ ] Rollback plan documented:
  - [ ] If issue found post-deployment, revert CI workflows to direct npm commands
  - [ ] Rollback time: < 1 hour (old workflows in git history)

**Milestone 3 Completion Criteria:**  
✅ All CI workflows use TheFoundry  
✅ Build time stable (< 5 min)  
✅ 3 developers onboarded successfully  
✅ Prod builds use Docker images only  

---

## Milestone 4: Documentation & Knowledge Transfer (Week 4: Jun 29–Jul 5)

### 4.1 Developer Onboarding Docs
- [ ] `BUILD_CONVENTIONS.md` created:
  - [ ] When to use `docker build` vs `docker run`
  - [ ] How to mount source code
  - [ ] How to run tests inside container
  - [ ] How to debug build failures
  - [ ] Common Docker Desktop issues
- [ ] `TROUBLESHOOTING.md` created:
  - [ ] "Docker daemon won't start" → solution
  - [ ] "Volume mount fails (Windows)" → solution
  - [ ] "npm install fails inside container" → solution
  - [ ] "Build succeeds locally but fails in CI" → debugging steps
- [ ] `DOCKERFILE_PATTERNS.md` created:
  - [ ] Multi-stage pattern explained
  - [ ] Layer caching best practices
  - [ ] How to add new Node apps to TheFoundry
  - [ ] How to extend for other languages (reference only)

### 4.2 Team Training
- [ ] 30-min video walkthrough of TheFoundry workflow
  - [ ] Recording: from git clone to successful build
  - [ ] Uploaded to team wiki / documentation site
- [ ] Live 1-hour Q&A session with team
  - [ ] Walkthrough phase 0.9 spec
  - [ ] Answer questions about Docker setup
  - [ ] Discuss Phase 24 integration

### 4.3 Governance & Ownership
- [ ] TheFoundry owner assigned: [name + contact]
- [ ] Stakeholder list finalized:
  - [ ] CIC Architects
  - [ ] Phase 24 Lead
  - [ ] Phase 4.x Leads
  - [ ] DevOps/Infra team
- [ ] Weekly health check cadence established:
  - [ ] Monday 10am: "Any build issues this week?"
  - [ ] Monitor: build time, Docker uptime, image sizes
  - [ ] Monthly optimization pass: layers, caching, performance

### 4.4 Ref Docs & Examples
- [ ] Example app in `/thefoundry/projects/app-main/` is stable
  - [ ] Has package.json with test/lint/build scripts
  - [ ] Builds successfully in CI
  - [ ] Docs reference this app for examples
- [ ] Spec file at `/docs/cic/phase-0-9-thefoundry.md` is finalized
  - [ ] All 15 sections complete
  - [ ] Changelog updated
  - [ ] Locked status confirmed

### 4.5 Dependency Graph Update
- [ ] Update `/docs/cic/CIC_MASTER_ROADMAP.md`:
  - [ ] Phase 0.9 status: "✅ COMPLETED" (once milestones done)
  - [ ] Link Phase 24, Phase 4.x to Phase 0.9 as dependency
- [ ] Update memory:
  - [ ] Mark Phase 0.9 as LOCKED + DEPLOYED
  - [ ] Update timeline dates to actual completion
  - [ ] Link all dependent phases

**Milestone 4 Completion Criteria:**  
✅ All documentation written and reviewed  
✅ Team training completed  
✅ Governance structure established  
✅ Phase 0.9 marked COMPLETED in roadmap  

---

## Success Metrics & KPIs

| Metric | Target | Baseline | Actual |
|--------|--------|----------|--------|
| Build time (full pipeline) | < 5 min | N/A | TBD |
| Docker image size (runtime) | < 500 MB | N/A | TBD |
| Build reproducibility | 100% (byte-identical) | N/A | TBD |
| Developer onboarding time | < 30 min | 2 hours | TBD |
| CI pipeline success rate | > 99% | N/A | TBD |
| Docker daemon uptime | > 99.9% | N/A | TBD |

---

## Risk Register & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Docker Desktop crashes | Medium | High | Test stability for 24 hours; monitor in CI |
| Windows volume mounts fail | Medium | High | Test on Windows 11 Pro; use wsl2 backend |
| Build time > 10 min | Low | Medium | Optimize Dockerfile layers; profile npm install |
| npm ci nondeterminism | Low | High | Lock package-lock.json; verify reproducibility |
| Phase 24 integration delays | Low | Medium | Start integration in Week 1, not Week 2 |

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Phase Owner | [TBD] | — | ⬜ Pending |
| CIC Architect | [TBD] | — | ⬜ Pending |
| DevOps/Infra Lead | [TBD] | — | ⬜ Pending |
| Phase 24 Lead | [TBD] | — | ⬜ Pending |

---

## Notes & Escalations

- **Week 1 blocker:** If Dockerfile multi-stage fails, investigate Docker build cache issues immediately.
- **Week 2 blocker:** If Phase 24 integration is complex, extend to Week 3 but don't defer.
- **Week 3 blocker:** If Docker daemon instability, file incident and pause onboarding until root cause identified.
- **Week 4:** Documentation must be complete by 2026-07-05 for next sprint.

---

**Phase 0.9 is LOCKED. Proceed with Milestone 1 immediately.**
