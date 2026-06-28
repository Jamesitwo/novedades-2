# LucidSales API - Documentacion

**Base URL:** `https://panel.lucidsales.co/b/`

---

## 1. Autenticacion

El flujo de autenticacion tiene **2 pasos obligatorios**: login y activacion de tienda.

### 1.1 Login

```
POST https://panel.lucidsales.co/b/auth/login
Content-Type: application/json

{
    "email": "tu@email.com",
    "password": "tu_contraseña"
}
```

**Respuesta exitosa:**
```json
{
    "ok": true,
    "token": "eyJhbGciOiJI...",
    "id": 3755,
    "name": "Alberto Castaño",
    "rol": "admin",
    "idEmpresa": ["3234", "3682"],
    "email": "tu@email.com"
}
```

> Guarda este `token` para el paso 2.

### 1.2 Activar Tienda (OBLIGATORIO)

El token del login tiene `tiendaActiva` vacio. Debes activar una tienda para obtener un token funcional.

```
POST https://panel.lucidsales.co/b/auth/addShopId
Content-Type: application/json
x-token: <token_del_login>

{
    "id": 3682
}
```

**Respuesta exitosa:**
```json
{
    "ok": true,
    "token": "eyJhbGciOiJI...",
    "tiendaActiva": 3682,
    "rol": "1,2,3,4,5,6,7,8",
    "idEmpresa": ["3234", "3682"]
}
```

> **IMPORTANTE:** A partir de ahora usa SIEMPRE el `token` devuelto por `addShopId`, NO el del login. El token expira, si recibes 401 vuelve a hacer el login + addShopId.

### 1.3 Headers para endpoints autenticados

```
Content-Type: application/json
x-token: <token_de_addShopId>
```

---

## 2. Pedidos

### 2.1 Listar Pedidos

```
GET https://panel.lucidsales.co/b/pedidos/get-pedidos-light-data?idEmpresa=3682&page=1&itemsPerPage=50&search=&filters=%5B%5D
```

**Query params:**

| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `idEmpresa` | number | ID de la tienda |
| `page` | number | Pagina (empieza en 1) |
| `itemsPerPage` | number | Pedidos por pagina |
| `search` | string | Busqueda por texto |
| `filters` | string | JSON encodeado de filtros |

**Ejemplo filters:**
```json
[{"name":"date","searchValues":[],"sortOrder":"desc"}]
```

**Respuesta:**
```json
{
    "ok": true,
    "pedidos": [
        {
            "id": 3256175,
            "idPedido": 6106,
            "idEmpresa": 3682,
            "Nombre": "Alex",
            "Apellido": "Arteaga",
            "Movil": "+573046527684",
            "EstadoPedido": 0,
            "Total": "169900.00"
        }
    ],
    "totalRecords": 6126,
    "numPages": 62
}
```

### 2.2 Obtener Pedido por ID

```
GET https://panel.lucidsales.co/b/pedidos/get-pedido-by-id/3256175
```

Devuelve el pedido completo con `Observaciones` y `Json` como strings.

### 2.3 Actualizar Pedido

```
POST https://panel.lucidsales.co/b/pedidos/update
```

**Body:**
```json
{
    "id": 3256175,
    "idPedido": 6106,
    "idEmpresa": 3682,
    "Nombre": "Alex",
    "Apellido": "Arteaga",
    "NIT": "",
    "Correo": "",
    "Movil": "+573046527684",
    "Direccion": "Carrera 92#78b-02, Robledo aures",
    "verifiedAddress": "",
    "Pais": 47,
    "codigoPostal": "",
    "Departamento": 2,
    "Ciudad": 71,
    "Observaciones": "[{\"desc\":\"Pedido creado\",\"update\":\"2026-06-28T10:00:00\"}]",
    "EstadoPedido": 0,
    "Json": "[{\"product_id\":\"40242\",\"price\":169900,\"variations\":[],\"quantity\":1}]",
    "SubTotal": "169900.00",
    "CostoEnvio": "0.00",
    "Total": "169900.00",
    "TipoPago": 1,
    "EstadoPago": 0,
    "logistic": "",
    "Referencias": "Robledo aures"
}
```

**Tipos de datos correctos:**

| Campo | Tipo |
|-------|------|
| `id`, `idPedido`, `idEmpresa` | number (Int32) |
| `Pais`, `Departamento`, `Ciudad` | number (Int32) |
| `EstadoPedido`, `TipoPago`, `EstadoPago` | number (Int32) |
| `SubTotal`, `CostoEnvio`, `Total` | string |
| `Observaciones`, `Json` | string (JSON.stringify) |
| Resto de campos | string |

**Estados de pedido (`EstadoPedido`):**

| Valor | Estado |
|-------|--------|
| 0 | Pendiente |
| 1 | Cancelado |
| 2 | Completado |

**Respuesta:**
```json
{
    "ok": true,
    "msg": "Pedido actualizado"
}
```

### 2.4 Crear Pedido

```
POST https://panel.lucidsales.co/b/pedidos/create
```

**Body:**
```json
{
    "idEmpresa": 3682,
    "nombreCliente": "Alex",
    "apellidoCliente": "Arteaga",
    "emailCliente": "",
    "telefonoCliente": "+573046527684",
    "direccionCliente": "Carrera 92#78b-02",
    "ciudadCliente": 71,
    "departamentoCliente": 2,
    "paisCliente": 47,
    "codigoPostal": null,
    "nitCliente": "",
    "json": "[{\"product_id\":\"40242\",\"price\":169900,\"variations\":[],\"quantity\":1}]",
    "subTotal": 169900.00,
    "costoEnvio": 0,
    "total": 169900.00,
    "Referencias": "Robledo aures"
}
```

> **Nota:** `create` usa nombres de campo diferentes a `update` (ej: `nombreCliente` vs `Nombre`).

### 2.5 Cotizar Envio

```
POST https://panel.lucidsales.co/b/pedidos/quote/dropi
POST https://panel.lucidsales.co/b/pedidos/quote/envia
POST https://panel.lucidsales.co/b/pedidos/quote/hoko
POST https://panel.lucidsales.co/b/pedidos/quote/boxful
POST https://panel.lucidsales.co/b/pedidos/quote/venndelo
POST https://panel.lucidsales.co/b/pedidos/quote/99envios
```

### 2.6 Confirmar Integracion

```
POST https://panel.lucidsales.co/b/pedidos/integrations/confirm/rocket
POST https://panel.lucidsales.co/b/pedidos/integrations/confirm/venndelo
POST https://panel.lucidsales.co/b/pedidos/upload/hoko
```

### 2.7 Validar Direccion

```
POST https://panel.lucidsales.co/b/pedidos/validate-address
```

**Body:**
```json
{
    "direccion": "Carrera 92#78b-02",
    "ciudad": "71",
    "departamento": "2",
    "pais": "47"
}
```

### 2.8 Verificar si se Puede Subir Pedido

```
POST https://panel.lucidsales.co/b/pedidos/checkIfOrderCanBeUploaded
```

### 2.9 Datos de Filtros

```
GET https://panel.lucidsales.co/b/pedidos/get-filters-data?idEmpresa=3682
```

---

## 3. Productos

### 3.1 Listar Productos

```
POST https://panel.lucidsales.co/b/productos/getproductos

{
    "idEmpresa": 3682
}
```

### 3.2 Listar Productos Shopify

```
POST https://panel.lucidsales.co/b/productos/listProducts/shopify
```

### 3.3 Importar Productos Externos

```
POST https://panel.lucidsales.co/b/productos/import-external-products
```

---

## 4. Clientes

### 4.1 Listar Clientes

```
GET https://panel.lucidsales.co/b/clientes/getclientes
```

### 4.2 Obtener Integraciones

```
GET https://panel.lucidsales.co/b/clientes/getIntegrations
```

### 4.3 Actualizar Integracion

```
POST https://panel.lucidsales.co/b/clientes/updateIntegration/rocket
POST https://panel.lucidsales.co/b/clientes/updateIntegration/swayp
POST https://panel.lucidsales.co/b/clientes/updateIntegration/{nombre}
```

---

## 5. Utilidades (Publicos, sin auth)

### 5.1 Monedas

```
GET https://panel.lucidsales.co/b/currencies
```

**Respuesta:**
```json
[
    {"name":"Dolares","code":"USD","symbol":"$","decimals":2},
    {"name":"Pesos","code":"COP","symbol":"$","decimals":0}
]
```

### 5.2 Paises

```
GET https://panel.lucidsales.co/b/tools/getCountries
```

### 5.3 Estados/Departamentos

```
GET https://panel.lucidsales.co/b/tools/getCountryState?country=47
```

### 5.4 Ciudades

```
GET https://panel.lucidsales.co/b/tools/getStateCity?state=2
```

### 5.5 Cotizar Envio (Publico)

```
POST https://panel.lucidsales.co/b/tools/quote
```

### 5.6 Flujos de Bot

```
POST https://panel.lucidsales.co/b/tools/bot/flows
```

---

## 6. Negocio / Ajustes

```
POST https://panel.lucidsales.co/b/business/bot
POST https://panel.lucidsales.co/b/business/update
POST https://panel.lucidsales.co/b/ajustes/general
POST https://panel.lucidsales.co/b/ajustes/usuarios
POST https://panel.lucidsales.co/b/ajustes/integraciones
```

---

## 7. Usuarios

```
POST https://panel.lucidsales.co/b/users/create
POST https://panel.lucidsales.co/b/users/create-password
POST https://panel.lucidsales.co/b/users/reset-password
POST https://panel.lucidsales.co/b/users/submit-reset-password
GET  https://panel.lucidsales.co/b/users/show/{id}
```

---

## 8. Registro

```
POST https://panel.lucidsales.co/b/auth/register

{
    "name": "Nombre Tienda",
    "phone": "+573001234567",
    "country": "CO",
    "email": "tienda@email.com",
    "title": "Nombre",
    "password": "Contraseña123"
}
```

---

## 9. Errores Comunes

| Error | Causa | Solucion |
|-------|-------|----------|
| `No hay token` | Falta header `x-token` | Agrega el header |
| `No tienes permisos` | Tienda no activada | Ejecuta `addShopId` y usa el nuevo token |
| `Error inesperado` / 500 | Tipos de datos incorrectos | Revisa que `SubTotal` sea string, `Pais` sea numero |
| 401 Unauthorized | Token expirado | Vuelve a hacer login + addShopId |

---

## 10. Codigo Ejemplo (PowerShell)

```powershell
# Configuracion
$email = "pizdostore@gmail.com"
$password = "Pizdo9856712@"
$idTienda = 3682

# Paso 1: Login
$loginBody = @{ email = $email; password = $password } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "https://panel.lucidsales.co/b/auth/login" `
    -Method POST -Body $loginBody -ContentType "application/json"

# Paso 2: Activar tienda (NUEVO TOKEN)
$shopBody = @{ id = $idTienda } | ConvertTo-Json
$shop = Invoke-RestMethod -Uri "https://panel.lucidsales.co/b/auth/addShopId" `
    -Method POST -Body $shopBody -ContentType "application/json" `
    -Headers @{"x-token" = $login.token}
$token = $shop.token  # USAR ESTE TOKEN

# Paso 3: Usar la API
$headers = @{ "Content-Type" = "application/json"; "x-token" = $token }
$pedidos = Invoke-RestMethod -Uri "https://panel.lucidsales.co/b/pedidos/get-pedidos-light-data?idEmpresa=$idTienda&page=1&itemsPerPage=10" `
    -Headers $headers -Method GET
$pedidos.pedidos | Select id, idPedido, Nombre, EstadoPedido
```

---

## 11. Codigo Ejemplo (cURL)

```bash
# Paso 1: Login
TOKEN1=$(curl -s -X POST https://panel.lucidsales.co/b/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pizdostore@gmail.com","password":"Pizdo9856712@"}' | jq -r '.token')

# Paso 2: Activar tienda
TOKEN2=$(curl -s -X POST https://panel.lucidsales.co/b/auth/addShopId \
  -H "Content-Type: application/json" \
  -H "x-token: $TOKEN1" \
  -d '{"id":3682}' | jq -r '.token')

# Paso 3: Usar el TOKEN2 para todo
curl -s https://panel.lucidsales.co/b/pedidos/get-pedidos-light-data?idEmpresa=3682 \
  -H "x-token: $TOKEN2" | jq .
```

---

## 12. Integraciones Soportadas

`venndelo`, `dropi`, `hoko`, `rocket`, `easydrop`, `edrop`, `mastershop`, `aveonline`, `effi`, `boxful`, `shopify`, `swayp`, `easyecommerce`, `99envios`, `envia`

## 13. Paises Soportados

| ID | Codigo | Nombre |
|----|--------|--------|
| 47 | CO | Colombia |
| 142 | MX | Mexico |
| 10 | AR | Argentina |
| 43 | CL | Chile |
| 172 | PE | Peru |
| 63 | EC | Ecuador |
| 90 | GT | Guatemala |
| 169 | PA | Panama |
| 52 | CR | Costa Rica |
| 61 | DO | Republica Dominicana |
| 171 | PY | Paraguay |
| 237 | VE | Venezuela |
