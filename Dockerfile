# ============================================
# Railway — Monorepo single-container
# API (Express) + Frontend (Next.js via proxy)
# ============================================

FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
COPY backend/ .

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-builder --chown=appuser:appgroup /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/package.json ./backend/
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/server.js ./backend/
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/app.js ./backend/
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/src ./backend/src
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/prisma ./backend/prisma
COPY --from=backend-builder --chown=appuser:appgroup /app/backend/start.sh ./backend/
RUN chmod +x ./backend/start.sh

COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/public ./frontend/public
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/package.json ./frontend/
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder --chown=appuser:appgroup /app/frontend/next.config.js ./frontend/

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

WORKDIR /app/backend
CMD ["./start.sh"]
