-- Cambios de esquema de la rama zunto-directo (SOLO aditivos).
-- En el deploy los aplica `prisma db push` (start.sh); este archivo es la
-- referencia exacta de lo que cambia y sirve para aplicarlo a mano.
-- Ninguna tabla ni columna existente se borra ni se modifica.

ALTER TABLE "Usuario"       ADD COLUMN IF NOT EXISTS tienda_id text;
ALTER TABLE "Configuracion" ADD COLUMN IF NOT EXISTS tienda_id text;
ALTER TABLE tiendas         ADD COLUMN IF NOT EXISTS bot_field_postventa text;

CREATE TABLE IF NOT EXISTS asignaciones_pedido (
  id text PRIMARY KEY,
  lucidsales_pedido_id integer NOT NULL,
  tienda_id text,
  asignado_id text,
  created_by text,
  origen text NOT NULL DEFAULT 'manual',
  estado_pedido integer,
  fecha_pedido timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_pedido_lucidsales_pedido_id_key ON asignaciones_pedido (lucidsales_pedido_id);
CREATE INDEX IF NOT EXISTS asignaciones_pedido_asignado_id_idx ON asignaciones_pedido (asignado_id);
CREATE INDEX IF NOT EXISTS asignaciones_pedido_tienda_id_idx ON asignaciones_pedido (tienda_id);
CREATE INDEX IF NOT EXISTS "asignaciones_pedido_createdAt_idx" ON asignaciones_pedido ("createdAt");

CREATE TABLE IF NOT EXISTS zunto_archivos (
  ruta text PRIMARY KEY,
  contenido bytea NOT NULL,
  hash text NOT NULL,
  tamano integer NOT NULL DEFAULT 0,
  updated_at timestamp(3) without time zone NOT NULL
);
