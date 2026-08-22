# collab-server/Dockerfile
# Multi-stage build for the Hocuspocus WebSocket server.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built output and production deps
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# No public port — exposed only to the internal Compose network.
# The reverse proxy routes /collab to this container.
EXPOSE 1234

CMD ["node", "dist/index.js"]
