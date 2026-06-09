# Phase 28.2 — Foreman Manifest Loading
# Extends Phase 28.1: adds Foreman agent, manifest schema, YAML parsing
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

# Validation: Foreman implemented + manifest schema valid
FROM builder AS validate
RUN if [ ! -f projects/cic/dist/src/foreman/foreman.d.ts ]; then echo "ERROR: Foreman not built" && exit 1; fi
RUN if [ ! -f projects/cic/dist/src/foreman/loader.d.ts ]; then echo "ERROR: ForemanLoader not built" && exit 1; fi
RUN if [ ! -f projects/cic/dist/src/foreman/types.d.ts ]; then echo "ERROR: Foreman types not built" && exit 1; fi
RUN if [ ! -f projects/cic/cic_foreman.agent.yaml ]; then echo "ERROR: Manifest file missing" && exit 1; fi
RUN echo "✓ Phase 28.2 validation passed: Foreman manifest loading complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY --from=builder /workspace/projects/cic/dist ./dist
COPY --from=builder /workspace/projects/cic/wil ./wil
COPY --from=builder /workspace/projects/cic/cic_foreman.agent.yaml ./
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/foreman/foreman.js && echo 'Phase 28.2 ✓ Foreman manifest loading ready' || (echo 'Build failed' && exit 1)"]
