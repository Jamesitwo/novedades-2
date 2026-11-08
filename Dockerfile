FROM node:22-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
ARG CACHEBUST=11
COPY frontend/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /build/backend
RUN apk add --no-cache openssl
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci
RUN npx prisma generate --schema prisma/schema.prisma
COPY backend/ .

FROM node:22-alpine
ARG CACHEBUST=11
WORKDIR /app
# Chromium: el motor de subida a Dropi trabaja por el navegador
RUN apk add --no-cache openssl chromium nss freetype harfbuzz ttf-freefont font-noto-emoji
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=backend-builder /build/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /build/backend/package.json /app/backend/
COPY --from=backend-builder /build/backend/server.js /app/backend/
COPY --from=backend-builder /build/backend/app.js /app/backend/
COPY --from=backend-builder /build/backend/src /app/backend/src
COPY --from=backend-builder /build/backend/prisma /app/backend/prisma
COPY --from=backend-builder /build/backend/start.sh /app/backend/
COPY --from=backend-builder /build/backend/motor-dropi /app/backend/motor-dropi

COPY --from=frontend-builder /build/frontend/package.json /app/frontend/
COPY --from=frontend-builder /build/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /build/frontend/next.config.js /app/frontend/
COPY --from=frontend-builder /build/frontend/public /app/frontend/public
COPY --from=frontend-builder /build/frontend/.next /app/frontend/.next

RUN chown -R appuser:appgroup /app
RUN chmod +x /app/backend/start.sh

# Motor de subida a Dropi: navegador sin ventana y carpeta de datos (su
# estado tambien se guarda en la base: motor_archivos). Con un volumen en
# /data/motor-dropi la sesion de Dropi y los archivos sobreviven sin restaurar.
ENV MOTOR_DROPI_CHROME=/usr/bin/chromium-browser \
    MOTOR_DROPI_DROPI_HEADLESS=1 \
    MOTOR_DROPI_DATA_DIR=/data/motor-dropi
RUN mkdir -p /data/motor-dropi && chown -R appuser:appgroup /data

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=10 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

WORKDIR /app/backend
CMD ["./start.sh"]
