# Phase 25 — Memory Consolidation Layer (MCL)
# Transforms raw memory shards into stable, queryable, cross-linked knowledge objects
# Multi-stage: base → builder → test → validate → final

FROM node:20-slim AS base
WORKDIR /cic
COPY package*.json ./
RUN npm install --ignore-scripts

# CIC + Phase 25 memory consolidation build
FROM base AS builder
COPY . .
RUN npm run build

# Test stage — runs all tests
FROM builder AS test
RUN npm run test 2>&1

# Validation: Phase 25 consolidation engine implemented
FROM test AS validate
RUN if [ ! -f dist/src/phases/phase-25-memory-consolidation.d.ts ]; then echo "ERROR: Phase25MemoryConsolidation not built" && exit 1; fi
RUN if [ ! -f dist/src/phases/phase-26-torquequery-schema.d.ts ]; then echo "ERROR: TorqueQuery schema not built" && exit 1; fi
RUN if [ ! -f dist/src/phases/phase-25-to-26-adapter.d.ts ]; then echo "ERROR: Phase25To26Adapter not built" && exit 1; fi
RUN echo "✓ Phase 25 validation passed: Memory consolidation layer complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY package*.json ./
RUN PUPPETEER_SKIP_DOWNLOAD=true npm install --ignore-scripts --omit=dev
COPY --from=builder /cic/dist ./dist
COPY --from=builder /cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/phases/phase-25-memory-consolidation.js && echo 'Phase 25 ✓ Memory consolidation ready' || (echo 'Build failed' && exit 1)"]
