# API REST — GestiónNovedades

**Base URL:** `http://localhost:3001/api`

---

## Autenticación

Todos los endpoints (excepto login) requieren header:
```
Authorization: Bearer <token_jwt>
```

### POST /api/auth/login
Login de usuario. Retorna JWT + datos del usuario.

**Body:**
```json
{
  "email": "admin@novedades.com",
  "password": "admin123"
}
```
**Respuesta 200:**
```json
{
  "token": "eyJhbGciOi...",
  "usuario": {
    "id": "uuid",
    "nombre": "Administrador",
    "email": "admin@novedades.com",
    "rol": "admin",
    "activo": true
  }
}
```

### POST /api/auth/logout
Cierra la sesión actual. Invalida el token en BD.
```
Authorization: Bearer <token>
```
**Respuesta 200:** `{ "message": "Logout exitoso" }`

### GET /api/auth/me
Retorna datos del usuario autenticado.
```
Authorization: Bearer <token>
```

---

## Dashboard

Todos requieren autenticación.

### GET /api/dashboard/resumen?periodo=todos
Resumen general con conteos por estado, estadísticas de dinero, ranking de transportadoras. `periodo`: `hoy` | `semana` | `mes` | `todos`

**Respuesta:**
```json
{
  "novedades": { "total": 10, "novedad": 5, "contactado": 2, "solucionado": 2, "cancelado": 1, "devolucion": 0 },
  "oficina": { "total": 5, "pendiente_llamar": 3, "contactado": 1, ... },
  "estadisticas": { "totalDinero": 5000000, "dineroSolucionado": 2000000, "porcentajeRecuperado": 40, ... },
  "rankingTransportadoras": [...],
  "actividadReciente": [...]
}
```

### GET /api/dashboard/hoy
Conteos del día actual.
```json
{ "novedadesCreadasHoy": 3, "oficinaCreadosHoy": 1, "fecha": "2026-06-09" }
```

### GET /api/dashboard/chart?dias=30
Datos para gráficos de línea. Conteos diarios por estado.

### GET /api/dashboard/rendimiento?periodo=mes
Rendimiento básico por operador.

### GET /api/dashboard/metricas-operadores?periodo=mes
**[ADMIN]** Métricas detalladas por operador: asignados, resueltos, tasa resolución, intentos contacto, transferencias, dinero manejado, tiempo promedio resolución, tiempo activo.

### GET /api/dashboard/tiempo-activo?periodo=hoy
**[ADMIN]** Tiempo activo acumulado por usuario con sesiones, horas y minutos.

---

## Novedades

Base: `/api/novedades`

### GET /api/novedades?page=1&limit=20&estados=["novedad"]&search=&transportadora=&fechaDesde=&fechaHasta=&favorito=true&asignado_a_mi=true
Lista paginada de novedades con filtros.

### GET /api/novedades/export?...
Exporta novedades a Excel (`.xlsx`).

### GET /api/novedades/:id
Obtiene una novedad por ID con historial, transferencias e intentos de contacto.

### POST /api/novedades
Crea una nueva novedad.
```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "celular": "3001234567",
  "producto": "Laptop HP",
  "totalAPagar": 2500000,
  "transportadora": "Servientrega",
  "guia": "SE123456789",
  "motivoNovedad": "No atendido",
  "notas": "Cliente solicita reprogramar"
}
```

### PUT /api/novedades/:id
Actualiza campos de una novedad.

### PATCH /api/novedades/:id/estado
Cambia el estado de una novedad.
```json
{ "estado": "solucionado" }
```
Estados válidos: `novedad` | `contactado` | `solucionado` | `cancelado` | `devolucion`

### PATCH /api/novedades/:id/transferir
Transfiere una novedad a otro operador.
```json
{ "aUsuarioId": "uuid", "notas": "Transferido por carga" }
```

### PATCH /api/novedades/:id/favorito
Toggle de favorito.

### POST /api/novedades/:id/intento
Registra un intento de contacto.
```json
{ "resultado": "contactado", "notas": "Cliente confirma dirección" }
```
Resultados: `no_contesta` | `ocupado` | `equivocado` | `contactado` | `buzon`

### POST /api/novedades/:id/duplicar
Duplica una novedad (guía + "-COPY").

### PATCH /api/novedades/bulk-estado
**[ADMIN]** Cambio masivo de estado.
```json
{ "ids": ["uuid1", "uuid2"], "estado": "solucionado" }
```

### PATCH /api/novedades/bulk-asignar
**[ADMIN]** Asignación masiva.
```json
{ "ids": ["uuid1", "uuid2"], "aUsuarioId": "uuid" }
```

### DELETE /api/novedades/:id
**[ADMIN]** Elimina una novedad.

---

## Oficina

Base: `/api/oficina`

Endpoints análogos a Novedades.

### GET /api/oficina?page=1&limit=20&...
Lista paginada de pedidos en oficina.

### GET /api/oficina/export?...
Exporta a Excel.

### GET /api/oficina/vencimientos
Pedidos próximos a vencer (3 días).

### GET /api/oficina/:id
Detalle de un pedido de oficina.

### POST /api/oficina
Crea un nuevo pedido de oficina.
```json
{
  "nombre": "María",
  "apellido": "García",
  "celular": "3109876543",
  "producto": "Audífonos Sony",
  "precio": 150000,
  "transportadora": "Interrapidisimo",
  "guia": "INT987654321",
  "fechaLlegada": "2026-06-09",
  "notas": "Frágil",
  "notasInternas": "Llamar en horario laboral"
}
```

### PUT /api/oficina/:id
Actualiza campos.

### PATCH /api/oficina/:id/estado
```json
{ "estado": "va_a_recoger" }
```
Estados: `pendiente_llamar` | `contactado` | `va_a_recoger` | `no_va_a_recoger` | `devolucion`

### PATCH /api/oficina/:id/transferir
Transfiere a otro operador.

### PATCH /api/oficina/:id/favorito
Toggle favorito.

### POST /api/oficina/:id/intento
Registra intento de contacto.

### POST /api/oficina/:id/duplicar
Duplica el registro.

### PATCH /api/oficina/bulk-estado
**[ADMIN]** Cambio masivo.

### PATCH /api/oficina/bulk-asignar
**[ADMIN]** Asignación masiva.

### DELETE /api/oficina/:id
**[ADMIN]** Elimina.

---

## Usuarios

Base: `/api/usuarios`

### GET /api/usuarios?page=1&limit=20
**[ADMIN]** Lista de usuarios paginada.

### GET /api/usuarios/operadores
Lista de operadores activos para dropdowns de asignación.

### POST /api/usuarios
**[ADMIN]** Crea un usuario.
```json
{
  "nombre": "Nuevo Operador",
  "email": "nuevo@test.com",
  "password": "123456",
  "rol": "operador"
}
```
Roles: `admin` | `operador`

### PUT /api/usuarios/:id
**[ADMIN]** Actualiza usuario.
```json
{ "nombre": "Nombre Nuevo", "rol": "operador", "activo": true }
```

### DELETE /api/usuarios/:id
**[ADMIN]** Desactiva un usuario (soft delete).

---

## Historial

Base: `/api/historial`

### GET /api/historial/:tabla/:id
Historial de cambios de un registro. `tabla`: `pedidos_novedad` | `pedidos_oficina`

### GET /api/historial/export?fechaDesde=&fechaHasta=&tabla=
**[ADMIN]** Exporta historial a CSV.

---

## Configuración

Base: `/api/configuracion`

### GET /api/configuracion
**[ADMIN]** Obtiene configuración global del sistema.

### PUT /api/configuracion
**[ADMIN]** Actualiza configuración.
```json
{
  "auto_asignar_novedades": true,
  "auto_asignar_oficina": false,
  "metodo_asignacion": "round_robin",
  "operadores_incluidos": ["uuid1", "uuid2"]
}
```
Métodos: `round_robin` | `menor_carga`

---

## API Keys

Base: `/api/apikey`

### GET /api/apikey
**[ADMIN]** Lista todas las API keys.

### POST /api/apikey
**[ADMIN]** Crea nueva API key.
```json
{ "nombre": "Integración ERP" }
```
**Respuesta:** (la clave solo se muestra una vez)
```json
{ "id": "uuid", "nombre": "Integración ERP", "clave": "hex64chars...", "activo": true }
```

### PUT /api/apikey/:id/toggle
**[ADMIN]** Activa/desactiva una API key.

### DELETE /api/apikey/:id
**[ADMIN]** Elimina una API key.

---

## Sesiones

Base: `/api/sesiones`

### GET /api/sesiones
**[ADMIN]** Lista todas las sesiones activas.

### POST /api/sesiones/heartbeat
Envía ping para registrar actividad (cada 60s desde el frontend). Actualiza tiempo activo.

### DELETE /api/sesiones/:id
**[ADMIN]** Cierra una sesión específica.

### DELETE /api/sesiones/usuario/:usuarioId
**[ADMIN]** Cierra todas las sesiones de un usuario.

---

## Vistas Guardadas

Base: `/api/vistas`

### GET /api/vistas?tipo=novedades
Lista vistas guardadas del usuario autenticado.

### POST /api/vistas
Guarda una vista (filtros + columnas).
```json
{
  "nombre": "Mis pendientes",
  "tipo": "novedades",
  "filtros": { "estados": ["novedad"], "asignado_a_mi": true },
  "columnas": ["nombre", "estado"]
}
```

### DELETE /api/vistas/:id
Elimina una vista guardada (solo propia o admin).

---

## Backup

Base: `/api/backup`

### POST /api/backup
**[ADMIN]** Crea backup de la base de datos SQLite.

### GET /api/backup
**[ADMIN]** Lista backups disponibles.

---

## Roles de acceso

| Rol | Permisos |
|-----|---------|
| **admin** | Acceso total a todos los endpoints |
| **operador** | CRUD novedades/oficina, dashboard, vistas propias |
| **viewer** | Solo lectura de dashboard (no implementado en frontend) |

---

## Credenciales de prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@novedades.com | admin123 | admin |
| operador@novedades.com | admin123 | operador |
