# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

# Copy only what the server needs (shared + server), then install + build
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
COPY server/ server/
COPY shared/ shared/

WORKDIR /app/shared
RUN npm install && npm run build

WORKDIR /app/server
RUN npm install && npm run build

# --- Runtime image (no TS, no dev deps) ---
FROM node:20-alpine

ENV NODE_ENV=production
ENV ANYWHERE_PORT=8777
ENV DATA_DIR=/data

WORKDIR /app

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/shared/package.json ./shared/package.json

WORKDIR /app/server
RUN npm install --omit=dev --ignore-scripts

VOLUME ["/data"]
EXPOSE 8777

CMD ["node", "dist/index.js"]