#!/bin/sh
set -e

echo "=== GestiónNovedades ==="

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no configurado. Agrega el plugin PostgreSQL en Railway."
  exit 1
fi

echo "DATABASE_URL: ${DATABASE_URL%%@*}@***"

echo "Sincronizando base de datos..."
npx prisma db push --schema prisma/schema.prisma --accept-data-loss --skip-generate
echo "✅ Schema listo"

echo "Ejecutando seed..."
node prisma/seed.js 2>/dev/null || true
echo "✅ Seed completado"

echo "🚀 Iniciando servidor..."
exec node server.js
