# GestiónNovedades — Documentación de Funcionalidades

Plataforma para gestión de novedades de entrega, pedidos en oficina, facturación, garantías y más.

---

## Módulos

### 📊 Dashboard
- Resumen general con totales por estado (novedades/oficina)
- Gráficos de evolución diaria (barras) y distribución de estados (donut)
- Motivos de novedad más repetidos (barras horizontales)
- Transportadoras ranking con valor monetario
- Actividad reciente (últimos cambios)
- Accesos rápidos a módulos principales
- Filtro por período: Hoy / Semana / Mes / Todo
- Total Valor, Recuperado, Total Oficina

### 📋 Dashboard → Métricas (Admin)
- Rendimiento por operador: asignados, resueltos, tasa de resolución
- Intentos de contacto, contactos exitosos
- Transferencias realizadas/recibidas
- Dinero manejado, tiempo promedio de resolución
- Tiempo activo en plataforma por usuario
- Ordenamiento por cualquier columna

---

### ⚠ Novedades
- CRUD completo (crear, ver, editar, eliminar)
- Estados: `novedad` → `contactado` → `solucionado` → `entregado` → `devolucion`
- Filtros: por estado (múltiple), transportadora, etiquetas, fechas, búsqueda, favoritos, asignados a mí
- Búsqueda multi-palabra case-insensitive
- Operaciones masivas: cambiar estado, asignar operador, eliminar (admin)
- Transferir a otro operador
- Registrar intentos de contacto (no contesta, ocupado, equivocado, contactado, buzón)
- Duplicar registro
- Toggle favorito
- Exportar a Excel
- Asignación automática (round-robin o menor carga)
- Etiquetas con colores asignables
- Badges de etiquetas en la tabla
- Celular 2 (segundo número)
- Link de conversación
- Atajos de teclado: J/K (navegar), E (editar), N (nuevo)

### ✅ Solucionados (sub-vista)
- Novedades con estado `solucionado`
- Valor total recuperado
- Búsqueda
- Acceso directo desde sidebar

---

### 📦 Oficina
- CRUD completo (crear, ver, editar, eliminar)
- Estados: `pendiente_llamar` → `contactado` → `va_a_recoger` → `entregado` → `devolucion`
- Filtros: por estado (múltiple), transportadora, etiquetas, fechas, búsqueda, favoritos
- Búsqueda multi-palabra case-insensitive
- Operaciones masivas: cambiar estado, asignar operador, eliminar (admin)
- Fecha límite automática (+7 días desde llegada)
- Alertas de vencimiento (3 días)
- Etiquetas asignables con badges de colores
- Celular 2 (segundo número)
- Link de conversación
- Registro de intentos de contacto
- Transferir entre operadores

### 📦 Por Recoger (sub-vista)
- Paquetes con estado `va_a_recoger` y `entregado`
- Días restantes hasta vencimiento
- Valor total acumulado
- Búsqueda

---

### ↩️ Devoluciones
- Vista consolidada de novedades + oficina con estado `devolucion`
- Filtro por origen (novedades/oficina/todos)
- Búsqueda
- Links a detalle de cada registro

---

### 📄 Facturas
- CRUD completo
- Estados: `pendiente` → `pagada` (o `cancelada`)
- Items dinámicos (descripción, cantidad, precio unitario)
- Subtotal, IVA configurable, Total automático
- Método de pago: Contraentrega / Transferencia / Efectivo / Otro
- **PDF descargable** con:
  - Logo de empresa (configurable)
  - Datos de empresa (nombre, NIT, dirección, teléfono, email)
  - Resolución DIAN (número, rango, vigencia)
  - Prefijo de numeración (ej: FAC-0001)
  - Datos del cliente + método de pago
  - Tabla de items con subtotal/IVA/total
  - Vencimiento destacado
  - QR code con link a la factura
  - Datos bancarios (solo si Transferencia)
  - Términos y condiciones
  - Pie de página legal
  - Sello "PAGADO" semitransparente
- Filtros por estado y búsqueda
- Stats de totales

---

### 📋 Garantías
- **Admin/Operador**: crear link de garantía con token único
  - Teléfono (obligatorio)
  - Link de conversación (obligatorio)
  - Nombre cliente, producto, precio (opcionales)
  - Expira a los 7 días
  - Link público generado automáticamente
- **Cliente** (público, sin login):
  - Abre el link desde su celular
  - Formulario en modo claro
  - Subida de fotos (Cloudinary Upload Widget)
  - Subida de video obligatorio (Cloudinary, máx 5 min)
  - Nombre, producto, descripción
- **Admin/Operador** (revisión):
  - Lista con filtros, miniaturas de fotos
  - Detalle con galería de fotos + reproductor de video
  - Flujo de estados:
    `esperando` → `pendiente` → `revisada` → `subido_dropi` → `guia_generada` → `guia_compartida` → `finalizado`
  - También puede ir a `aprobada` o `rechazada`
- Creación por API (endpoint público)
- Teléfono y link conversación visibles solo para admin/operador

---

### 📋 Tareas (Kanban — Admin)
- Tablero Kanban con Drag & Drop
- 5 columnas: Pendiente / En Progreso / Revisión / Completadas / Canceladas
- Prioridades: Urgente 🔴, Alta 🟠, Media 🟡, Baja 🟢
- Tarjetas con: título, prioridad, origen (novedad/oficina/manual), asignado, fecha límite
- Crear tareas manuales (modal)
- Detalle con cambio de estado y link al registro original
- **Auto-creación**: al transferir una novedad/oficina a un admin, se crea automáticamente una tarea en el Kanban

---

### 🏷️ Etiquetas
- CRUD (admin edita/elimina cualquier etiqueta, operadores solo las suyas)
- 12 colores predefinidos + color picker nativo + hex manual
- Asignables a novedades y oficina
- Badges de colores en tablas y detalle
- Filtro por etiqueta en novedades/oficina
- Selector de etiquetas en vista detalle

---

### 🏆 Pizdo · Productos Ganadores
- CRUD de productos (ID Dropi, nombre, ventas, categoría, potencial, imagen, link)
- Cards con imagen, badge de potencial (alto/medio/bajo), ventas, margen
- Filtros: búsqueda, categoría, potencial, orden
- Precio proveedor con cálculo de margen
- Exportar/Importar JSON
- Stats globales (totales por potencial, ventas totales)

---

### 👥 Usuarios (Admin)
- CRUD de usuarios
- Roles: `admin` / `operador`
- Toggle activar/desactivar (soft delete)
- Visibilidad configurable: "Ver solo asignados" vs "Ver todos" (toggle por operador)
- Cambio de contraseña (modal en sidebar para todos los usuarios)

---

### ⚙ Configuración (Admin)
- Auto-asignación de novedades/oficina (on/off)
- Método de distribución: Round Robin / Menor Carga
- Selección de operadores incluidos en auto-asignación
- Datos de la empresa (nombre, NIT, teléfono, dirección, email)
- Logo de empresa (URL)
- Facturación: prefijo, resolución DIAN, rango, vigencia, términos, pie legal
- Datos bancarios (banco, tipo cuenta, número, titular)

---

### 🔑 API Keys (Admin)
- CRUD de API Keys para integraciones externas
- La clave se muestra solo al crear
- Activar/desactivar
- Autenticación: `Authorization: ApiKey <clave>`

---

### 🔐 Sesiones (Admin)
- Lista de sesiones activas
- Cerrar sesión individual o todas las de un usuario
- IP, navegador, última actividad, expiración

---

### 🏢 Funcionalidades Transversales
- **Tema oscuro/claro** (toggle en sidebar)
- **Sidebar responsive** con hamburger menu en móvil
- **Cambio de contraseña** desde sidebar
- **Heartbeat** para tracking de tiempo activo en plataforma
- **Atajos de teclado** en novedades/oficina
- **Exportar Excel** en novedades/oficina
- **Historial de cambios** por registro
- **Registro de transferencias** entre operadores
- **Vistas guardadas** por usuario (filtros personalizados)

---

### 🔒 Autenticación
- Login con email/password (JWT)
- API Keys para integraciones externas
- Tokens expiran en 8h
- Logout invalida sesión en BD
- Rate limiting en login y API general
- Roles: `admin` (acceso total), `operador` (limitado)

---

### 🗄 Base de Datos
- 17 modelos en Prisma
- Desarrollo: SQLite
- Producción: PostgreSQL

---

### 🚀 Deploy
- Railway (single-container: API + Frontend + PostgreSQL)
- Dockerfile multi-stage
- Migración automática al iniciar
- Health check endpoint: `/api/health`

---

### 📡 API
- ~70 endpoints REST documentados en `API.md`
- Endpoints públicos: login, registro de garantía, check de token
- Webhook-ready para integraciones externas
