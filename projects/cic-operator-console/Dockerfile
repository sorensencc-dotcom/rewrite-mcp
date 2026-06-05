FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

RUN npm install -g serve

ENV VITE_CIC_API_URL=http://cic-service:8080

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
