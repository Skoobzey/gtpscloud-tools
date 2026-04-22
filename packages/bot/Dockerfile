FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/bot/package.json ./packages/bot/
RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/bot ./packages/bot
RUN pnpm --filter @gtps/shared build
RUN pnpm --filter @gtps/bot build

FROM node:22-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/bot/dist ./packages/bot/dist
COPY --from=builder /app/packages/bot/package.json ./packages/bot/package.json
COPY pnpm-workspace.yaml package.json ./

CMD ["node", "packages/bot/dist/index.js"]
