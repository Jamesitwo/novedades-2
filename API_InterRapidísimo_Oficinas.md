# API de Oficinas - Inter Rapidísimo

**Base URL:** `https://www3.interrapidisimo.com/Apicanalesventa/api/`

---

## Índice

1. [Ciudades](#1-ciudades)
2. [Oficina Principal por Ciudad](#2-oficina-principal-por-ciudad)
3. [Bodega Principal por Ciudad](#3-bodega-principal-por-ciudad)
4. [Oficinas Cercanas con Horarios](#4-oficinas-cercanas-con-horarios)
5. [Oficinas Cercanas Filtrado](#5-oficinas-cercanas-filtrado)
6. [Tipos de Horario](#6-tipos-de-horario)
7. [Días de la Semana](#7-días-de-la-semana)
8. [Día Actual](#8-día-actual)
9. [Servicios de un Centro](#9-servicios-de-un-centro)
10. [Fecha/Hora del Servidor](#10-fechahora-del-servidor)

---

## 1. Ciudades

Obtiene todas las ciudades disponibles.

```
GET /Ciudad_CV/ObtenerCiudades
```

**Respuesta:**
```json
[
  {
    "IdCiudad": "11001000",
    "Descripcion": "BOGOTA",
    "IdCentroServicioPrincipal": 1287,
    "PuntoPrincipal": null,
    "IdLocalidadRegionalAdm": 1,
    "DescripcionRegional": "RACOL/BOGOTA/CUND/CARRERA 30 # 7 - 45",
    "Departamento": "CUNDINAMARCA",
    "NombreCentroLogistico": "COL/BOGOTA/CUND/COL/OF. PRINC CALLE 18 # 65 A 03",
    "IdCentroLogistico": 1287
  }
]
```

**Ejemplo:**
```bash
curl -X GET "https://www3.interrapidisimo.com/Apicanalesventa/api/Ciudad_CV/ObtenerCiudades"
```

---

## 2. Oficina Principal por Ciudad

Obtiene la(s) oficina(s) principal(es) de una ciudad.

```
GET /CentroServicio_CV/ObtenerOficinaPrincipalCiudad?idCiudad={idCiudad}
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idCiudad` | string | Código de la ciudad (ej: `11001000`) |

**Respuesta:**
```json
[
  {
    "IdCentroServicio": 1295,
    "Nombre": "PTO/BOGOTA/CUND/COL/CRA 30 # 7 - 45",
    "Direccion": "CRA 30 # 7 - 45",
    "Barrio": "RICAURTE",
    "Telefono1": "3232554455",
    "Telefono2": "018000942777",
    "Latitud": 4.60831027,
    "Longitud": -74.9695319,
    "RecibeGiros": true,
    "PagaGiros": true,
    "PesoMaximo": 80.0,
    "ReclamaOficina": true,
    "MostrarenOficinaCercana": true,
    "Distancia": 8350.95,
    "Ciudad": {
      "IdCiudad": "11001000",
      "Descripcion": "BOGOTA",
      "Departamento": "CUNDINAMARCA"
    }
  }
]
```

**Ejemplo:**
```bash
curl -X GET "https://www3.interrapidisimo.com/Apicanalesventa/api/CentroServicio_CV/ObtenerOficinaPrincipalCiudad?idCiudad=11001000"
```

---

## 3. Bodega Principal por Ciudad

Obtiene la bodega principal de una ciudad.

```
GET /CentroServicio_CV/ObtenerBodegaPrincipalPorCiudad?idCiudad={idCiudad}
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idCiudad` | string | Código de la ciudad |

**Respuesta:**
```json
{
  "IdCentroServicio": 1287,
  "Tipo": "COL",
  "Nombre": "COL/BOGOTA/CUND/COL/OF. PRINC CALLE 18 # 65 A 03",
  "Direccion": "OF. PRINC CALLE 18 # 65 A 03",
  "Barrio": "MONTEVIDEO",
  "Telefono1": "3232554455",
  "Telefono2": "018000942777",
  "Latitud": 4.63853224,
  "Longitud": -74.1120385,
  "PesoMaximo": 150.0,
  "RecibeGiros": true,
  "PagaGiros": true
}
```

**Ejemplo:**
```bash
curl -X GET "https://www3.interrapidisimo.com/Apicanalesventa/api/CentroServicio_CV/ObtenerBodegaPrincipalPorCiudad?idCiudad=11001000"
```

---

## 4. Oficinas Cercanas con Horarios

Obtiene centros de servicio cercanos a una ubicación con sus horarios. Es el endpoint principal del buscador de oficinas.

```
POST /CentroServicio_CV/ObtenerCentrosServicioHorarios?lat={lat}&lng={lng}&idCiudad={idCiudad}
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `lat` | number | Latitud |
| `lng` | number | Longitud |
| `idCiudad` | string | Código de la ciudad |

**Body** (arreglo de filtros):
```json
[
  {
    "Id": 0,
    "NombreTabla": "CentroServicio",
    "Llaves": ["MostrarenOficinaCercana"],
    "Valores": [true],
    "Operador": ["="]
  }
]
```

### Filtros disponibles

| Id | NombreTabla | Llave | Valor | Operador | Propósito |
|----|-------------|-------|-------|----------|-----------|
| 0 | `CentroServicio` | `MostrarenOficinaCercana` | `true` | `=` | Solo oficinas visibles |
| 1 | `TipoServicio` | `Nombre` | `"Mensajeria"` | `=` | Envíos ≤5kg |
| 2 | `CentroServicio` | `PesoMaximo` | `5` | `>` | Carga >5kg |
| 3 | `TipoServicio` | `Nombre` | `"Internacional"` | `=` | Envíos internacionales |
| 4 | `CentroServicio` | `ReclamaOficina` | `true` | `=` | Retirar en oficina |
| 5 | `CentroServicio` | `RecibeGiros` | `true` | `=` | Hacer giro |
| 6 | `CentroServicio` | `PagaGiros` | `true` | `=` | Cobrar giro |
| 7 | `tipoHorario` | `Descripcion` | `"NORMAL"` | `=` | Horario normal |
| 8 | `tipoHorario` | `Descripcion` | `"CONTINUO"` | `=` | Horario continuo |
| 9 | `tipoHorario` | `Descripcion` | `"EXTENDIDO"` | `=` | Horario extendido |

### Respuesta

```json
{
  "value": [
    {
      "IdCentroServicio": 3642,
      "Tipo": "PTO",
      "Nombre": "PTO/BOGOTA/CUND/COL/TRANSVERSAL 94 # 80-69",
      "Direccion": "TRANSVERSAL 94 # 80-69",
      "Barrio": "QUIRIGUA",
      "Telefono1": "3173453532",
      "Latitud": 4.70670854,
      "Longitud": -74.10741213,
      "RecibeGiros": true,
      "PagaGiros": true,
      "PesoMaximo": 80.0,
      "Distancia": 3.95,
      "MostrarenOficinaCercana": true,
      "ReclamaOficina": false,
      "HorariosCentroServio": [
        {
          "DiaSemana": {
            "Id": 7,
            "Descripcion": "DOMINGO"
          },
          "Franjas": [
            {
              "IdFranja": 2,
              "IdTipoHorario": 2,
              "TipoHorario": {
                "IdTipoHorario": 2,
                "Descripcion": "CONTINUO"
              },
              "Horarios": [
                {
                  "IdHorarioCS": 46735,
                  "IdDia": 7,
                  "HoraInicio": 11,
                  "HoraFin": 17
                }
              ]
            }
          ]
        }
      ],
      "Ciudad": {
        "IdCiudad": "11001000",
        "Descripcion": "BOGOTA",
        "Departamento": "CUNDINAMARCA"
      }
    }
  ],
  "Count": 30
}
```

**Ejemplo con PowerShell:**
```powershell
$body = '[{"Id":0,"NombreTabla":"CentroServicio","Llaves":["MostrarenOficinaCercana"],"Valores":[true],"Operador":["="]}]'
Invoke-RestMethod -Uri "https://www3.interrapidisimo.com/Apicanalesventa/api/CentroServicio_CV/ObtenerCentrosServicioHorarios?lat=4.7110&lng=-74.0721&idCiudad=11001000" -Method POST -Body $body -ContentType "application/json"
```

**Ejemplo con curl:**
```bash
curl -X POST "https://www3.interrapidisimo.com/Apicanalesventa/api/CentroServicio_CV/ObtenerCentrosServicioHorarios?lat=4.7110&lng=-74.0721&idCiudad=11001000" \
  -H "Content-Type: application/json" \
  -d '[{"Id":0,"NombreTabla":"CentroServicio","Llaves":["MostrarenOficinaCercana"],"Valores":[true],"Operador":["="]}]'
```

---

## 5. Oficinas Cercanas Filtrado

Similar al anterior pero sin parámetros de ubicación.

```
POST /CentroServicio_CV/ObtenerCentrosServicioFiltrado
```

**Body:** Mismo formato de filtros que el endpoint anterior.

---

## 6. Tipos de Horario

Obtiene los tipos de horario disponibles.

```
GET /Tipohorario_CV/ObtenerTiposHorario
```

**Respuesta:**
```json
{
  "value": [
    { "IdTipoHorario": 1, "Descripcion": "NORMAL", "Estado": true },
    { "IdTipoHorario": 2, "Descripcion": "CONTINUO", "Estado": true },
    { "IdTipoHorario": 3, "Descripcion": "EXTENDIDO", "Estado": true }
  ],
  "Count": 3
}
```

---

## 7. Días de la Semana

Obtiene todos los días de la semana.

```
GET /DiaSemana_CV/ObtenerDiasSemana
```

**Respuesta:**
```json
{
  "value": [
    { "Id": 1, "Descripcion": "LUNES" },
    { "Id": 2, "Descripcion": "MARTES" },
    { "Id": 3, "Descripcion": "MIERCOLES" },
    { "Id": 4, "Descripcion": "JUEVES" },
    { "Id": 5, "Descripcion": "VIERNES" },
    { "Id": 6, "Descripcion": "SABADO" },
    { "Id": 7, "Descripcion": "DOMINGO" }
  ],
  "Count": 7
}
```

---

## 8. Día Actual

Obtiene el día de la semana actual según el servidor.

```
GET /DiaSemana_CV/ObtenerDiaSemanaActual
```

---

## 9. Servicios de un Centro

Obtiene los servicios ofrecidos por un centro de servicio específico.

```
GET /CentroServicioServicio_CV/ObtenerServiciosCentroServicio?idCentroServicio={id}&idDia={dia}&idTipoHorario={tipoHorario}
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `idCentroServicio` | number | ID del centro de servicio |
| `idDia` | number | ID del día (1-7) |
| `idTipoHorario` | number | ID del tipo de horario (1-3) |

---

## 10. Fecha/Hora del Servidor

Obtiene la fecha y hora actual del servidor.

```
GET /CentroServicio_CV/ObtenerFechaHoraServidor
```

**Respuesta:**
```
"28/06/2026 23:42:45"
```

---

## Seguridad

La API **no tiene autenticación**. No requiere headers de autorización, tokens, API keys ni ningún tipo de credencial. Todos los endpoints son públicos.

---

## Notas

- El endpoint `ObtenerCentrosServicioHorarios` responde con `405` si se usa `GET` — debe usarse `POST`.
- Las coordenadas en `ObtenerCentrosServicioHorarios` afectan el cálculo de distancia (`Distancia` en km) y el orden de resultados.
- El campo `IdCiudad` es string (ej: `"11001000"`), no número.
- `HorariosCentroServio` contiene los horarios por día y por franja (tipo de horario).
- `HoraInicio` y `HoraFin` en `Horarios` son números enteros (hora del día, 0-23).
