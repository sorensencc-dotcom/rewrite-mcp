# Phase 28 WIL (CIC ↔ Wayland Integration Layer) build container
# Multi-stage: base → test → build → final

FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts

# Test stage
FROM base AS test
COPY . .
RUN npm run test 2>&1 | head -100

# Build stage
FROM base AS builder
COPY . .
RUN npm run build

# Final runtime
FROM node:20-slim AS final
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts --omit=dev
COPY --from=builder /app/src ./src
ENTRYPOINT ["/bin/bash", "-c", "if [ ! -d src ]; then echo 'Build failed: src/ not found' && exit 1; fi && echo 'Phase 28 WIL build complete: $(ls -la src/runtime/foreman.js)'"]
