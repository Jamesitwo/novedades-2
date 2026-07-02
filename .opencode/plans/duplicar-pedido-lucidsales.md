# Plan: Duplicar pedido LucidSales

## Objetivo
Permitir duplicar un pedido vinculado que ya fue subido, creando una copia nueva en LucidSales lista para re-subir.

## Archivos a modificar

### 1. `backend/src/controllers/lucidsales.controller.js`
Nuevo handler `duplicarPedido`:
- `POST /api/lucidsales/pedidos/:id/duplicar`
- Obtiene pedido original con `getPedidoById(id)`
- Mapea campos al formato `createPedido`
- Crea nuevo pedido en LucidSales
- Vincula el nuevo en DB local
- Devuelve `{ ok: true, nuevoId: X, pedido: {...} }`

### 2. `backend/src/routes/lucidsales.routes.js`
- Añadir ruta: `router.post('/pedidos/:id/duplicar', ctrl.duplicarPedido)`

### 3. `frontend/app/lucidsales/[id]/page.js`
- Botón "🔄 Duplicar" en el header (junto a Guardar cambios)
- Solo visible si el pedido ya fue subido (`uploaded = true`)
- Confirmación antes de duplicar
- Redirige al nuevo pedido automáticamente

## Mapeo de campos (getPedidoById → createPedido)

| getPedidoById | createPedido |
|--------------|-------------|
| Nombre | nombreCliente |
| Apellido | apellidoCliente |
| Movil | telefonoCliente |
| Correo | emailCliente |
| Direccion | direccionCliente |
| Ciudad (ID) | ciudadCliente |
| Departamento (ID) | departamentoCliente |
| Pais | paisCliente |
| Json (string) | json (string) |
| SubTotal (string) | subTotal (number) |
| CostoEnvio (string) | costoEnvio (number) |
| Total (string) | total (number) |
| Referencias | Referencias |
| NIT | nitCliente |
| codigoPostal | codigoPostal |

## UX
- Botón solo visible si `uploaded === true`
- Confirm dialog: "¿Crear una copia de este pedido para volver a subirlo?"
- Toast de éxito con el nuevo ID
- Redirección automática al nuevo pedido
