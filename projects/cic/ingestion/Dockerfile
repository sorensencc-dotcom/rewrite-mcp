FROM node:20-slim

LABEL component="cic-ingestion"

WORKDIR /app

COPY package*.json ./
RUN npm install --production 2>/dev/null || echo "npm install skipped"

EXPOSE 7002

ENV NODE_ENV=production
ENV CIC_INGESTION_PORT=7002

CMD ["node", "-e", "require('http').createServer((r,s) => s.writeHead(200).end('cic-ingestion ok')).listen(7002)"]
