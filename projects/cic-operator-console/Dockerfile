FROM node:20-alpine

LABEL component="cic-operator-console"

WORKDIR /app

RUN npm install -g serve

COPY . .

EXPOSE 5173

ENV VITE_CIC_API_URL=http://cic-service:8080

CMD ["serve", "-s", "public", "-l", "5173"]
