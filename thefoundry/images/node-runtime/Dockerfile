# Minimal runtime container
# Assumes pre-built dist/ from TheFoundry build image

FROM node:20-slim AS runtime
WORKDIR /app

COPY package.json package-lock.json ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev --production --ignore-scripts

COPY dist ./dist

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })" || exit 1

CMD ["node", "dist/index.js"]
