#!/bin/sh
set -e

echo "=== GestionNovedades ==="

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL no configurado. Agrega el plugin PostgreSQL en Railway."
  exit 1
fi

echo "DATABASE_URL: ${DATABASE_URL%%@*}@***"

echo "Sincronizando base de datos..."
npx prisma db push --schema prisma/schema.prisma
echo "✅ Schema listo"

echo "Generando cliente Prisma..."
npx prisma generate --schema prisma/schema.prisma
echo "✅ Cliente generado"

echo "Ejecutando seed..."
if node prisma/seed.js 2>/dev/null; then
  echo "✅ Seed completado"
else
  echo "⚠️  Seed fallo, continuando arranque..."
fi

echo "Ejecutando migraciones de datos..."
if node prisma/migrate.js 2>/dev/null; then
  echo "✅ Migraciones completadas"
else
  echo "⚠️  Migraciones de datos fallaron, continuando arranque..."
fi

echo "🚀 Iniciando servidor..."
exec node server.js
