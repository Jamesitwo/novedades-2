#!/bin/sh
set -e

echo "=== GestiónNovedades ==="
echo "Waiting for DATABASE_URL..."

# Esperar a que DATABASE_URL esté disponible (Railway plugin)
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no configurado. Agrega el plugin PostgreSQL en Railway."
  exit 1
fi

echo "✅ DATABASE_URL encontrado"

# Aplicar schema
echo "Sincronizando base de datos..."
npx prisma db push --schema prisma/schema.prisma --accept-data-loss
echo "✅ Schema sincronizado"

# Seed
echo "Ejecutando seed..."
node prisma/seed.js || echo "⚠ Seed falló (posiblemente ya ejecutado)"
echo "✅ Seed completado"

# Iniciar
echo "🚀 Iniciando servidor..."
exec node server.js
