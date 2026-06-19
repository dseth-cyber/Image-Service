FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache samba-client \
    && addgroup --system --gid 1001 appuser \
    && adduser --system --uid 1001 --ingroup appuser appuser

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 9100

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9100/health || exit 1

CMD ["node", "dist/index.js"]
