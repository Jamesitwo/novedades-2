-- Agregar indices para IntentoContacto
CREATE INDEX IF NOT EXISTS "IntentoContacto_tabla_registroId_idx" ON "IntentoContacto"("tabla", "registro_id");
CREATE INDEX IF NOT EXISTS "IntentoContacto_usuarioId_idx" ON "IntentoContacto"("usuario_id");
CREATE INDEX IF NOT EXISTS "IntentoContacto_createdAt_idx" ON "IntentoContacto"("createdAt");

-- Agregar indices para Transferencia
CREATE INDEX IF NOT EXISTS "Transferencia_tabla_registroId_idx" ON "Transferencia"("tabla", "registro_id");
CREATE INDEX IF NOT EXISTS "Transferencia_deUsuarioId_idx" ON "Transferencia"("de_usuario_id");
CREATE INDEX IF NOT EXISTS "Transferencia_aUsuarioId_idx" ON "Transferencia"("a_usuario_id");
CREATE INDEX IF NOT EXISTS "Transferencia_createdAt_idx" ON "Transferencia"("createdAt");

-- Agregar indice para MensajeWhatsApp.leido
CREATE INDEX IF NOT EXISTS "MensajeWhatsApp_leido_idx" ON "MensajeWhatsApp"("leido");

-- Agregar indice compuesto para HistorialCambio
CREATE INDEX IF NOT EXISTS "HistorialCambio_tabla_registroId_idx" ON "HistorialCambio"("tabla", "registro_id");

-- Agregar indices para PedidoVinculado (pedidos_vinculados)
CREATE INDEX IF NOT EXISTS "PedidoVinculado_estado_idx" ON "pedidos_vinculados"("estado");
CREATE INDEX IF NOT EXISTS "PedidoVinculado_asignadoId_idx" ON "pedidos_vinculados"("asignado_id");
CREATE INDEX IF NOT EXISTS "PedidoVinculado_createdAt_idx" ON "pedidos_vinculados"("createdAt");
