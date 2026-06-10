# Despliegue Gratuito — Render + Vercel + Neon

Sin tarjeta de crédito. Sin dominio propio. ~10 minutos.

---

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel    │────▶│    Render     │────▶│    Neon      │
│  Frontend   │     │   Backend API │     │  PostgreSQL  │
│ Next.js 14  │     │   Express.js  │     │              │
│ (gratis)    │     │   (gratis)    │     │  (gratis)    │
└─────────────┘     └──────────────┘     └─────────────┘
```

- **Vercel**: `tunombre.vercel.app`
- **Render**: `novedades-api.onrender.com` (se duerme tras 15 min inactivo)
- **Neon**: `ep-xxxx.us-east-2.aws.neon.tech`

---

## Paso 1: Neon (Base de Datos PostgreSQL)

1. Ve a [neon.tech](https://neon.tech) → Sign Up con GitHub
2. Crea un proyecto → nombre: `novedades`
3. Copia el **Connection string** (se ve así):
   ```
   postgresql://novedades_owner:xxxxx@ep-xxxx.us-east-2.aws.neon.tech/novedades?sslmode=require
   ```
4. **Guárdalo** — lo necesitarás en Render

**Importante:** Neon tiene 0.5 GB gratis. Suficiente para este proyecto.

---

## Paso 2: Render (Backend API)

### 2.1 Subir el proyecto a GitHub

Render despliega desde GitHub. Si aún no tienes repo:

```bash
cd C:\Users\James\Documents\Novedades
git init
git add .
git commit -m "Primer commit - GestionNovedades"
# Crear repo en GitHub y luego:
git remote add origin https://github.com/TU_USUARIO/novedades.git
git branch -M main
git push -u origin main
```

### 2.2 Crear migración inicial de Prisma

Antes de deploy, genera la migración usando Neon:

```powershell
cd backend

# Temporalmente usa la URL de Neon (reemplaza con tu string)
$env:DATABASE_URL = "postgresql://novedades_owner:xxxx@ep-xxxx.us-east-2.aws.neon.tech/novedades?sslmode=require"

# Generar migración
npx prisma migrate dev --name init --schema prisma/schema.prisma

# Esto crea: backend/prisma/migrations/20240101000000_init/migration.sql
# Asegúrate de commitear y pushear esta carpeta
git add .; git commit -m "add initial prisma migration"; git push
```

### 2.3 Crear servicio en Render

1. Ve a [render.com](https://render.com) → Sign Up con GitHub
2. **New +** → **Web Service**
3. Conecta tu repo de GitHub
4. Configura:

| Campo | Valor |
|-------|-------|
| Name | `novedades-api` |
| Region | Oregon (US West) |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install && npm run build && npm run db:migrate && npm run db:seed` |
| Start Command | `npm start` |
| Instance Type | **Free** |

5. **Environment Variables:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *tu string de Neon* |
| `JWT_SECRET` | (Render genera uno automático — déjalo así) |
| `JWT_EXPIRES_IN` | `8h` |
| `FRONTEND_URL` | `https://TU_VERCEL_APP.vercel.app` *(ponlo después de crear Vercel)* |

6. Click **Create Web Service**

Tarda ~3-5 min el primer deploy. Render pone la URL: `https://novedades-api.onrender.com`

### 2.4 Verificar

```bash
curl https://novedades-api.onrender.com/api/health
# {"status":"ok","timestamp":"...","uptime":5}
```

**Nota:** La primera vez puede tardar 30-60s porque el free tier se duerme.

---

## Paso 3: Vercel (Frontend)

1. Ve a [vercel.com](https://vercel.com) → Sign Up con GitHub
2. **Add New** → **Project**
3. Selecciona tu repo
4. Configura:

| Campo | Valor |
|-------|-------|
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `.next` |

5. **Environment Variables:**

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://novedades-api.onrender.com` |
| `NEXT_PUBLIC_APP_NAME` | `GestionNovedades` |

6. Click **Deploy**

Vercel te da una URL: `https://novedades-frontend.vercel.app`

---

## Paso 4: Actualizar CORS en Render

Después del deploy de Vercel, actualiza `FRONTEND_URL` en Render:

1. Render Dashboard → `novedades-api` → **Environment**
2. Edita `FRONTEND_URL` → `https://novedades-frontend.vercel.app`
3. Render reinicia automáticamente

---

## Paso 5: Probar

```bash
# Login
curl -X POST https://novedades-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@novedades.com","password":"admin123"}'

# O simplemente abre en el navegador:
# https://novedades-frontend.vercel.app
```

Credenciales: `admin@novedades.com` / `admin123`

---

## Mantener el backend despierto (opcional)

Render free tier duerme el servicio tras 15 min de inactividad. El primer request tarda ~30s.

Para mantenerlo activo, configura un cron job gratuito cada 10 min:

1. Ve a [cron-job.org](https://cron-job.org) (gratis)
2. Crea un cron: `GET https://novedades-api.onrender.com/api/health`
3. Cada 10 minutos

---

## URLs finales

| Servicio | URL |
|----------|-----|
| **Frontend** | `https://novedades-frontend.vercel.app` |
| **API** | `https://novedades-api.onrender.com` |
| **Health** | `https://novedades-api.onrender.com/api/health` |

---

## Solución de problemas

| Error | Solución |
|-------|----------|
| Render: `Cannot find module @prisma/client` | Asegúrate que `build` script incluye `prisma generate` |
| Render: `P1001: Can't reach database` | Verifica DATABASE_URL. Neon requiere `?sslmode=require` al final |
| Vercel: 404 en API calls | Verifica `NEXT_PUBLIC_API_URL` apunta a Render |
| CORS bloqueado | `FRONTEND_URL` en Render debe ser la URL exacta de Vercel |
| Primer request lento | Normal en free tier. El servicio estaba dormido |
| `prisma migrate` falla | Ejecuta la migración localmente primero y pushea la carpeta `migrations/` |
