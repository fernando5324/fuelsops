# Diseño UX/UI — Panel de administración de precios

Módulo del panel para **visualizar, editar y mantener** la relación entre
Planta+Producto y los precios por mayorista (modelo de ADR-010). Complementa
el flujo de importación desde Excel (que es la carga masiva) con la
administración puntual de cada relación.

## 1. Objetivo

Sertoco opera con un Excel de precios por mayorista que se importa al sistema
(ADR-010 Fases 5-7). El panel de precios da **control directo** sobre esa
matriz sin depender del Excel:

1. Mostrar por fila (planta+producto) el precio de cada mayorista.
2. Resaltar el **mejor precio** (el que gana el motor) y el **precio final**
   calculado por la cadena completa (`P → Q → S → T → U → V`).
3. Permitir **editar los precios** de una fila con **preview en vivo** del
   motor antes de guardar.
4. Consultar el **historial de cálculos** (snapshots append-only) de una
   relación.
5. **Activar/desactivar** relaciones y **crear nuevas** relaciones
   planta+producto.

Se conserva intacto el flujo de importación (`/precios/importar`).

## 2. Flujo general

```
Menú lateral → Precios (submenú)
   ├── Precios ────────────────► /precios
   └── Importar de Excel ──────► /precios/importar (existente)
```

```
/precios (matriz)
   │
   ├── click "Editar precios" (fila) ─► Modal: InputNumber por mayorista
   │        └── preview en vivo (debounce 400 ms, axios POST)
   │        └── [Guardar precios] = transacción: upsert + recálculo + snapshot
   │
   ├── click "Historial" (fila) ─► Drawer: tabla de snapshots (price_calculations)
   │
   ├── Switch activar/desactivar (fila) ─► PUT relations/{id}
   │
   └── [Nueva relación] ─► Modal: Planta + Producto ─► POST relations
```

## 3. Principios generales

### 3.1 Los montos son decimales, nunca float

Todos los montos se muestran con precisión de **4 decimales** (`S/ x.xxxx`),
formato `DECIMAL(12,4)` de las tablas. El motor (`PriceCalculator`) y el
snapshot trabajan con strings `bcmath`; la UI solo formatea con
`formatMoney(value, { digits: 4 })`.

### 3.2 "Sin precio" ≠ 0

Una celda vacía = **sin precio disponible** (NULL), nunca 0 (ADR-010 §24).
En el modal, dejar el campo vacío equivale a "sin precio"; escribir 0 se
normaliza a NULL al guardar y el preview lo ignora.

### 3.3 El preview no duplica el motor

El preview en vivo llama al backend (`POST /api/pricing/prices/preview`) que
reutiliza `PriceCalculator::resolve()`. Nunca se replica la cadena de cálculo
en JavaScript (single source of truth, ADR-010 §16-§17).

### 3.4 El guardado es transaccional y auditable

`PricingAdminService::savePrices()` ejecuta en transacción: upsert de
`wholesaler_prices`, recálculo con el motor y registro del snapshot en
`price_calculations` (con dedupe por cálculo idéntico). Un fallo no deja
estado a medias.

### 3.5 Multi-tenant

Todo consulta/escritura pasa por los global scopes de `BelongsToTenant`
(tenant activo del usuario). Acceder a una relación de otra organización da
404 (route-model binding).

## 4. Pantalla: matriz de precios (`/precios`)

### 4.1 Cabecera

- Título "Precios" + descripción de la matriz.
- Acciones: **[Importar de Excel]** (enlace a `/precios/importar`) y
  **[Nueva relación]** (abre el modal de creación).

### 4.2 Filtros (server-side)

- **Búsqueda textual** con debounce de 350 ms: coincide con nombre de
  planta, producto o mayorista.
- **Planta** (select), **Producto** (select) y **Estado** (solo
  activos/inactivos/todos).
- Paginación server-side (15 por página).

### 4.3 Tabla

Columnas:

| Columna | Contenido |
|---|---|
| Planta / Producto | fijas a la izquierda (scroll horizontal); la columna Planta agrupa por nombre (celda fusionada) |
| Por cada mayorista (dinámicas) | precio `S/x.xxxx`, **negrita verde** si es el ganador del motor (tooltip "Mejor precio"); "—" si no hay precio |
| Precio final | `final_price` en negrita + "Gana: <mayorista>" debajo; "—" sin precios |
| Estado | Tag Activo/Inactivo |
| Acciones | Editar precios / Historial (íconos + tooltip) / Switch activar-desactivar / **Ver cálculo** (ícono + tooltip) |

- Si no hay configuración activa del tenant, se muestra un `Alert` warning y
  la columna de precio final aparece "—".
- La columna **Planta** agrupa visualmente por celda fusionada (`rowSpan`
  calculado en el front sobre `rows.data`, que llega ordenado por
  `plant_id`): el nombre de la planta aparece una sola vez y abarca en
  vertical todos sus productos; el resto de columnas y su comportamiento
  (paginación, filtros, edición, historial, export) no cambian.
- La tabla **no cambia** por ADR-012: sigue siendo la vista compacta. El
  desglose del cálculo vive en superficies secundarias (modal por fila y
  drawer general) para no saturar la matriz. No existe un conmutador de modo
  de vista.
- El backend entrega en cada fila `calc` con el desglose completo del motor
  (mismas claves que `POST /api/pricing/prices/preview`, todas como strings
  decimales de 4): `best_price`, `rounded_price`, `winner_wholesaler_id`,
  `purchase_price`, `margin`, `igv_rate`, `perception_rate`, `sale_price`,
  `sale_price_with_igv`, `sale_price_with_perception` y `final_price`. Es un
  cambio aditivo: el export a Excel y las columnas existentes siguen usando
  las tres claves que ya usaban.

## 4.4 Modal: Ver cálculo (por fila) — ADR-012 nivel 2

Abierto desde el ícono de calculadora de la fila. No editable, es de solo
lectura.

- **Título**: "Cálculo de precio — <Planta> / <Producto>".
- Cabecera con el **menor precio** (menor de los precios válidos) y el
  **proveedor seleccionado** (ganador del desempate por `wholesaler_id` ASC).
- **Cadena de 6 pasos** en `Descriptions` bordered (una columna), cada uno con
  su valor en negrita y **debajo la operación que lo produjo** (ADR-012 §2):

  | Paso | Etiqueta | Fórmula mostrada |
  |---|---|---|
  | P | Precio redondeado | `REDONDEO(<mejor precio>, 4) = <P>` |
  | Q | Precio sin IGV | `<P> ÷ 1.1800 = <Q>` |
  | S | Subtotal | `<Q> + <margen> = <S>` |
  | T | Precio con IGV | `<S> × 1.1800 = <T>` |
  | U | Ajuste percepción | `<T> × 1.0100 = <U>` |
  | V | Precio final | `<U> = <V>` |

- Los factores (1.1800, 1.0100 y el margen) salen del **propio resultado** del
  motor (`igv_rate`, `perception_rate`, `margin`), no de valores fijos en el
  front: si cambia la configuración del tenant, la fórmula mostrada cambia con
  ella y sigue cuadrando con el valor.
- Al pie: "IGV 18.00% · Margen S/ 0.1300 · Percepción 1.00%". El margen se
  muestra como **monto absoluto** (lo que el motor suma a Q), no como
  porcentaje; IGV y percepción sí son tasas.
- Sin precios válidos en la fila → "Sin cálculo: no hay precios válidos para
  esta relación" y el ícono queda deshabilitado.

## 4.5 Drawer: Ver cálculos (general) — ADR-012 nivel 3

Abierto desde el botón **"Ver cálculos"** en la cabecera de la pantalla.

- Calculado sobre las **filas visibles** (filtros y página actuales), no sobre
  toda la BD: la cabecera indica "N fila(s) con cálculo de M fila(s)
  visibles" y un texto aclara el alcance. Así se revisa una actualización
  completa sin abrir 30 modales uno por uno (ADR-012 §3).
- **Tabla** con: Planta, Producto, Proveedor seleccionado y Precio final.
- Cada fila es **expandible** y muestra el mismo desglose de 6 pasos con
  fórmula que el modal por fila (versión `compact`, sin la cabecera de
  mejor precio/proveedor ni el pie de factores, que ya están en la fila).
- Ninguna fila visible con cálculo → aviso; el botón sigue disponible.

El desglose es un **componente compartido** (`CalculationBreakdown`): el
modal por fila, el drawer general, el preview del modal de edición y el
historial lo reutilizan, de modo que la fórmula se ve igual en todos los
lugares y no se duplica el marcado.

## 5. Modal: Editar precios

Abierto desde la fila. Contenido:

1. **Título**: "Editar precios — <Planta> / <Producto>".
2. Anuncio: "Deja el campo vacío para 'sin precio' (nunca 0)".
3. Un `InputNumber` con `stringMode` y `precision={4}`, `prefix="S/"` por
   **cada mayorista activo** del tenant (los precios iniciales vienen de la
   fila: `row.prices[wholesaler_id]`).
4. **Panel "Resultado del motor de cálculo"** debajo de los campos:
   - `idle/loading`: "Calculando..."
   - edición → **debounce 400 ms** → `POST /api/pricing/prices/preview`
     con `{ plant_product_id, prices: [{wholesaler_id, price}] }`.
   - `ok`: el desglose completo con **fórmula** de los 6 pasos (mismo
     componente que "Ver cálculo"), con la etiqueta "Mejor precio", el
     ganador y la cadena P / Q / S / T / U / V.
   - `empty` (no hay precios válidos): aviso.
   - `error`: aviso de fallo.
5. **[Guardar precios]** (`SubmitButton`): `POST /api/pricing/prices` con el
   lote completo (todos los mayoristas, incluidos los que quedaron vacíos →
   se guardan NULL). Al finalizar la mutación Inertia recarga la página con
   flash de éxito y cierra el modal.

Comportamiento del preview: si un mayorista deja de tener precio en el modal,
el motor lo descarta y usa solo los precios vigentes de la fila (los inputs
vacíos no se consideran). El resultado mostrado es siempre lo que el sistema
persistirá.

## 6. Drawer: Historial de precios

Abierto desde la fila:

- Se consulta el endpoint JSON `GET /api/pricing/relations/{id}/history`
  (axios) al abrir (loading mientras carga).
- **Tabla** con: Calculado el (dd/mm/yyyy), Mayorista ganador, Mejor precio,
  Precio final, Creado por.
- Cada fila es **expandible** para ver el desglose completo del snapshot
  (ADR-012): mejor precio, proveedor y la cadena P / Q / S / T / U / V **con
  la misma fórmula** que el modal "Ver cálculo". Los factores del snapshot
  (`inputs.igv_rate`, `inputs.margin`, `inputs.perception_rate`) son los que
  se usó en su día, así que la fórmula refleja el cálculo histórico real, no
  el de la configuración vigente.
- Vacío → "Aún no hay cálculos registrados para esta relación".

Los snapshots son append-only (no se editan ni borran; ADR-010 §28).

## 7. Modal: Nueva relación

- Selects **Planta** y **Producto** (lista de catálogos activos del tenant,
  obligatorios).
- `POST /api/pricing/relations` crea la relación (si ya existía inactiva, la
  reactiva) y vuelve a la matriz con flash.

## 8. Activar / Desactivar relación

- **Desactivar** pide confirmación (se conservan precios e historial).
- **Activar** es directo.
- Operación `PUT /api/pricing/relations/{plant_product}` con `{is_active}`.

## 9. Backend (resumen técnico)

### 9.1 Rutas (todas con auth, panel)

Vista:

```
GET /precios                       → pricing.admin  → PriceController@index
```

APIs (grupo `/api`, inglés — ADR-003):

```
POST /api/pricing/prices/preview           → preview del motor (JSON)
POST /api/pricing/prices                   → guardar lote de precios (bulk)
PUT  /api/pricing/prices/{wholesaler_price} → actualizar un precio (null = sin precio)
DELETE /api/pricing/prices/{wholesaler_price} → limpiar un precio (null)
POST /api/pricing/relations                → crear/reactivar relación
PUT  /api/pricing/relations/{plant_product} → activar/desactivar
GET  /api/pricing/relations/{plant_product}/history → snapshots (JSON)
```

### 9.2 Servicios

- `App\Services\Pricing\PricingAdminService`:
  - `activeConfiguration()`: configuración activa o `RuntimeException`.
  - `calculate(PlantProduct)` → `?PricingResult`.
  - `savePrice($pp, $wholesalerId, ?$price)`: upsert + recálculo + historial.
  - `savePrices($pp, array $prices)`: lote completo, una transacción.
  - `preview($pp, array $prices)`: filas editadas + precios vigentes no
    tocados → `PriceCalculator::resolve()`.
  - `createRelation($plantId, $productId)`: `firstOrCreate` + reactiva.
  - `toggleRelation($pp, bool)`.
- Reutiliza: `PriceCalculator`, `PriceHistoryService::record()`,
  `PricingConfigurationService::active()`, `Decimal`.

### 9.3 Validación

- `prices.*.price`: `nullable|string|max:20`; los valores no numéricos, 0 o
  negativos se normalizan a NULL en `normalizePrice()`.
- `plant_id`/`product_id`/`wholesaler_id`: enteros + existencia scoped al
  tenant (404/error si no pertenece a la organización).
- Configuración inexistente → flash de error `no_active_configuration`.

## 10. Frontend (resumen técnico)

- Página: `resources/js/Pages/Platform/Pricing/Index.jsx`.
- Service: `resources/js/Services/PricesAdmin.js` (rutas Inertia + axios).
- Menú: `PanelLayout.jsx` — "Precios" como **submenú** {Precios, Importar de
  Excel}; `openKeys` controlado para abrir el submenú al navegar a la sección.
- i18n: claves nuevas en `lang/es/pricing.php` (sección admin) + `menus.php`
  (`pricing_import`). ADR-012 añade su propio bloque (`show_calc`,
  `show_calcs_all`, `calc_title`, `calcs_title`, `calcs_hint`, `calcs_empty`,
  `calcs_count`, `no_calc_row`, `min_price`, `winner_wholesaler`,
  `calc_factors` y las fórmulas `formula_*`); los placeholders van como
  `:name` porque es lo que reemplaza `useTranslations`.
- Montos: `formatMoney(v, { digits: 4 })` (S/ es-PE, PEN).
- Componentes: `SubmitButton`, `PageHeader`, `App.useApp()` para flash/errors.
- `Components/Pricing/CalculationBreakdown.jsx`: componente de presentación
  (sin lógica de UI) con los 6 pasos y su fórmula. Props: `calc`,
  `wholesalerName`, `showHeader`, `compact`. Se reutiliza en las 4 superficies
  (modal por fila, drawer general, preview de edición e historial).

## 11. Verificación

- `npm run build` OK.
- E2E HTTP (script `verify_pricing_admin.php`): login real, `GET /precios`
  renderiza `Platform/Pricing/Index` con props (rows/wholesalers/config),
  preview devuelve el motor (Callao/Diésel → 23.1449), creación de relación,
  guardado bulk (upsert 2 precios), snapshot con best_price = mínimo,
  historial con registros, toggle desactivación y limpieza a seed.
- Resultado: 18/18 checks OK; base restaurada (13 plant_products / 18
  wholesaler_prices / 13 price_calculations).
- E2E HTTP (script `verify_pricing_calc_view.php`, **solo lectura**): 16/16
  checks OK para ADR-012. Comprueba que `GET /precios` sigue renderizando
  `Platform/Pricing/Index`, que las 13 filas con cálculo de las 15 visibles
  traen las **11 claves** del desglose (todas como string decimal), que la
  cadena P→V **cuadra con las fórmulas del motor** (reproduciendo bcmath a 12
  decimales con redondeo half-away-from-zero, igual que `Decimal::round`),
  que `V = U` y `P = REDONDEO(N, 4)`, que `final_price` y
  `winner_wholesaler_id` siguen disponibles para la tabla, que existen todas
  las claves i18n de ADR-012 (con placeholders `:name` y la nomenclatura
  P/Q/S/T/U/V) y que `GET /precios/exportar` sigue respondiendo 200. No
  escribe datos.