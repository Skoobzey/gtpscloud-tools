FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/web ./packages/web
RUN pnpm --filter @gtps/shared build
RUN pnpm --filter @gtps/web build

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "packages/web/server.js"]
