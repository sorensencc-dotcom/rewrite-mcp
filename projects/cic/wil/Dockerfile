# CIC WIL (Wayland Integration Layer) build container
# Multi-stage: base → builder → test → final

FROM node:20-slim AS base
WORKDIR /app
COPY package.json ./
RUN npm install

# Build stage — TypeScript compilation
FROM base AS builder
COPY . .
RUN npm run build

# Test stage — runs after build, validates compiled code
FROM builder AS test
RUN npm run test

# Final runtime
FROM node:20-slim AS final
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
ENTRYPOINT ["/bin/bash", "-c", "if [ ! -d dist ]; then echo 'Build failed: dist/ not found' && exit 1; fi && echo 'CIC WIL build complete.'"]
