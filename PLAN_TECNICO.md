# Plan Técnico — Plataforma de Gestión de Novedades

## Resumen ejecutivo

Sistema web para gestionar pedidos con novedades de entrega y paquetes en oficina de transportadora. Permite a los operadores hacer seguimiento completo del estado de cada pedido, registrar intentos de contacto y notificar automáticamente a los clientes.

---

## Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend (API) | **Node.js + Express** | Rápido de desarrollar, gran ecosistema |
| Base de datos | **PostgreSQL** | Relacional, robusto, soporta auditoría |
| ORM | **Prisma** | Migraciones automáticas, tipado fuerte |
| Frontend | **Next.js 14 (React)** | SSR + rutas de API integradas |
| Autenticación | **JWT + bcrypt** | Stateless, seguro |
| Almacenamiento | **Cloudinary** | Imágenes de guías, CDN incluido |
| Notificaciones | **Twilio (WhatsApp) + SendGrid (Email)** | Automatizar cambios de estado |
| Deploy Backend | **Railway** | PostgreSQL + Node.js en un solo lugar |
| Deploy Frontend | **Vercel** | Integración nativa con Next.js |
| Testing API | **Jest + Supertest** | |

---

## Arquitectura del sistema

```
[Cliente / Browser]
       │
       ▼
[Next.js Frontend — Vercel]
       │ fetch / axios
       ▼
[Express REST API — Railway]
       │
  ┌────┴────┐
  │         │
[PostgreSQL] [Cloudinary]
  │
  └── [Twilio / SendGrid]  (disparado por cambios de estado)
```

---

## Estructura de base de datos

### Tabla: `usuarios`
```sql
id          UUID PRIMARY KEY
nombre      VARCHAR(100)
email       VARCHAR(150) UNIQUE
password    VARCHAR(255)  -- hash bcrypt
rol         ENUM('admin', 'operador', 'viewer')
activo      BOOLEAN DEFAULT true
created_at  TIMESTAMP DEFAULT NOW()
```

### Tabla: `pedidos_novedad`
```sql
id               UUID PRIMARY KEY
nombre           VARCHAR(100)
apellido         VARCHAR(100)
celular          VARCHAR(20)
producto         TEXT
total_a_pagar    DECIMAL(12,2)
transportadora   VARCHAR(100)
guia             VARCHAR(100)
estado           ENUM('novedad','contactado','solucionado','cancelado') DEFAULT 'novedad'
intentos_llamada INT DEFAULT 0
notas            TEXT
created_at       TIMESTAMP DEFAULT NOW()
updated_at       TIMESTAMP DEFAULT NOW()
created_by       UUID REFERENCES usuarios(id)
```

### Tabla: `pedidos_oficina`
```sql
id               UUID PRIMARY KEY
nombre           VARCHAR(100)
apellido         VARCHAR(100)
celular          VARCHAR(20)
producto         TEXT
transportadora   VARCHAR(100)
guia             VARCHAR(100)
imagen_guia_url  TEXT           -- URL de Cloudinary
fecha_limite     DATE           -- Fecha máxima de recogida
estado           ENUM('pendiente_llamar','contactado','va_a_recoger','no_va_a_recoger') DEFAULT 'pendiente_llamar'
intentos_llamada INT DEFAULT 0
notas            TEXT
created_at       TIMESTAMP DEFAULT NOW()
updated_at       TIMESTAMP DEFAULT NOW()
created_by       UUID REFERENCES usuarios(id)
```

### Tabla: `historial_cambios` (auditoría)
```sql
id           UUID PRIMARY KEY
tabla        VARCHAR(50)     -- 'pedidos_novedad' o 'pedidos_oficina'
registro_id  UUID
campo        VARCHAR(100)
valor_anterior TEXT
valor_nuevo    TEXT
usuario_id   UUID REFERENCES usuarios(id)
created_at   TIMESTAMP DEFAULT NOW()
```

### Tabla: `intentos_contacto`
```sql
id           UUID PRIMARY KEY
tabla        VARCHAR(50)
registro_id  UUID
resultado    ENUM('no_contesta','ocupado','equivocado','contactado','buzon')
notas        TEXT
usuario_id   UUID REFERENCES usuarios(id)
created_at   TIMESTAMP DEFAULT NOW()
```

---

## API REST — Endpoints completos

### Autenticación
```
POST   /api/auth/login          → { token, usuario }
POST   /api/auth/logout
GET    /api/auth/me             → perfil del usuario actual
```

### Usuarios (solo admin)
```
GET    /api/usuarios            → lista paginada
POST   /api/usuarios            → crear usuario
PUT    /api/usuarios/:id        → actualizar
DELETE /api/usuarios/:id        → desactivar (soft delete)
```

### Pedidos en Novedad
```
GET    /api/novedades           → lista con filtros (estado, fecha, transportadora, búsqueda)
POST   /api/novedades           → crear registro
GET    /api/novedades/:id       → detalle + historial
PUT    /api/novedades/:id       → actualizar campos
PATCH  /api/novedades/:id/estado → cambiar estado (genera historial + notificación)
DELETE /api/novedades/:id       → eliminar (solo admin)
GET    /api/novedades/export    → exportar Excel (xlsx)
```

### Pedidos en Oficina
```
GET    /api/oficina             → lista con filtros
POST   /api/oficina             → crear registro
GET    /api/oficina/:id         → detalle + historial + intentos
PUT    /api/oficina/:id         → actualizar campos
PATCH  /api/oficina/:id/estado  → cambiar estado
POST   /api/oficina/:id/intento → registrar intento de contacto
POST   /api/oficina/:id/imagen  → subir/actualizar imagen de guía (Cloudinary)
DELETE /api/oficina/:id         → eliminar (solo admin)
GET    /api/oficina/export      → exportar Excel
GET    /api/oficina/vencimientos → pedidos que vencen en los próximos 2 días
```

### Dashboard / Métricas
```
GET    /api/dashboard/resumen   → conteos por estado, módulo y transportadora
GET    /api/dashboard/hoy       → registros creados y actualizados hoy
```

### Historial
```
GET    /api/historial/:tabla/:id → historial de cambios de un registro
```

---

## Estructura de carpetas

### Backend (Express)
```
/backend
  /src
    /controllers
      auth.controller.js
      novedades.controller.js
      oficina.controller.js
      dashboard.controller.js
      usuarios.controller.js
    /routes
      auth.routes.js
      novedades.routes.js
      oficina.routes.js
      dashboard.routes.js
      usuarios.routes.js
    /middlewares
      auth.middleware.js      -- verifica JWT
      roles.middleware.js     -- verifica permisos por rol
      audit.middleware.js     -- registra cambios automáticamente
      upload.middleware.js    -- multer + cloudinary
    /services
      notificaciones.service.js   -- Twilio + SendGrid
      export.service.js           -- genera Excel con exceljs
      cloudinary.service.js
    /utils
      paginate.js
      formatters.js
    /prisma
      schema.prisma
      /migrations
  app.js
  server.js
  .env
```

### Frontend (Next.js)
```
/frontend
  /app
    /login
    /dashboard
    /novedades
      /page.jsx          -- lista
      /[id]/page.jsx     -- detalle
      /nueva/page.jsx    -- formulario
    /oficina
      /page.jsx
      /[id]/page.jsx
      /nueva/page.jsx
    /usuarios            -- solo admin
    /configuracion
  /components
    /ui                  -- Button, Input, Badge, Modal, Table, etc.
    /forms
      NovedadForm.jsx
      OficinaForm.jsx
      IntentoContactoForm.jsx
    /layout
      Sidebar.jsx
      Header.jsx
      ProtectedRoute.jsx
    /dashboard
      StatsCard.jsx
      EstadoChart.jsx
      VencimientosAlert.jsx
  /lib
    api.js               -- axios instance con interceptors
    auth.js
  /hooks
    useNovedades.js
    useOficina.js
    useDashboard.js
  /store
    authStore.js         -- Zustand
```

---

## Roles y permisos

| Acción | Admin | Operador | Viewer |
|---|---|---|---|
| Ver listados | ✅ | ✅ | ✅ |
| Crear registros | ✅ | ✅ | ❌ |
| Cambiar estado | ✅ | ✅ | ❌ |
| Registrar intento | ✅ | ✅ | ❌ |
| Subir imagen guía | ✅ | ✅ | ❌ |
| Editar campos | ✅ | ✅ | ❌ |
| Eliminar registros | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver historial | ✅ | ✅ | ✅ |
| Exportar Excel | ✅ | ✅ | ✅ |

---

## Lógica de notificaciones automáticas

Cuando un operador cambia el estado de un pedido, el sistema dispara automáticamente:

### Novedades
| Estado nuevo | Acción |
|---|---|
| `contactado` | WhatsApp al cliente: "Hola {nombre}, hemos intentado contactarte sobre tu pedido {producto}..." |
| `solucionado` | WhatsApp + Email: "Tu pedido fue solucionado exitosamente 🎉" |
| `cancelado` | Email: "Lamentamos informarte que tu pedido fue cancelado. Proceso de devolución..." |

### Oficina
| Estado nuevo | Acción |
|---|---|
| `va_a_recoger` | WhatsApp: "Perfecto {nombre}, tu paquete estará disponible en {transportadora}. Recuerda llevar tu cédula." |
| `no_va_a_recoger` | Email interno al equipo: alerta para procesar devolución |

### Alertas de vencimiento
- Cron job diario a las 8 AM
- Busca pedidos en oficina con `fecha_limite <= NOW() + 2 days`
- Envía alerta por WhatsApp al cliente y notificación interna al equipo

---

## Flujo de estados

### Módulo Novedades
```
[NOVEDAD] ──→ [CONTACTADO] ──→ [SOLUCIONADO]
                    │
                    └──→ [CANCELADO]
```

### Módulo Oficina
```
[PENDIENTE_LLAMAR] ──→ [CONTACTADO] ──→ [VA_A_RECOGER]
                            │
                            └──→ [NO_VA_A_RECOGER]
```

---

## Seguridad

- JWT con expiración de 8 horas (jornada laboral)
- Refresh token almacenado en HttpOnly cookie
- Rate limiting en endpoints de login (5 intentos / 15 min)
- Validación de inputs con Zod (backend) + React Hook Form (frontend)
- Variables de entorno en `.env` — nunca en el repositorio
- CORS configurado solo para el dominio del frontend
- Sanitización de inputs para prevenir SQL injection (via Prisma)
- Logs de acceso y errores con Winston

---

## Plan de desarrollo por fases

### Fase 1 — MVP (3–4 semanas)
- [ ] Setup proyecto (repos, Railway, Vercel, Cloudinary)
- [ ] Autenticación JWT (login, roles)
- [ ] CRUD completo Novedades
- [ ] CRUD completo Oficina
- [ ] Cambio de estados + historial de auditoría
- [ ] Subida de imagen de guía (Cloudinary)
- [ ] Frontend: login, listados, detalle, formularios

### Fase 2 — Operaciones (1–2 semanas)
- [ ] Dashboard con métricas
- [ ] Filtros avanzados (estado, fecha, transportadora, búsqueda por texto)
- [ ] Exportación a Excel
- [ ] Registro de intentos de contacto
- [ ] Alertas de vencimiento (cron job)

### Fase 3 — Notificaciones (1 semana)
- [ ] Integración Twilio WhatsApp
- [ ] Integración SendGrid Email
- [ ] Plantillas de mensajes configurables

### Fase 4 — Pulido y administración (1 semana)
- [ ] Gestión de usuarios (admin)
- [ ] Configuración de transportadoras (catálogo)
- [ ] Tests unitarios y de integración
- [ ] Documentación API (Swagger)

---

## Variables de entorno requeridas

### Backend (.env)
```env
DATABASE_URL="postgresql://user:pass@host:5432/novedades_db"
JWT_SECRET="super_secret_key_aqui"
JWT_EXPIRES_IN="8h"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
SENDGRID_API_KEY=""
SENDGRID_FROM_EMAIL="notificaciones@tuempresa.com"
FRONTEND_URL="https://novedades.tuempresa.com"
PORT=3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL="https://api.tuempresa.com"
NEXT_PUBLIC_APP_NAME="GestiónNovedades"
```

---

## Estimado de costos mensuales (producción)

| Servicio | Plan | Costo aprox. |
|---|---|---|
| Railway (Backend + DB) | Starter | $5–10 USD/mes |
| Vercel (Frontend) | Hobby/Pro | $0–20 USD/mes |
| Cloudinary | Free tier | $0 (hasta 25GB) |
| Twilio WhatsApp | Por mensaje | ~$0.005 por mensaje |
| SendGrid | Free tier | $0 (hasta 100 emails/día) |
| **Total estimado** | | **~$10–30 USD/mes** |

---

## Próximos pasos inmediatos

1. Crear repositorios en GitHub (backend + frontend)
2. Configurar proyecto en Railway (PostgreSQL + Node.js service)
3. Crear proyecto en Vercel y conectar repo frontend
4. Crear cuenta Cloudinary y obtener credenciales
5. Inicializar el schema de Prisma y correr primera migración
6. Configurar Twilio Sandbox de WhatsApp para pruebas
