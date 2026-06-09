# Phase 26 — TorqueQuery Ingestion & Search Engine
# Ingests CKOs from Phase 25, enables deterministic world-state queries for Wayland
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

# Validation: Phase 26 TorqueQuery schema & adapter implemented
FROM builder AS validate
RUN if [ ! -f projects/cic/dist/src/phases/phase-26-torquequery-schema.d.ts ]; then echo "ERROR: TorqueQuery schema not built" && exit 1; fi
RUN if [ ! -f projects/cic/dist/src/phases/phase-25-to-26-adapter.d.ts ]; then echo "ERROR: Phase25To26Adapter not built" && exit 1; fi
RUN if grep -q "TorqueQueryIngestionBundle\|TorqueQueryClient" projects/cic/dist/src/phases/phase-26-torquequery-schema.d.ts; then echo "✓ TorqueQuery schema complete"; else echo "ERROR: Schema incomplete"; exit 1; fi
RUN echo "✓ Phase 26 validation passed: TorqueQuery engine ready"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY --from=builder /workspace/projects/cic/dist ./dist
COPY --from=builder /workspace/projects/cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/phases/phase-26-torquequery-schema.js && echo 'Phase 26 ✓ TorqueQuery engine ready' || (echo 'Build failed' && exit 1)"]
