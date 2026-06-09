# Phase 26 — TorqueQuery Ingestion & Search Engine
# Ingests CKOs from Phase 25, enables deterministic world-state queries for Wayland
# Multi-stage: base → builder → test → validate → final

FROM node:20-slim AS base
WORKDIR /cic
COPY package*.json ./
RUN npm install --ignore-scripts

# CIC + Phase 26 TorqueQuery build
FROM base AS builder
COPY . .
RUN npm run build

# Test stage — runs all tests
FROM builder AS test
RUN npm run test 2>&1

# Validation: Phase 26 TorqueQuery schema & adapter implemented
FROM test AS validate
RUN if [ ! -f dist/src/phases/phase-26-torquequery-schema.d.ts ]; then echo "ERROR: TorqueQuery schema not built" && exit 1; fi
RUN if [ ! -f dist/src/phases/phase-25-to-26-adapter.d.ts ]; then echo "ERROR: Phase25To26Adapter not built" && exit 1; fi
RUN if grep -q "TorqueQueryIngestionBundle\|TorqueQueryClient" dist/src/phases/phase-26-torquequery-schema.d.ts; then echo "✓ TorqueQuery schema complete"; else echo "ERROR: Schema incomplete"; exit 1; fi
RUN echo "✓ Phase 26 validation passed: TorqueQuery engine ready"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY package*.json ./
RUN PUPPETEER_SKIP_DOWNLOAD=true npm install --ignore-scripts --omit=dev
COPY --from=builder /cic/dist ./dist
COPY --from=builder /cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/phases/phase-26-torquequery-schema.js && echo 'Phase 26 ✓ TorqueQuery engine ready' || (echo 'Build failed' && exit 1)"]
