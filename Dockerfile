FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
COPY backend/ .

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-builder --chown=appuser:appgroup /build/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=appuser:appgroup /build/backend/package.json ./backend/
COPY --from=backend-builder --chown=appuser:appgroup /build/backend/server.js ./backend/
COPY --from=backend-builder --chown=appuser:appgroup /build/backend/app.js ./backend/
COPY --from=backend-builder --chown=appuser:appgroup /build/backend/src ./backend/src
COPY --from=backend-builder --chown=appuser:appgroup /build/backend/prisma ./backend/prisma
COPY --from=backend-builder --chown=appuser:appgroup /build/backend/start.sh ./backend/
RUN chmod +x ./backend/start.sh

COPY --from=frontend-builder --chown=appuser:appgroup /build/frontend/.next ./frontend/.next
COPY --from=frontend-builder --chown=appuser:appgroup /build/frontend/public ./frontend/public
COPY --from=frontend-builder --chown=appuser:appgroup /build/frontend/package.json ./frontend/
COPY --from=frontend-builder --chown=appuser:appgroup /build/frontend/node_modules ./frontend/node_modules
COPY --from=frontend-builder --chown=appuser:appgroup /build/frontend/next.config.js ./frontend/

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=10 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

WORKDIR /app/backend
CMD ["./start.sh"]
