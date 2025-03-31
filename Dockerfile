FROM node:22.14.0-alpine AS builder

RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.14.0-alpine

WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package*.json ./
COPY scripts/entrypoint.sh ./

RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

RUN chmod +x /app/entrypoint.sh && mkdir -p experiments && npm ci

ENTRYPOINT ["/app/entrypoint.sh"]