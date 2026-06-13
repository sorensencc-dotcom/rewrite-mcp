# Stage 1: Builder — built from monorepo root context
# Run: docker build -t rl-agents:latest -f packages/agents/Dockerfile .
FROM node:20-alpine AS builder

WORKDIR /build

# Copy workspace manifests (root + agents workspace)
COPY package.json package-lock.json ./
COPY packages/agents/package.json ./packages/agents/

# Install all workspace deps (includes typescript, ts-jest at root)
RUN npm ci --frozen-lockfile --workspace=packages/agents --include-workspace-root

# Copy agents source
COPY packages/agents/src ./packages/agents/src
COPY packages/agents/tsconfig.json packages/agents/jest.config.js ./packages/agents/

# Build agents
WORKDIR /build/packages/agents
RUN node ../../node_modules/.bin/tsc

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Chromium + font deps for Playwright browser engine
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

# Copy compiled artifacts
COPY --from=builder /build/packages/agents/dist ./dist
COPY --from=builder /build/packages/agents/package.json ./package.json

# Install production runtime deps only (node-html-parser)
RUN npm install --omit=dev --ignore-scripts

RUN mkdir -p /data

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node --input-type=module -e "import('./dist/crawler/index.js').then(() => process.exit(0)).catch(() => process.exit(1))"

EXPOSE 3200

CMD ["node", "--input-type=module", "-e", "import('./dist/index.js').then(() => console.log('RL Extractors ready'))"]
