FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ server/
COPY public/ public/
COPY data/_soul-templates/ data/_soul-templates/
COPY data/channel-presets/ data/channel-presets/
COPY community-topics.json ./
COPY models.example.json ./
COPY agents.example.json ./
COPY im-settings.example.json ./
COPY scheduler.js ./

RUN mkdir -p data public/uploads data/custom-tools

ENV NODE_ENV=production
ENV IM_PORT=18800

EXPOSE 18800

VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
