FROM node:20-alpine

LABEL component="cic-audit"

WORKDIR /app

EXPOSE 7003

ENV NODE_ENV=production
ENV CIC_AUDIT_PORT=7003

CMD ["node", "-e", "require('http').createServer((r,s) => s.writeHead(200).end('cic-audit ok')).listen(7003)"]
