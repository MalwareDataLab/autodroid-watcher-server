FROM node:22.14.0-alpine AS builder

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    freetype-dev \
    fontconfig-dev

WORKDIR /build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.14.0-alpine

RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    pixman \
    freetype \
    fontconfig

WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package*.json ./

RUN mkdir -p experiments

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]