FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS backend-builder
WORKDIR /build/backend
RUN apk add --no-cache openssl
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
COPY backend/ .

FROM node:20-alpine
ARG CACHEBUST=1
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-builder /build/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /build/backend/package.json /app/backend/
COPY --from=backend-builder /build/backend/server.js /app/backend/
COPY --from=backend-builder /build/backend/app.js /app/backend/
COPY --from=backend-builder /build/backend/src /app/backend/src
COPY --from=backend-builder /build/backend/prisma /app/backend/prisma
COPY --from=backend-builder /build/backend/start.sh /app/backend/

COPY --from=frontend-builder /build/frontend/package.json /app/frontend/
COPY --from=frontend-builder /build/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /build/frontend/next.config.js /app/frontend/
COPY --from=frontend-builder /build/frontend/public /app/frontend/public
COPY --from=frontend-builder /build/frontend/.next /app/frontend/.next

RUN chown -R appuser:appgroup /app
RUN chmod +x /app/backend/start.sh

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=10 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

WORKDIR /app/backend
CMD ["./start.sh"]
