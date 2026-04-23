FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/bot ./packages/bot
RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter @gtps/shared build
RUN pnpm --filter @gtps/bot build
RUN pnpm --filter @gtps/bot deploy --prod --legacy /app/deploy

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/deploy ./
COPY --from=builder /app/packages/shared/dist ./node_modules/@gtps/shared/dist

CMD ["node", "dist/index.js"]
