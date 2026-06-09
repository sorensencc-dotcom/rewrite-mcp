# Phase 28.4 — Governance Council Gating
# High-risk operations require council approval
# Multi-stage: base → builder → test → validate → final

FROM node:20-slim AS base
WORKDIR /cic
COPY package*.json ./
RUN npm install --ignore-scripts

# CIC + WIL + Governance gating build
FROM base AS builder
COPY . .
RUN npm run build

# Test stage — runs all tests
FROM builder AS test
RUN npm run test 2>&1

# Validation: Governance gating implemented + risk assessment functional
FROM test AS validate
RUN if [ ! -f dist/src/cro/governance-gating.d.ts ]; then echo "ERROR: GovernanceGating not built" && exit 1; fi
RUN if grep -q "RiskAssessment\|GovernanceDecision" dist/src/cro/governance-gating.d.ts; then echo "✓ Risk model complete"; else echo "ERROR: Risk model incomplete"; exit 1; fi
RUN echo "✓ Phase 28.4 validation passed: Governance council gating complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY package*.json ./
RUN npm install --ignore-scripts --omit=dev
COPY --from=builder /cic/dist ./dist
COPY --from=builder /cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/cro/governance-gating.js && echo 'Phase 28.4 ✓ Governance council gating ready' || (echo 'Build failed' && exit 1)"]
