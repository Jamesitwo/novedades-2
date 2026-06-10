# ============================================
# Railway Dockerfile — Backend API
# Railway asigna PORT automáticamente
# PostgreSQL se conecta via DATABASE_URL (plugin)
# ============================================

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
COPY . .

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/server.js ./
COPY --from=builder --chown=appuser:appgroup /app/app.js ./
COPY --from=builder --chown=appuser:appgroup /app/src ./src
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.prisma --accept-data-loss && node prisma/seed.js && node server.js"]
