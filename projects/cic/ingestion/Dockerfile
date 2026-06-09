FROM node:20-alpine

LABEL component="cic-ingestion"

WORKDIR /app

EXPOSE 7002

ENV NODE_ENV=production
ENV CIC_INGESTION_PORT=7002

CMD ["node", "-e", "require('http').createServer((r,s) => s.writeHead(200).end('cic-ingestion ok')).listen(7002)"]
