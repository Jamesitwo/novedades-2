# Motor de subida a Dropi

**Está apagado por defecto.** Para usarlo, pon `MOTOR_DROPI=1` en las variables del backend. Mientras esté apagado no arranca el motor, y el menú "Subida a Dropi" y el agente del detalle del pedido no se muestran.

Esta carpeta es el motor de subida, copiado **sin cambios** desde su app de origen. Incluye el agente que lee el chat, la subida automática a Dropi con seguro, las entregas programadas, el historial de intentos, la sesión de Dropi, la IA, Lucid Bot y Google Maps. Para traer mejoras desde el origen:

```
npm i --no-save typescript@5 postcss postcss-prefix-selector
node scripts/sincronizar-motor-dropi.js <carpeta de la app de origen>
```

El script copia el motor y los paneles y los pasa al tema de Pizdo. Además revisa que en el frontend no quede el nombre de la app de origen; si queda alguno, falla. Los textos que el motor devuelve también se limpian al responder (ver `src/services/motor-dropi/index.js`).

## Cómo encaja en Pizdo

| Pieza | Dónde |
|---|---|
| Arranque, estado guardado en la base y registro de lo subido | `src/services/motor-dropi/` (`index.js`, `motor.mjs`, `persistencia.js`) |
| Rutas `/api/motor-dropi/*` (con la sesión de Pizdo) | `src/routes/motor-dropi.routes.js` |
| Pantalla de ajustes | `/admin/subida-dropi` (solo admin) |
| Agente en el detalle del pedido | `components/detail/LucidsalesDetailPanel.jsx` |
| Paneles y sus adaptadores | `frontend/components/motor-dropi/` |

- **Una cuenta del motor por tienda de Pizdo.** Cada tienda con LucidSales configurado (email, clave y tienda) tiene su propio motor, con datos en `<MOTOR_DROPI_DATA_DIR>/<slug>/`. Las credenciales salen de Configuración de Pizdo.
- **Estado.** El motor escribe sus archivos de siempre. Cada 15 s se copian a la tabla `motor_archivos` y al arrancar se restauran desde ahí, así que un redeploy no pierde nada. Con un volumen en `/data/motor-dropi` también se conservan en disco.
- **Pedidos subidos.** Lo que el motor sube solo queda en `pedidos_vinculados` con `subidoAt` y sin `subidoPorId`, que es como cuenta en las métricas "por API". También queda en la bitácora. Lo que sube una persona desde el detalle queda a su nombre.
- **Permisos.** Validar y subir: usuarios con pedidos. Ajustes, sesión de Dropi e IA: solo admin.
- **Lo que hace Pizdo, no el motor.** La asignación y el reparto, las etiquetas, las credenciales de LucidSales y el cambio de estado. Esas rutas del motor no se exponen.

## Variables (opcionales)

| Variable | Para qué |
|---|---|
| `MOTOR_DROPI_DATA_DIR` | Carpeta de datos (en la imagen: `/data/motor-dropi`) |
| `MOTOR_DROPI_CLAVE_MAESTRA` | Cifra las claves guardadas (IA, Lucid Bot, Maps). Si vienes de una instalación anterior, usa su misma `CLAVE_MAESTRA` |
| `MOTOR_DROPI_LLM_API_KEY`, `MOTOR_DROPI_GOOGLE_MAPS_KEY`... | Cualquier variable del motor con prefijo `MOTOR_DROPI_` (también se pueden poner desde la pantalla) |
| `MOTOR_DROPI=1` | Enciende el motor y muestra sus pantallas (por defecto está apagado) |

## Pasar el estado de una instalación anterior (una sola vez)

1. **Apaga la subida automática en la instalación anterior.** Si quedan las dos encendidas, subirían los mismos pedidos dos veces.
2. Desde una carpeta con sus datos (en Railway: el volumen `/data`):
   `node scripts/importar-estado-motor.js <carpeta> <slug de la tienda> --perfil`
3. Reinicia Pizdo. La subida llega apagada: revísala en **Subida a Dropi** y enciéndela desde ahí.
