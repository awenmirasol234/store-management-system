FROM node:24-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

COPY --chown=node:node src ./src
COPY --chown=node:node create-admin.js ./
COPY --chown=node:node admin-input.js ./
COPY --chown=node:node healthcheck.js ./

RUN mkdir -p /data && chown node:node /data
USER node

CMD ["node", "src/server.js"]
