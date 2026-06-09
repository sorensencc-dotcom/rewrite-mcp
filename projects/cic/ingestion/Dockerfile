# TheFoundry: CIC Ingestion
# Multi-stage build: base → build → runtime

FROM node:20-slim AS base
WORKDIR /app
LABEL component="cic-ingestion" version="1.0.0"

COPY package*.json ./
RUN npm ci

# Builder stage
FROM base AS builder
COPY tsconfig.json ./
COPY src ./src
RUN npm run build 2>/dev/null || npx tsc

# Runtime stage (production only)
FROM node:20-slim AS runtime
WORKDIR /app
LABEL component="cic-ingestion" variant="runtime"

COPY package*.json ./
RUN npm ci --omit=dev --production
COPY --from=builder /app/dist ./dist

EXPOSE 7002
ENV NODE_ENV=production
ENV CIC_INGESTION_PORT=7002

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7002/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })" || exit 1

CMD ["node", "dist/index.js"]
