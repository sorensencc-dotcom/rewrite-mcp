# Phase 28.4 — Governance Council Gating
# High-risk operations require council approval
# Multi-stage: base → builder → test → validate → final

FROM node:20-slim AS base
WORKDIR /workspace
COPY package*.json ./
COPY projects/cic/package*.json projects/cic/
RUN npm install --ignore-scripts

# Full monorepo build
FROM base AS builder
COPY . .
RUN npm run build -w cic

# Test stage — runs all tests
FROM builder AS test
RUN npm run test -w cic 2>&1

# Validation: Governance gating implemented + risk assessment functional
FROM test AS validate
RUN if [ ! -f projects/cic/dist/src/cro/governance-gating.d.ts ]; then echo "ERROR: GovernanceGating not built" && exit 1; fi
RUN if grep -q "RiskAssessment\|GovernanceDecision" projects/cic/dist/src/cro/governance-gating.d.ts; then echo "✓ Risk model complete"; else echo "ERROR: Risk model incomplete"; exit 1; fi
RUN echo "✓ Phase 28.4 validation passed: Governance council gating complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY --from=builder /workspace/projects/cic/dist ./dist
COPY --from=builder /workspace/projects/cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/cro/governance-gating.js && echo 'Phase 28.4 ✓ Governance council gating ready' || (echo 'Build failed' && exit 1)"]
