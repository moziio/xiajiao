FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 18800

VOLUME ["/app/data", "/app/public/uploads"]

CMD ["node", "server/index.js"]
