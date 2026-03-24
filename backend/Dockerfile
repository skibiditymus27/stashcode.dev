# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./
RUN npm install --production

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY . .

RUN npm install --only=dev

FROM node:20-alpine AS final
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/src ./src

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

EXPOSE 3000
CMD ["node", "src/server.js"]
