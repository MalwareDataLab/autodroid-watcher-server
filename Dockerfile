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

RUN mkdir -p experiments

RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

RUN npm ci

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]