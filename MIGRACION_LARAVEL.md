# Plan de Migración: Node.js/Next.js → Laravel + Blade + Tailwind

> **Fecha:** Junio 2026
> **Proyecto:** Plataforma de Gestión de Novedades
> **Stack Origen:** Node.js + Express + Prisma + Next.js 14 + React + Zustand + SQLite/PostgreSQL
> **Stack Destino:** Laravel 11 + Blade + Tailwind CSS + Alpine.js + MySQL

---

## 1. Resumen del Proyecto Actual

Sistema web para gestionar pedidos con novedades de entrega y paquetes en oficina de transportadora. Permite a los operadores hacer seguimiento completo del estado de cada pedido, registrar intentos de contacto y gestionar asignaciones.

### Stack Actual

| Capa | Tecnología |
|------|-----------|
| Backend API | Node.js + Express (30+ rutas) |
| ORM | Prisma ORM |
| Base de datos | SQLite (desarrollo) |
| Autenticación | JWT manual + bcrypt |
| Frontend | Next.js 14 (App Router) + React 18 |
| Estado global | Zustand |
| HTTP client | Axios |
| Validación | Zod |
| Exportación Excel | exceljs |
| Rate limiting | express-rate-limit |

### Estructura Actual de Archivos

`
/backend                          /frontend
  /src                              /app
    /controllers (11 archivos)        /login
    /routes (11 archivos)             /dashboard
    /middlewares (3 archivos)         /novedades
    /services (1 archivo)             /oficina
    /utils (2 archivos)               /usuarios
    /prisma                           /configuracion
      schema.prisma (177 lineas)       /apikey
      client.js                        /sesiones
      dev.db                           /devoluciones
  prisma/seed.js                    /components
  app.js                              /layout (Sidebar, Header)
  server.js                           /dashboard (StatsCard, VencimientosAlert)
                                      /forms
                                      /ui
                                    /lib (api.js, useKeyboardShortcuts.js)
                                    /store (authStore.js, themeStore.js)
plataforma_novedades_1.html
PLAN_TECNICO.md
`

### Modulos actuales (backend)

| Controller | Metodos | Proposito |
|---|---|---|
| auth.controller.js | 3 | Login, logout, me |
| novedades.controller.js | 13 | CRUD + estado + bulk + transferir + favorito + duplicar |
| oficina.controller.js | 14 | CRUD + estado + bulk + transferir + favorito + duplicar + imagen + vencimientos |
| dashboard.controller.js | 4 | Resumen, hoy, chart, rendimiento |
| usuarios.controller.js | 5 | CRUD usuarios |
| historial.controller.js | 2 | Obtener historial |
| configuracion.controller.js | 4 | CRUD configuracion |
| apikey.controller.js | 5 | CRUD API keys |
| sesiones.controller.js | 3 | Listar, cerrar sesiones |
| vistas.controller.js | 3 | CRUD vistas guardadas |
| backup.controller.js | 2 | Exportar/importar DB |

## 2. Stack Final

| Capa | Tecnologia | Proposito |
|---|---|---|
| Backend | Laravel 11 | Framework PHP principal |
| Frontend | Blade + Tailwind CSS + Alpine.js | Vistas del lado del servidor con utilidades CSS e interactividad ligera |
| Base de datos | MySQL 8 | Base de datos relacional |
| Autenticacion | Laravel Sanctum | Tokens SPA (cookie-based) + API tokens |
| Exportacion | Maatwebsite/Laravel-Excel | Generacion de archivos Excel (.xlsx) |
| Validacion | Laravel Form Requests | Validacion de inputs con reglas declarativas |

### Lo que NO se incluye

| Funcionalidad | Razon |
|---|---|
| Twilio (WhatsApp) | El usuario indico que no necesita notificaciones automaticas |
| SendGrid (Email) | El usuario indico que no necesita notificaciones automaticas |
| Cloudinary | Se usara almacenamiento local (Laravel Storage) para imagenes de guia |
| React/Zustand | Se reemplaza con Blade + Alpine.js |

---

## 3. Fase 1 - Setup del Proyecto Laravel

### 3.1 Comandos iniciales

`
composer create-project laravel/laravel novedades-laravel
cd novedades-laravel
composer require laravel/sanctum
composer require maatwebsite/excel
npm install -D tailwindcss @tailwindcss/forms postcss autoprefixer alpinejs
npx tailwindcss init -p
`

### 3.2 Variables de entorno (.env)

`
APP_NAME=GestionNovedades
APP_ENV=local
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=novedades_db
DB_USERNAME=root
DB_PASSWORD=
SANCTUM_STATEFUL_DOMAINS=localhost:8000
SESSION_DRIVER=cookie
`

### 3.3 Tailwind Config

`
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.blade.php",
    "./resources/**/*.js",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#5b6ef5',
          light: '#7c8fff',
        },
        novedad: '#f59e0b',
        contactado: '#5b6ef5',
        solucionado: '#22c87a',
        cancelado: '#ef4444',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
`

### 3.4 CSS App (resources/css/app.css)

`
@tailwind base;
@tailwind components;
@tailwind utilities;
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
`

---

## 4. Fase 2 - Migraciones de Base de Datos (10 tablas)

### Tabla 1: users (extiende migracion default)

`
Schema::create('users', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('nombre', 100);
    ->string('email', 150)->unique();
    ->timestamp('email_verified_at')->nullable();
    ->string('password');
    ->string('rol')->default('operador');
    ->boolean('activo')->default(true);
    ->rememberToken();
    ->timestamps();
});
`

### Tabla 2: pedidos_novedad

`
Schema::create('pedidos_novedad', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('nombre', 100);
    ->string('apellido', 100);
    ->string('celular', 20);
    ->text('producto');
    ->decimal('total_a_pagar', 12, 2);
    ->string('transportadora', 100);
    ->string('guia', 100);
    ->string('motivo_novedad')->nullable();
    ->string('estado')->default('novedad');
    ->integer('intentos_llamada')->default(0);
    ->text('notas')->nullable();
    ->boolean('favorito')->default(false);
    ->foreignUuid('created_by')->constrained('users');
    ->foreignUuid('asignado_id')->nullable()->constrained('users');
    ->timestamps();
    ->index('estado');
    ->index('asignado_id');
    ->index('transportadora');
});
`

### Tabla 3: pedidos_oficina

`
Schema::create('pedidos_oficina', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('nombre', 100);
    ->string('apellido', 100);
    ->string('celular', 20);
    ->text('producto');
    ->decimal('precio', 12, 2)->default(0);
    ->string('transportadora', 100);
    ->string('guia', 100);
    ->string('imagen_guia_url')->nullable();
    ->date('fecha_limite');
    ->string('estado')->default('pendiente_llamar');
    ->integer('intentos_llamada')->default(0);
    ->text('notas')->nullable();
    ->text('notas_internas')->nullable();
    ->boolean('favorito')->default(false);
    ->foreignUuid('created_by')->constrained('users');
    ->foreignUuid('asignado_id')->nullable()->constrained('users');
    ->timestamps();
    ->index('estado');
    ->index('asignado_id');
    ->index('fecha_limite');
});
`

### Tabla 4: historial_cambios

`
Schema::create('historial_cambios', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('tabla', 50);
    ->uuid('registro_id');
    ->string('campo', 100);
    ->text('valor_anterior')->nullable();
    ->text('valor_nuevo')->nullable();
    ->foreignUuid('usuario_id')->constrained('users');
    ->string('cliente_nombre')->nullable();
    ->timestamps();
    ->index('registro_id');
});
`

### Tabla 5: intentos_contacto

`
Schema::create('intentos_contacto', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('tabla', 50);
    ->uuid('registro_id');
    ->string('resultado');
    ->text('notas')->nullable();
    ->foreignUuid('usuario_id')->constrained('users');
    ->timestamps();
});
`

### Tabla 6: sesiones

`
Schema::create('sesiones', function (Blueprint ) {
    ->uuid('id')->primary();
    ->foreignUuid('usuario_id')->constrained('users');
    ->string('token')->unique();
    ->string('ip', 45)->nullable();
    ->string('navegador', 100)->nullable();
    ->timestamp('ultima_actividad')->useCurrent();
    ->timestamp('expira_at');
    ->boolean('activa')->default(true);
    ->timestamps();
    ->index('usuario_id');
});
`

### Tabla 7: configuraciones

`
Schema::create('configuraciones', function (Blueprint ) {
    ->uuid('id')->primary();
    ->boolean('auto_asignar_novedades')->default(false);
    ->boolean('auto_asignar_oficina')->default(false);
    ->string('metodo_asignacion')->default('round_robin');
    ->json('operadores_incluidos')->nullable();
    ->integer('ultimo_indice_round_robin')->default(0);
    ->timestamps();
});
`

### Tabla 8: api_keys

`
Schema::create('api_keys', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('nombre');
    ->string('clave')->unique();
    ->boolean('activo')->default(true);
    ->timestamps();
});
`

### Tabla 9: vistas_guardadas

`
Schema::create('vistas_guardadas', function (Blueprint ) {
    ->uuid('id')->primary();
    ->foreignUuid('usuario_id')->constrained('users');
    ->string('nombre');
    ->string('tipo');
    ->json('filtros');
    ->json('columnas')->nullable();
    ->timestamps();
    ->index('usuario_id');
});
`

### Tabla 10: transferencias

`
Schema::create('transferencias', function (Blueprint ) {
    ->uuid('id')->primary();
    ->string('tabla', 50);
    ->uuid('registro_id');
    ->foreignUuid('de_usuario_id')->constrained('users');
    ->foreignUuid('a_usuario_id')->constrained('users');
    ->text('notas')->nullable();
    ->timestamps();
});
`

---

## 5. Fase 3 - Modelos Eloquent

### Modelos a crear (10 modelos):

1. **User** (app/Models/User.php) - Extiende Authenticatable, usa HasApiTokens, HasUuids
2. **PedidoNovedad** (app/Models/PedidoNovedad.php) - tabla pedidos_novedad
3. **PedidoOficina** (app/Models/PedidoOficina.php) - tabla pedidos_oficina
4. **HistorialCambio** (app/Models/HistorialCambio.php) - tabla historial_cambios
5. **IntentoContacto** (app/Models/IntentoContacto.php) - tabla intentos_contacto
6. **Sesion** (app/Models/Sesion.php) - tabla sesiones
7. **Configuracion** (app/Models/Configuracion.php) - tabla configuraciones
8. **ApiKey** (app/Models/ApiKey.php) - tabla api_keys
9. **VistaGuardada** (app/Models/VistaGuardada.php) - tabla vistas_guardadas
10. **Transferencia** (app/Models/Transferencia.php) - tabla transferencias

### Relaciones clave:

`
User:
  - hasMany(PedidoNovedad, 'asignado_id') -> novedadesAsignadas
  - hasMany(PedidoOficina, 'asignado_id') -> oficinaAsignada
  - hasMany(PedidoNovedad, 'created_by') -> novedadesCreadas
  - hasMany(PedidoOficina, 'created_by') -> oficinaCreada
  - hasMany(HistorialCambio)
  - hasMany(IntentoContacto)
  - hasMany(Sesion)
  - hasMany(VistaGuardada)
  - hasMany(Transferencia, 'de_usuario_id')
  - hasMany(Transferencia, 'a_usuario_id')

PedidoNovedad:
  - belongsTo(User, 'created_by') -> creador
  - belongsTo(User, 'asignado_id') -> asignado
  - hasMany(HistorialCambio, 'registro_id')->where('tabla', 'pedidos_novedad')
  - hasMany(IntentoContacto, 'registro_id')->where('tabla', 'pedidos_novedad')
  - hasMany(Transferencia, 'registro_id')->where('tabla', 'pedidos_novedad')

PedidoOficina: (mismas relaciones que PedidoNovedad, cambiando tabla a pedidos_oficina)
`

### Accessors importantes en PedidoNovedad:

`
getNombreCompletoAttribute(): string -> "->nombre ->apellido"
getEstadoLabelAttribute(): string -> match(->estado) { ... }
getEstadoBadgeClassAttribute(): string -> match(->estado) { ... }
`

### Accessors importantes en PedidoOficina:

`
getDiasRestantesAttribute(): int
getVenceHoyAttribute(): bool
getVenceProntoAttribute(): bool
getEstadoLabelAttribute(): string
getEstadoBadgeClassAttribute(): string
`

### Scopes en User:

`
scopeActivos()
scopeOperadores()
`

### Scopes en PedidoOficina:

`
scopePorVencer(, int  = 3)
`

---

## 6. Fase 4 - Seeders

### DatabaseSeeder

`
->call([UserSeeder::class, ConfiguracionSeeder::class]);
`

### UserSeeder

- admin@novedades.com / admin123 (rol: admin)
- maria@novedades.com / operador123 (rol: operador)
- carlos@novedades.com / operador123 (rol: operador)
- ana@novedades.com / viewer123 (rol: viewer)

### ConfiguracionSeeder

- auto_asignar_novedades: true
- auto_asignar_oficina: true
- metodo_asignacion: round_robin
- operadores_incluidos: []

---

## 7. Fase 5 - Middlewares

### CheckRole Middleware

Permite verificar roles en las rutas via ->middleware('role:admin') o ->middleware('role:admin,operador').

Logica:
- Admin puede todo
- operador_asignado solo ve sus propios registros (se maneja en controladores)
- Viewer solo lectura (GET/HEAD)
- Si se especifica un rol concreto, verifica que el usuario tenga ese rol

### CheckApiKey Middleware

Permite autenticacion via Authorization: ApiKey {clave} para integraciones externas.

### Rate Limiter (en AppServiceProvider)

- login: 5 intentos por minuto por IP
- api: 100 requests por minuto por usuario

---

## 8. Fase 6 - Controladores (58 endpoints)

### AuthController (3 endpoints)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| POST /api/auth/login | login() | Autenticar usuario, crear token Sanctum, registrar sesion |
| POST /api/auth/logout | logout() | Revocar token, desactivar sesion |
| GET /api/user | me() | Perfil del usuario autenticado |
| GET /api/user/permisos | permisos() | Permisos segun rol |

### NovedadController (13 endpoints)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| GET /api/novedades | index() | Lista paginada con filtros (estados, search, fecha, transportadora, guia rango, favorito, asignado) |
| POST /api/novedades | store() | Crear registro + auto-asignacion |
| GET /api/novedades/{id} | show() | Detalle + historial + intentos + transferencias |
| PUT /api/novedades/{id} | update() | Actualizar con deteccion de cambios + historial |
| PATCH /api/novedades/{id}/estado | cambiarEstado() | Cambiar estado + historial |
| DELETE /api/novedades/{id} | destroy() | Eliminar (solo admin) |
| GET /api/novedades/export | export() | Exportar Excel con filtros |
| POST /api/novedades/{id}/intento | registrarIntento() | Registrar intento + incrementar contador |
| POST /api/novedades/bulk/estado | bulkCambiarEstado() | Cambio masivo de estado |
| POST /api/novedades/bulk/asignar | bulkAsignar() | Asignacion masiva a operador |
| POST /api/novedades/{id}/transferir | transferir() | Transferir a otro operador |
| PATCH /api/novedades/{id}/favorito | toggleFavorito() | Toggle favorito |
| POST /api/novedades/{id}/duplicar | duplicar() | Duplicar registro + '-COPY' en guia |

### OficinaController (14 endpoints)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| GET /api/oficina | index() | Lista paginada con filtros |
| POST /api/oficina | store() | Crear + fecha limite (+7 dias) + auto-asignacion |
| GET /api/oficina/{id} | show() | Detalle + historial + intentos + transferencias |
| PUT /api/oficina/{id} | update() | Actualizar + recalcular fecha limite |
| PATCH /api/oficina/{id}/estado | cambiarEstado() | Cambiar estado + historial |
| DELETE /api/oficina/{id} | destroy() | Eliminar (solo admin) |
| POST /api/oficina/{id}/intento | registrarIntento() | Registrar intento |
| POST /api/oficina/{id}/imagen | uploadImagen() | Subir imagen de guia |
| GET /api/oficina/export | export() | Exportar Excel |
| GET /api/oficina/vencimientos | vencimientos() | Pedidos por vencer en 3 dias |
| POST /api/oficina/bulk/estado | bulkCambiarEstado() | Cambio masivo |
| POST /api/oficina/bulk/asignar | bulkAsignar() | Asignacion masiva |
| POST /api/oficina/{id}/transferir | transferir() | Transferir |
| PATCH /api/oficina/{id}/favorito | toggleFavorito() | Toggle favorito |
| POST /api/oficina/{id}/duplicar | duplicar() | Duplicar |

### DashboardController (4 endpoints)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| GET /api/dashboard/resumen | resumen() | Conteos, dinero, ranking transportadoras, top productos, actividad reciente |
| GET /api/dashboard/hoy | hoy() | Registros creados hoy |
| GET /api/dashboard/chart | chart() | Datos diarios para graficos (30 dias default) |
| GET /api/dashboard/rendimiento | rendimiento() | Rendimiento por operador |

### UsuarioController (5 endpoints)

| Endpoint | Metodo | Descripcion |
|---|---|---|
| GET /api/usuarios | index() | Lista paginada |
| POST /api/usuarios | store() | Crear usuario |
| PUT /api/usuarios/{id} | update() | Actualizar usuario |
| DELETE /api/usuarios/{id} | destroy() | Desactivar (soft delete) |

### Otros Controladores

| Controller | Endpoints |
|---|---|
| HistorialController | GET /api/historial/{tabla}/{id} |
| ConfiguracionController | GET /api/configuracion, PUT /api/configuracion, GET /api/configuracion/operadores |
| ApiKeyController | CRUD /api/apikey |
| SesionController | GET /api/sesiones, DELETE /api/sesiones/{id} |
| VistaController | CRUD /api/vistas |
| BackupController | GET /api/backup/exportar, POST /api/backup/importar |

---

## 9. Fase 7 - Form Requests (Validacion)

11 Form Requests con reglas de validacion y mensajes personalizados en espanol:

| Form Request | Reglas clave |
|---|---|
| LoginRequest | email:required|email, password:required|min:6 |
| StoreNovedadRequest | nombre/apellido/celular/producto/transportadora/guia:required, total_a_pagar:required|numeric|min:0 |
| UpdateNovedadRequest | Mismas reglas but with sometimes |
| CambiarEstadoRequest (Novedad) | estado:required|in:novedad,contactado,solucionado,cancelado |
| IntentoContactoRequest (Novedad) | resultado:required|in:no_contesta,ocupado,equivocado,contactado,buzon |
| BulkEstadoRequest (Novedad) | ids:required|array, ids.*:exists:pedidos_novedad,id, estado:required|in:... |
| BulkAsignarRequest (Novedad) | ids:required|array, asignado_id:required|exists:users,id |
| StoreOficinaRequest | nombre/apellido/celular/producto/transportadora/guia:required, precio:nullable|numeric |
| UpdateOficinaRequest | Mismas reglas but with sometimes |
| StoreUsuarioRequest | nombre:required, email:required|email|unique:users,email, password:required|min:6, rol:required|in:admin,operador,... |
| UpdateUsuarioRequest | email:unique:users,email,{id}, password:nullable|min:6 |

---

## 10. Fase 8 - Rutas Completas (routes/api.php)

### Estructura de rutas:

`
/api/health (GET - publico)
/api/auth/login (POST - rate limited)

/auth:sanctum middleware:
  /api/auth/logout (POST)
  /api/user (GET)
  /api/user/permisos (GET)

  /api/dashboard/resumen (GET)
  /api/dashboard/hoy (GET)
  /api/dashboard/chart (GET)
  /api/dashboard/rendimiento (GET)

  /api/novedades (GET)
  /api/novedades (POST) [role:admin,operador,operador_asignado]
  /api/novedades/export (GET)
  /api/novedades/bulk/estado (POST) [role:admin,operador]
  /api/novedades/bulk/asignar (POST) [role:admin]
  /api/novedades/{id} (GET, PUT, DELETE [role:admin])
  /api/novedades/{id}/estado (PATCH)
  /api/novedades/{id}/intento (POST)
  /api/novedades/{id}/transferir (POST)
  /api/novedades/{id}/favorito (PATCH)
  /api/novedades/{id}/duplicar (POST)

  /api/oficina (GET, POST, GET/export, GET/vencimientos)
  /api/oficina/bulk/estado (POST)
  /api/oficina/bulk/asignar (POST)
  /api/oficina/{id} (GET, PUT, DELETE)
  /api/oficina/{id}/estado (PATCH)
  /api/oficina/{id}/intento (POST)
  /api/oficina/{id}/imagen (POST)
  /api/oficina/{id}/transferir (POST)
  /api/oficina/{id}/favorito (PATCH)
  /api/oficina/{id}/duplicar (POST)

  /api/usuarios (GET, POST) [role:admin]
  /api/usuarios/{id} (PUT, DELETE) [role:admin]

  /api/historial/{tabla}/{id} (GET)
  /api/configuracion (GET, PUT [role:admin])
  /api/configuracion/operadores (GET)

  /api/apikey (GET, POST, PUT/{id}, DELETE/{id}) [role:admin]

  /api/sesiones (GET)
  /api/sesiones/{id} (DELETE) [role:admin]

  /api/vistas (GET, POST)
  /api/vistas/{id} (DELETE)

  /api/backup/exportar (GET) [role:admin]
  /api/backup/importar (POST) [role:admin]
`

---

## 11. Fase 9 - Logica Compartida (Traits/Services/Observers/Exports)

### Trait: AsignacionAutomatica

Logica de auto-asignacion de registros a operadores:
- Lee configuracion (auto_asignar_novedades, auto_asignar_oficina)
- Filtra operadores incluidos y activos
- Si metodo = round_robin: asigna en orden circular
- Si metodo = menor_carga: asigna al operador con menos registros

### Observer: HistorialCambioObserver

- Escucha eventos updated en PedidoNovedad y PedidoOficina
- Detecta campos modificados vs originales
- Excluye updated_at, intentos_llamada
- Crea registros en historial_cambios automaticamente

### Exports (Maatwebsite):

- NovedadesExport: 13 columnas (ID, Nombre, Celular, Producto, Total, Transportadora, Guia, Motivo, Estado, Intentos, Notas, Creador, Fecha)
- OficinaExport: 12 columnas (ID, Nombre, Celular, Producto, Precio, Transportadora, Guia, Fecha Limite, Estado, Intentos, Notas, Fecha)

---

## 12. Fase 10 - Vistas Blade + Tailwind (13 paginas)

### Estructura de Vistas:

`
resources/views/
  layouts/
    app.blade.php              # Layout principal
  auth/
    login.blade.php            # Login
  dashboard/
    index.blade.php            # Dashboard
  novedades/
    index.blade.php            # Listado
    create.blade.php           # Formulario crear
    show.blade.php             # Detalle
  oficina/
    index.blade.php
    create.blade.php
    show.blade.php
  usuarios/
    index.blade.php
  configuracion/
    index.blade.php
  apikey/
    index.blade.php
  sesiones/
    index.blade.php
  components/
    stats-card.blade.php
    badge.blade.php
    pagination.blade.php
    modal.blade.php
    alert-banner.blade.php
    detail-panel.blade.php
`

### Diseno con Tailwind:

**Tema oscuro/claro:** Usar class="dark" en <html> + variantes dark: de Tailwind + Alpine.js para toggle.

**Paleta de colores:**
- bg-gray-950/900/800/700 para fondos (modo oscuro)
- bg-gray-100/50/white para modo claro
- Badges de estado con colores: amber-500 (novedad), blue-500 (contactado), green-500 (solucionado), red-500 (cancelado)

**Componentes UI:**
- Sidebar: fixed, w-56, border-r
- Topbar: sticky, h-14, border-b
- Stats cards: rounded-xl border p-4
- Tablas: table-auto con thead bg-gray-800
- Modales: fixed inset-0 bg-black/50 backdrop-blur-sm
- Paneles detalle: fixed right-0 w-[480px] h-screen

---

## 13. Fase 11 - Interactividad con Alpine.js

Alpine.js se usa para toda la interactividad del frontend, reemplazando React:

### Funcionalidades con Alpine:

1. **Sidebar** - Navegacion activa, toggle en mobile
2. **Topbar** - Busqueda en tiempo real, botones de accion
3. **Filtros** - Tabs de estado, selector de transportadora, date range
4. **Modal** - Abrir/cerrar modal de crear/editar registro
5. **Panel detalle** - Slide-over animado con historial, intentos, cambios de estado
6. **Cambio de estado** - Confirmacion con Alpine + llamada API
7. **Registro de intento** - Botones de resultado + textarea de nota
8. **Tema oscuro/claro** - Toggle con localStorage
9. **Tabla** - Seleccion multiple para bulk actions
10. **Paginacion** - Navegacion con Alpine

### Ejemplo de estructura Alpine:

`
<div x-data="{ open: false }">
    <button @click="open = true">Abrir modal</button>
    <div x-show="open" @click.away="open = false">
        <!-- contenido -->
    </div>
</div>
`

### Llamadas API con fetch nativo:

Alpine.js se integra con fetch o axios simple. No se necesita un cliente HTTP pesado.

`
fetch('/api/novedades', {
    headers: { 'Authorization': Bearer  }
})
.then(res => res.json())
.then(data => { /* actualizar Alpine data */ });
`

---

## 14. Fase 12 - Pruebas

### Feature Tests (Laravel):

| Test | Descripcion |
|---|---|
| LoginTest | Login exitoso, credenciales invalidas, rate limiting |
| NovedadTest | CRUD completo, cambios de estado, bulk actions, export |
| OficinaTest | CRUD completo, vencimientos, subida imagen, bulk |
| DashboardTest | Resumen con periodos, chart data, rendimiento |
| UsuarioTest | CRUD solo admin, desactivar |
| AuthTest | Proteccion de rutas por rol, API Key auth |

### Unit Tests:

| Test | Descripcion |
|---|---|
| AsignacionAutomaticaTest | Round-robin, menor carga, sin operadores |
| HistorialCambioObserverTest | Deteccion de cambios, exclusion de campos |
| FormRequestTest | Reglas de validacion, mensajes de error |

### Comando para ejecutar:

`
php artisan test
php artisan test --filter=NovedadTest
php artisan test --coverage
`

---

## 15. Fase 13 - Archivos a Crear/Eliminar

### Archivos a CREAR en Laravel:

`
database/migrations/
  0001_01_01_000000_create_users_table.php
  0002_01_01_000000_create_pedidos_novedad_table.php
  0003_01_01_000000_create_pedidos_oficina_table.php
  0004_01_01_000000_create_historial_cambios_table.php
  0005_01_01_000000_create_intentos_contacto_table.php
  0006_01_01_000000_create_sesiones_table.php
  0007_01_01_000000_create_configuraciones_table.php
  0008_01_01_000000_create_api_keys_table.php
  0009_01_01_000000_create_vistas_guardadas_table.php
  0010_01_01_000000_create_transferencias_table.php

app/Models/
  User.php
  PedidoNovedad.php
  PedidoOficina.php
  HistorialCambio.php
  IntentoContacto.php
  Sesion.php
  Configuracion.php
  ApiKey.php
  VistaGuardada.php
  Transferencia.php

app/Http/Controllers/Api/
  AuthController.php
  NovedadController.php
  OficinaController.php
  DashboardController.php
  UsuarioController.php
  HistorialController.php
  ConfiguracionController.php
  ApiKeyController.php
  SesionController.php
  VistaController.php
  BackupController.php

app/Http/Middleware/
  CheckRole.php
  CheckApiKey.php

app/Http/Requests/
  Auth/LoginRequest.php
  Novedad/StoreNovedadRequest.php
  Novedad/UpdateNovedadRequest.php
  Novedad/CambiarEstadoRequest.php
  Novedad/IntentoContactoRequest.php
  Novedad/BulkEstadoRequest.php
  Novedad/BulkAsignarRequest.php
  Oficina/StoreOficinaRequest.php
  Oficina/UpdateOficinaRequest.php
  Usuario/StoreUsuarioRequest.php
  Usuario/UpdateUsuarioRequest.php

app/Traits/
  AsignacionAutomatica.php

app/Observers/
  HistorialCambioObserver.php

app/Exports/
  NovedadesExport.php
  OficinaExport.php

database/seeders/
  DatabaseSeeder.php
  UserSeeder.php
  ConfiguracionSeeder.php

resources/views/
  layouts/app.blade.php
  auth/login.blade.php
  dashboard/index.blade.php
  novedades/index.blade.php
  novedades/create.blade.php
  novedades/show.blade.php
  oficina/index.blade.php
  oficina/create.blade.php
  oficina/show.blade.php
  usuarios/index.blade.php
  configuracion/index.blade.php
  apikey/index.blade.php
  sesiones/index.blade.php
  components/stats-card.blade.php
  components/badge.blade.php
  components/pagination.blade.php
  components/modal.blade.php
  components/alert-banner.blade.php
  components/detail-panel.blade.php

tests/Feature/
  LoginTest.php
  NovedadTest.php
  OficinaTest.php
  DashboardTest.php
  UsuarioTest.php

tests/Unit/
  AsignacionAutomaticaTest.php
  HistorialCambioObserverTest.php

routes/api.php
tailwind.config.js
resources/css/app.css
`

### Archivos a ELIMINAR del proyecto actual:

`
backend/ (directorio completo - Node.js + Express)
frontend/ (directorio completo - Next.js + React)
plataforma_novedades_1.html (prototipo standalone)
PLAN_TECNICO.md (reemplazar por MIGRACION_LARAVEL.md)
`

### Total estimado: ~80 archivos nuevos

---

## 16. Estimacion de Tiempo

### Por fase:

| Fase | Descripcion | Dias |
|---|---|---|
| Fase 1 | Setup Laravel + Tailwind + MySQL | 0.5 |
| Fase 2 | Migraciones (10 tablas) | 1 |
| Fase 3 | Modelos Eloquent (10 modelos) | 0.5 |
| Fase 4 | Seeders | 0.25 |
| Fase 5 | Middlewares (2 personalizados + rate limiter) | 0.5 |
| Fase 6 | Controladores (11 controladores, 58 endpoints) | 3.5 |
| Fase 7 | Form Requests (11 requests) | 0.75 |
| Fase 8 | Rutas (routes/api.php completo) | 0.5 |
| Fase 9 | Traits + Observers + Exports | 1 |
| Fase 10 | Vistas Blade + Tailwind (13 paginas + 6 components) | 4 |
| Fase 11 | Alpine.js interactividad | 2 |
| Fase 12 | Pruebas (Feature + Unit) | 1.5 |
| **Total** | | **~16 dias** |

### Por rol:

| Rol | Tiempo |
|---|---|
| Backend (Fases 1-9) | ~8.5 dias |
| Frontend (Fases 10-11) | ~6 dias |
| Pruebas (Fase 12) | ~1.5 dias |

---

## 17. Mapeo Completo Express -> Laravel

| Concepto Node.js/Express | Equivalente Laravel |
|---|---|
| app.js | bootstrap/app.php + Kernel |
| server.js | index.php / artisan serve |
| express.Router() | Route facade |
| req.params.id | ->route('id') |
| req.query | ->query() |
| req.body | ->all() / ->validated() |
| res.status(200).json() | response()->json([...], 200) |
| next(error) | throw Exception / abort() |
| app.use(error handler) | App/Exceptions/Handler |
| morgan combined | Laravel Log |
| express-rate-limit | RateLimiter facade |
| zod validation | Form Request |
| paginate.js helper | Eloquent ->paginate() |
| Prisma ORM | Eloquent ORM |
| JWT + bcrypt | Laravel Sanctum |
| bcrypt.compare | Hash::check() |
| jwt.sign / jwt.verify | ->createToken() |
| process.env.JWT_SECRET | APP_KEY / SANCTUM keys |
| exceljs (xlsx) | Maatwebsite Excel |
| Zustand store | Inertia usePage().props / Blade + Alpine |
| Axios interceptors | Axios / fetch nativo |
| Next.js App Router | Blade routes/web.php |
| usePathname() | request()->path() |
| useEffect + useState | x-data + x-init en Alpine |
| localStorage (theme) | localStorage + Alpine |
| CSS variables + dark theme | Tailwind dark: classes |

---

## 18. Notas Adicionales

### Migracion de Datos

Para migrar datos existentes de SQLite a MySQL:

`
# Exportar desde SQLite
sqlite3 backend/src/prisma/dev.db .dump > dump.sql

# Convertir dump a formato MySQL y ejecutar antes de las migraciones
# O crear un comando Artisan personalizado para importar
php artisan import:from-sqlite --path=backend/src/prisma/dev.db
`

### Autenticacion en Desarrollo

Durante desarrollo, Sanctum funciona con SANCTUM_STATELESS_DOMAINS=* o se usa el header Authorization: Bearer {token}.

### Storage de Imagenes

Para subida de imagenes de guia:
- Storage local: storage/app/public/guias/
- Link: php artisan storage:link
- URL: sset('storage/guias/{filename}')

### Consideraciones de Seguridad

- Las contraseñas se almacenan con bcrypt via Hash::make()
- Sanctum genera tokens seguros automaticamente
- CSRF protection para rutas web (no aplica a API con Sanctum)
- Rate limiting en login para prevenir fuerza bruta
- Validacion de inputs en todos los endpoints
- Roles y permisos verificados en middleware y controladores

### Comandos Post-Migracion

`
php artisan migrate:fresh --seed
php artisan storage:link
php artisan optimize
npm run build
`

---

