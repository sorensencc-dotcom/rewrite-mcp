FROM node:20-slim

LABEL component="cic-orchestrator"

WORKDIR /app

COPY package*.json ./
RUN npm install --production 2>/dev/null || echo "npm install skipped"

EXPOSE 7001

ENV NODE_ENV=production
ENV CIC_ORCHESTRATOR_PORT=7001

CMD ["node", "-e", "require('http').createServer((r,s) => s.writeHead(200).end('cic-orchestrator ok')).listen(7001)"]
