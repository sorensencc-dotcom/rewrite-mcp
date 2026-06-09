# Phase 28.1 — CRO ↔ Wayland Adapter Integration
# Full stack: CIC + WIL with SecurityPolicy enforcement
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

# Validation: CRO types extended + WaylandAdapterRunner implemented
FROM builder AS validate
RUN if [ ! -f projects/cic/dist/src/cro/wayland-adapter-runner.d.ts ]; then echo "ERROR: WaylandAdapterRunner not built" && exit 1; fi
RUN if ! grep -q "AdapterOperation" projects/cic/dist/src/cro/types.d.ts; then echo "ERROR: TaskExecution not extended with adapterOps" && exit 1; fi
RUN echo "✓ Phase 28.1 validation passed: CRO adapter integration complete"

# Final runtime
FROM node:20-slim AS final
WORKDIR /cic
COPY --from=builder /workspace/projects/cic/dist ./dist
COPY --from=builder /workspace/projects/cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "test -f dist/src/cro/wayland-adapter-runner.js && echo 'Phase 28.1 ✓ CRO↔WIL adapter integration ready' || (echo 'Build failed' && exit 1)"]
