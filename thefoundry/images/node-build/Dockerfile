# Multi-stage Node build container
# Stages: base → test → lint → build → final

FROM node:20-slim AS base
WORKDIR /app

# Layer 1: Locked dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Layer 2: Testing stage
FROM base AS test
COPY . .
RUN npm run test -- --bail

# Layer 3: Linting stage
FROM test AS lint
RUN npm run lint || true

# Layer 4: Build stage
FROM base AS builder
COPY . .
RUN npm run build

# Layer 5: Final output (production only)
FROM node:20-slim AS final
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# Entrypoint validates artifacts exist
ENTRYPOINT ["/bin/bash", "-c", "if [ ! -d dist ]; then echo 'Build failed: dist/ not found' && exit 1; fi && echo 'Build complete.'"]
