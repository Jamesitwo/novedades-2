# Motor de ZuntoStore dentro de Pizdo

Esta carpeta es el motor de `ZuntoStore/server`, copiado **sin cambios**: el agente que lee el chat, la subida automática a Dropi con seguro, las entregas programadas, el historial de intentos, la sesión de Dropi, la IA, Lucid Bot y Google Maps. Si mejoras algo en Zunto, tráelo con:

```
npm i --no-save typescript@5 postcss postcss-prefix-selector
node scripts/sincronizar-zunto.js ../ZuntoStore
```

## Cómo encaja en Pizdo

| Pieza | Dónde |
|---|---|
| Arranque, estado guardado en la base y registro de lo subido | `src/services/zunto/` (`index.js`, `motor.mjs`, `persistencia.js`) |
| Rutas `/api/zunto/*` (con la sesión de Pizdo) | `src/routes/zunto.routes.js` |
| Pantalla de ajustes | `/admin/subida-dropi` (solo admin) |
| Agente en el detalle del pedido | `components/detail/LucidsalesDetailPanel.jsx` |
| Copia de los paneles de Zunto y sus adaptadores | `frontend/components/zunto/` |

- **Una cuenta del motor por tienda de Pizdo.** Cada tienda que tenga LucidSales configurado (email, clave y tienda) tiene su propio motor, con datos en `<ZUNTO_DATA_DIR>/<slug>/`. Las credenciales salen de Configuración de Pizdo.
- **Estado.** El motor escribe sus archivos de siempre. Cada 15 s se copian a la tabla `zunto_archivos` y al arrancar se restauran desde ahí, así que un redeploy no pierde nada. Con un volumen en `/data/zunto` también se conservan en disco.
- **Pedidos subidos.** Lo que el motor sube solo queda en `pedidos_vinculados` con `subidoAt` y sin `subidoPorId`, que es como cuenta en las métricas "por API". También queda en la bitácora. Lo que sube una persona desde el detalle queda a su nombre.
- **Permisos.** Validar y subir: usuarios con pedidos. Ajustes, sesión de Dropi e IA: solo admin.
- **Lo que hace Pizdo, no el motor.** La asignación y el reparto, las etiquetas, las credenciales de LucidSales y el cambio de estado. Esas rutas del motor no se exponen.

## Variables (opcionales)

| Variable | Para qué |
|---|---|
| `ZUNTO_DATA_DIR` | Carpeta de datos (en la imagen: `/data/zunto`) |
| `ZUNTO_CLAVE_MAESTRA` | Cifra las claves guardadas (IA, Lucid Bot, Maps). Si vienes de Zunto, usa la misma `CLAVE_MAESTRA` |
| `ZUNTO_LLM_API_KEY`, `ZUNTO_GOOGLE_MAPS_KEY`... | Cualquier variable de Zunto con prefijo `ZUNTO_` (también se pueden poner desde la pantalla) |
| `ZUNTO_MOTOR=0` | Apaga el motor |

## Pasar el estado de Zunto a Pizdo (una sola vez)

1. **Apaga la subida automática en ZuntoStore.** Si quedan los dos encendidos, subirían los mismos pedidos dos veces.
2. Desde una carpeta con los datos de Zunto (en Railway: el volumen `/data`):
   `node scripts/importar-estado-zunto.js <carpeta> zunto --perfil`
3. Reinicia Pizdo. La subida llega apagada: revísala en **Subida a Dropi** y enciéndela desde ahí.
