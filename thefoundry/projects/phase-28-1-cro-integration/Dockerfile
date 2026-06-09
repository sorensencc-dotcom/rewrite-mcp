# Phase 28.1 — CRO ↔ Wayland Adapter Integration
# Full stack: CIC + WIL with SecurityPolicy enforcement
# Multi-stage: base → test → final

FROM node:20-slim AS base
WORKDIR /cic
COPY package*.json ./
RUN npm install --ignore-scripts

# CIC + WIL build
FROM base AS builder
COPY . .
RUN npm run build

# Test stage — runs all tests
FROM builder AS test
RUN npm run test 2>&1

# Validation: CRO types extended + WaylandAdapterRunner implemented
FROM test AS validate
RUN if [ ! -f dist/src/cro/wayland-adapter-runner.d.ts ]; then echo "ERROR: WaylandAdapterRunner not built" && exit 1; fi
RUN if ! grep -q "AdapterOperation" dist/src/cro/types.d.ts; then echo "ERROR: TaskExecution not extended with adapterOps" && exit 1; fi
RUN echo "✓ Phase 28.1 validation passed: CRO adapter integration complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY package*.json ./
RUN npm install --ignore-scripts --omit=dev
COPY --from=builder /cic/dist ./dist
COPY --from=builder /cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/cro/wayland-adapter-runner.js && echo 'Phase 28.1 ✓ CRO↔WIL adapter integration ready' || (echo 'Build failed' && exit 1)"]
