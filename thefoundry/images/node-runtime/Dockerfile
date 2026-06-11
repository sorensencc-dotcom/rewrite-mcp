# TheFoundry Node Runtime Container (Phase 0.9)
# Minimal, sealed runtime for Node.js applications
# Assumes pre-built dist/ and package files from TheFoundry build image

FROM node:20-alpine
LABEL maintainer="CIC Team"
LABEL phase="0.9"
LABEL foundry="theFoundry"

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=2048

RUN apk add --no-cache ca-certificates curl tini

WORKDIR /app

# Copy production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --frozen-lockfile --ignore-scripts

# Copy prebuilt artifacts from build stage
COPY dist ./dist
COPY sbom.json provenance.json ./

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
