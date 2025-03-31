FROM node:22.14.0-alpine AS builder

RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev \
    libtool \
    autoconf \
    automake

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

RUN apk add --update --no-cache \
    make \
    g++ \
    jpeg-dev \
    cairo-dev \
    giflib-dev \
    pango-dev \
    libtool \
    autoconf \
    automake

RUN chmod +x /app/entrypoint.sh && mkdir -p experiments && chmod -R 777 experiments && npm ci
ENTRYPOINT ["/app/entrypoint.sh"]