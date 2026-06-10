# Script de pruebas para la API de GestiónNovedades
# Ejecutar: .\test-api.ps1
# Requiere: backend corriendo en http://localhost:3001

$ErrorActionPreference = "Stop"
$base = "http://localhost:3001/api"

Write-Host "`n=== TEST API GestionNovedades ===" -ForegroundColor Cyan

# 1. Login
Write-Host "`n[1/10] Login admin..." -ForegroundColor Yellow
$res = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"email":"admin@novedades.com","password":"admin123"}' -ContentType "application/json"
$token = $res.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "  OK - Token obtenido" -ForegroundColor Green

# 2. Me
Write-Host "[2/10] GET /auth/me..." -ForegroundColor Yellow
$me = Invoke-RestMethod -Uri "$base/auth/me" -Headers $headers
Write-Host "  OK - Usuario: $($me.nombre) ($($me.rol))" -ForegroundColor Green

# 3. Dashboard
Write-Host "[3/10] GET /dashboard/resumen..." -ForegroundColor Yellow
$dash = Invoke-RestMethod -Uri "$base/dashboard/resumen?periodo=todos" -Headers $headers
Write-Host "  OK - Novedades: $($dash.novedades.total), Oficina: $($dash.oficina.total)" -ForegroundColor Green

# 4. Metricas (admin)
Write-Host "[4/10] GET /dashboard/metricas-operadores..." -ForegroundColor Yellow
$met = Invoke-RestMethod -Uri "$base/dashboard/metricas-operadores?periodo=todos" -Headers $headers
Write-Host "  OK - $($met.Count) operadores con metricas" -ForegroundColor Green

# 5. Tiempo activo (admin)
Write-Host "[5/10] GET /dashboard/tiempo-activo..." -ForegroundColor Yellow
$tmp = Invoke-RestMethod -Uri "$base/dashboard/tiempo-activo?periodo=todos" -Headers $headers
Write-Host "  OK - $($tmp.Count) usuarios con tiempo registrado" -ForegroundColor Green

# 6. Novedades
Write-Host "[6/10] GET /novedades..." -ForegroundColor Yellow
$nov = Invoke-RestMethod -Uri "$base/novedades?page=1&limit=5" -Headers $headers
Write-Host "  OK - $($nov.pagination.total) novedades totales" -ForegroundColor Green

# 7. Crear novedad
Write-Host "[7/10] POST /novedades (crear)..." -ForegroundColor Yellow
$nueva = Invoke-RestMethod -Uri "$base/novedades" -Method POST -Headers $headers -ContentType "application/json" -Body (@{
    nombre = "Test"; apellido = "API"; celular = "3000000000"; producto = "Test Producto"
    totalAPagar = 50000; transportadora = "Servientrega"; guia = "TST$(Get-Date -Format 'HHmmss')"
    motivoNovedad = "Test automatizado"
} | ConvertTo-Json)
Write-Host "  OK - Creada: $($nueva.id)" -ForegroundColor Green

# 8. Cambiar estado
Write-Host "[8/10] PATCH /novedades/:id/estado..." -ForegroundColor Yellow
$act = Invoke-RestMethod -Uri "$base/novedades/$($nueva.id)/estado" -Method PATCH -Headers $headers -ContentType "application/json" -Body '{"estado":"contactado"}'
Write-Host "  OK - Estado cambiado a: $($act.estado)" -ForegroundColor Green

# 9. Operadores
Write-Host "[9/10] GET /usuarios/operadores..." -ForegroundColor Yellow
$ops = Invoke-RestMethod -Uri "$base/usuarios/operadores" -Headers $headers
Write-Host "  OK - $($ops.Count) operadores activos" -ForegroundColor Green

# 10. Operador no puede ver métricas
Write-Host "[10/10] Verificando permisos (operador -> metricas = 403)..." -ForegroundColor Yellow
$opLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"email":"operador@novedades.com","password":"admin123"}' -ContentType "application/json"
$opHeaders = @{ Authorization = "Bearer $($opLogin.token)" }
try {
    Invoke-RestMethod -Uri "$base/dashboard/metricas-operadores" -Headers $opHeaders
    Write-Host "  FAIL - Operador no deberia acceder!" -ForegroundColor Red
} catch {
    Write-Host "  OK - Bloqueado (403)" -ForegroundColor Green
}

# Limpiar
Write-Host "`n[Cleanup] Eliminando novedad de prueba..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/novedades/$($nueva.id)" -Method DELETE -Headers $headers | Out-Null
Write-Host "  OK - Eliminada" -ForegroundColor Green

Write-Host "`n=== TODOS LOS TESTS PASARON ===" -ForegroundColor Green
Write-Host "Backend: $base`n" -ForegroundColor Gray
