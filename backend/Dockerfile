FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY healthcheck.js ./

RUN mkdir -p /data && chown -R node:node /data
USER node

CMD ["node", "src/server.js"]
