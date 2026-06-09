# Phase 28 WIL (CIC ↔ Wayland Integration Layer)
# Multi-stage: base → builder → test → final

FROM node:20-slim AS base
WORKDIR /workspace
COPY package*.json ./
COPY projects/cic/package*.json projects/cic/
RUN npm install --ignore-scripts

# Full monorepo build
FROM base AS builder
COPY . .
RUN npm run build -w cic

# Test stage
FROM builder AS test
RUN npm run test -w cic 2>&1 | head -100

# Final runtime
FROM node:20-slim AS final
WORKDIR /app
COPY --from=builder /workspace/projects/cic/src ./src
COPY --from=builder /workspace/projects/cic/wil ./wil
ENTRYPOINT ["/bin/bash", "-c", "if [ -d src ] && [ -d wil ]; then echo 'Phase 28 WIL build complete' && ls -la wil/; else echo 'Build failed: src/ or wil/ not found' && exit 1; fi"]
