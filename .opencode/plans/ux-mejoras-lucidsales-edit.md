# Plan: Mejoras UX - Página de edición de pedido LucidSales

**Archivo:** `frontend/app/lucidsales/[id]/page.js`

---

## Cambio 1: Eliminar campos País y Código postal

- Eliminar el `<div className="form-group">` de País (línea 709-711)
- Eliminar el `<div className="form-group">` de Código postal (línea 731-734)
- El campo País siempre es 47 (Colombia), no necesita input
- Código postal no se usa en Colombia
- El `form-grid` pasará de 12 campos a 10, mejor balance visual

---

## Cambio 2: Cotizador colapsable

**Estado actual:** Tarjeta full-width siempre visible

**Nuevo diseño:**
- Reemplazar la tarjeta entera por una barra compacta clickeable:
  ```
  ┌─────────────────────────────────────────┐
  │ Cotizar envío con Dropi ▼    [Cotizar]  │
  └─────────────────────────────────────────┘
  ```
- Al hacer clic en la barra → se despliega el contenido (cotizaciones)
- El botón "Cotizar" lanza la cotización y automáticamente despliega
- Al tener resultados, la barra muestra un resumen: `Cotizar envío ▲ · 2 cotizaciones`
- Si ya hay cotizaciones, no se pierden al colapsar (el estado persiste)

**Implementación:**
- Nuevo state: `const [showCotizador, setShowCotizador] = useState(false)`
- Barra header siempre visible (padding: 8px 12px)
- Contenido condicional: `{showCotizador && (...contenido actual...)}`
- `handleQuote` actualizado para hacer `setShowCotizador(true)` automáticamente

---

## Cambio 3: Inter Rapidísimo fusionado en Datos del pedido

**Problema:** Tarjeta separada de 20px padding con "Inter Rapidísimo", un botón y texto "Selecciona una ciudad primero". Ocupa ~100px de alto para prácticamente nada.

**Solución:** Mover el contenido dentro de la tarjeta "Datos del pedido" como una fila compacta debajo del título:

```
┌──────────────────────────────────────┐
│ Datos del pedido                     │
│ 🏢 IR: [Buscar oficina] Selecciona.. │  ← nueva fila inline
│                                      │
│ Estado │ Tipo pago │ Estado pago     │
│ ...                                  │
└──────────────────────────────────────┘
```

Cuando hay oficinas encontradas:
```
│ 🏢 IR: [Buscar] Oficina Principal · Dir · Tel [Usar] │
```

**Implementación:**
- Eliminar el `<div className="table-card">` de IR (líneas 742-782)
- Insertar una fila inline dentro de Datos del pedido, después del título y antes del form-grid
- Estilo: `display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--bg3); border-radius: 6px; margin-bottom: 12px; font-size: 12px`
- Reducir texto "Selecciona una ciudad primero" → "Selecciona una ciudad"

---

## Cambio 4: Panel de validación como overlay (no desplaza el layout)

**Problema actual:** El panel de validación tiene ~200 líneas de JSX con errores, advertencias, sugerencias, badges. Se inserta inline debajo del campo Dirección y empuja todo el contenido hacia abajo.

**Solución:** Mostrar el panel como un popover/overlay posicionado absolutamente debajo del campo Dirección, que flota sobre el contenido sin desplazarlo.

```
┌──────────────────────┐
│ Dirección [Validar]  │
│ ┌──────────────────┐ │  ← panel overlay flotante
│ │ Resultado 95/100 │ │
│ │ 📍 Dirección     │ │
│ │ exacta  🌍Google │ │
│ │ ✕ Error...       │ │
│ │ ⚠ Advertencia... │ │
│ │ Sugerencia [...] │ │
│ └──────────────────┘ │
└──────────────────────┘
   (el resto del layout NO se mueve)
```

**Implementación:**
- El contenedor padre del campo Dirección recibe `position: relative`
- El panel de validación recibe `position: absolute; top: 100%; left: 0; right: 0; z-index: 100; max-height: 350px; overflow-y: auto`
- Un overlay semitransparente detrás: al hacer clic fuera se cierra
- Mantener el botón ✕ para cerrar

---

## Cambio 5: Header sticky con Guardar siempre visible

**Problema:** El botón "Guardar cambios" está en el header que desaparece al hacer scroll.

**Solución:** Hacer el header sticky:
```css
position: sticky; top: 0; z-index: 50;
background: var(--bg);
padding-bottom: 12px;
border-bottom: 1px solid var(--border);
```

---

## Cambio 6: Indicador de campos modificados

**Problema:** No hay feedback visual de qué campos editó el usuario.

**Solución:** Al modificar un campo, su borde cambia a color acento:
- Nuevo state: `const [camposModificados, setCamposModificados] = useState(new Set())`
- `handleChange` modificado para agregar el campo al Set
- Cada input/select/textarea agrega `borderColor: camposModificados.has('Nombre') ? 'var(--accent)' : 'var(--border)'`
- Al guardar exitosamente, se limpia el Set
- El botón Guardar muestra contador: `Guardar cambios (3)`

---

## Orden de implementación

| Paso | Cambio | Complejidad |
|------|--------|-------------|
| 1 | Quitar País y Código postal | Baja |
| 2 | Panel validación como overlay | Media |
| 3 | IR fusionado en Datos pedido | Baja |
| 4 | Cotizador colapsable | Baja |
| 5 | Header sticky | Baja |
| 6 | Indicador de campos modificados | Media |
