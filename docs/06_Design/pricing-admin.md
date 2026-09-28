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

### 3.6 El margen es por relación (no global)

(26-09-2026, ADR-010 §35.)

- El margen es un **MONTO absoluto en S/ de la combinación planta+producto**
  (`plant_products.margin`), no una tasa ni un valor global: el paso del motor
  es `S = Q + margin`.
- **IGV y percepción siguen siendo globales** (configuración activa del tenant).
  `pricing_configurations.margin` queda solo como **default para relaciones
  nuevas** (el que propone el modal "Nueva relación" y el que aplica la
  importación si la fila no trae margen).
- Columna **Margen** en la matriz, entre "Por cada mayorista" y "Precio final":
  `S/ 0.1300`, con Tooltip "Margen que usa el motor para esta relación
  (importado de la columna R del Excel)".
- Precedencia del valor: **columna R del Excel** (importación) > **edición
  manual** en esta pantalla > margen guardado en la relación. Un margen editado
  a mano se **pisa** en la próxima importación, porque el Excel es la fuente de
  verdad.
- En la pantalla de importación, el margen por fila se muestra junto a la
  comparación con la columna V; si el valor de R difiere del vigente se resalta
  como "cambia".
- `0` **es un valor válido** (significa "sin margen", `S = Q`), distinto del
  "sin precio" del §3.2: el campo de margen no se trata como precio.

## 4. Pantalla: matriz de precios (`/precios`)

### 4.1 Cabecera

- Título "Precios" + descripción de la matriz.
- Acciones: **[Importar de Excel]** (enlace a `/precios/importar`) y
  **[Nueva relación]** (abre el modal de creación).
- **Exportar a Excel** (`GET /precios/exportar`, 200 con el archivo generado):
  una fila por relación con sus precios por mayorista y, entre el mejor precio y
  el precio final, la columna **Margen** (`S/ 0.1300`) que usó el motor. Exporta
  lo que el tenant ve con los filtros/permisos actuales; las relaciones dadas
  de baja lógicamente **no** se exportan (scope global `LogicalDelete`).

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
| Margen | `S/ 0.1300` — monto absoluto de la relación que usa el motor (`S = Q + margen`), ver §3.6 |
| Precio final | `final_price` en negrita + "Gana: <mayorista>" debajo; "—" sin precios |
| Estado | Tag Activo/Inactivo |
| Acciones | Switch activar-desactivar (visible) + botón "más" (`MoreOutlined`) que abre un `Dropdown` con Editar precios / Ver cálculo / Historial / — / Eliminar relación (solo dueño) |

- **Columna Acciones compacta (90 px, ancho fijo a la derecha)**: la celda
  lleva el `Switch` de estado **fuera** del menú — es la acción más frecuente
  y debe quedar a un clic — y un único botón de ícono `MoreOutlined` con
  Tooltip "Más acciones" que abre un `Dropdown` de antd. Así la columna se
  angosta de 230 px a 90 px y sigue admitiendo nuevas acciones sin volver a
  saturar la matriz.
- Contenido del menú (todos con ícono, en este orden):
  1. **Editar precios** → abre el modal de edición (§5).
  2. **Ver cálculo** → abre el modal de desglose (§4.4). Si la fila no tiene
     `calc` (sin precios) el ítem queda **deshabilitado** y muestra la pista
     corta "Sin cálculo" (no un tooltip, para no alargar el menú); no aparece
     la pista larga de §4.4 porque el ítem ya no es pulsable.
  3. **Historial** → abre el drawer de snapshots (§6).
  4. `type: 'divider'`.
  5. **Eliminar relación** → `danger: true`, solo si el usuario es `is_owner`;
     abre la confirmación de baja lógica (§8.1).
- El dispatcher es `onActionClick(row, key)`; cada ítem del menú reusa
  exactamente los mismos handlers que antes vivían como botones sueltos, por lo
  que no cambió ningún flujo: solo dónde se hace clic.
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
- Cada fila expone además **`margin`** (el monto en S/ de la relación, string
  decimal de 4) y la prop `config` incluye **`default_margin`** (el valor por
  defecto de `pricing_configurations.margin`, 0.1300). Ver §3.6.

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
- **Tabla** con: Planta, Producto, **Margen** (`S/ 0.1300`), Proveedor
  seleccionado y Precio final.
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
4. Campo **Margen** (`InputNumber`, `stringMode`, `precision={4}`,
   `prefix="S/"`, valor inicial `row.margin`): es el monto absoluto que usa el
   motor para esta relación (§3.6). A diferencia de los precios, aquí el `0` **sí
   es válido** (sin margen) y el campo es obligatorio. Validador propio:
   número `>= 0` con hasta 4 decimales (acepta coma). Al editarlo se
   refresca el preview (mismo debounce).
5. **Panel "Resultado del motor de cálculo"** debajo de los campos:
   - `idle/loading`: "Calculando..."
   - edición → **debounce 400 ms** → `POST /api/pricing/prices/preview`
     con `{ plant_product_id, margin, prices: [{wholesaler_id, price}] }` (el
     margen viaja para que el resultado sea el que se va a guardar, no el que
     está en la BD).
   - `ok`: el desglose completo con **fórmula** de los 6 pasos (mismo
     componente que "Ver cálculo"), con la etiqueta "Mejor precio", el
     ganador y la cadena P / Q / S / T / U / V. El paso S muestra el margen
     como `Margen S/ 0.1300` (monto absoluto, no porcentaje).
   - `empty` (no hay precios válidos): aviso.
   - `error`: aviso de fallo.
6. **[Guardar precios]** (`SubmitButton`): `POST /api/pricing/prices` con el
   lote completo (todos los mayoristas, incluidos los que quedaron vacíos →
   se guardan NULL) y el `margin`. El backend guarda el margen en la relación y
   recalcula en la misma transacción. Al finalizar la mutación Inertia recarga
   la página con flash de éxito y cierra el modal.

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
- Campo **Margen** (`InputNumber`, `stringMode`, `precision={4}`,
  `prefix="S/"`, valor inicial `config.default_margin` = 0.1300): monto
  absoluto que usará el motor para esta relación (§3.6). obligatorio, `>= 0`,
  hasta 4 decimales.
- `POST /api/pricing/relations` crea la relación (enviando `margin`) y vuelve a
  la matriz con flash. Si no se envía margen, la BD aplica su default `0.1300`
  (el servicio no consulta la configuración para no fallar con
  `no_active_configuration`; la UI sí lo envía).
- Si la relación ya existía **inactiva** o **dada de baja lógicamente**, la
  operación la **revive** (`is_active = 1`, `is_deleted = 0`) en lugar de
  insertar una fila nueva: el índice único
  `uq_plant_products_tenant_plant_product` no incluye `is_deleted`, así que no
  puede haber dos filas de la misma relación. Al revivir recupera **sus
  precios, su margen (si no se envía uno nuevo) y su historial** intactos. El
  flash es "Relación creada o reactivada correctamente".

## 8. Activar / Desactivar relación

- **Desactivar** pide confirmación (se conservan precios e historial).
- **Activar** es directo.
- Operación `PUT /api/pricing/relations/{plant_product}` con `{is_active}`.
- Desactivar **no** es eliminar: la fila sigue en la matriz (se puede ver con el
  filtro "Inactivos") y sigue contando como relación existente.

## 8.1 Eliminar relación (baja lógica) — solo el dueño

Acción por fila (ícono de papelera `danger` + Tooltip) en la columna
**Acciones**, visible **únicamente para el dueño** (`auth.user.is_owner`), como
la papelera de pedidos (ADR-011). Los demás usuarios ni ven el botón y el
backend responde **403** de todos modos.

- `DELETE /api/pricing/relations/{plant_product}` →
  `PriceApiController::destroyRelation`, que hace
  `abort_unless((bool) auth()->user()?->is_owner, 403)`.
- La eliminación es **lógica** (`plant_products.is_deleted = 1`, y además
  `is_active = 0`). **Nunca** es física: `wholesaler_prices` y
  `price_calculations` referencian la relación con `ON DELETE RESTRICT` y su
  contenido es histórico (ADR-010 §27/§28, sin CASCADE).
- **No se borra nada más**: los precios por mayorista y el historial de
  cálculos quedan intactos. La confirmación lo dice de forma explícita para que
  no se lea como un borrado destructivo.
- Efectos visibles: la fila desaparece de la matriz y del export a Excel (el
  scope global de `LogicalDelete` la excluye), y su historial deja de ser
  accesible desde la UI.
- El binding `{plant_product}` usa los global scopes, así que una relación ya
  dada de baja (o de otra organización) responde **404**: no se puede borrar dos
  veces ni reactivar desde la API.
- **Cómo recuperarla**: volver a crearla con el modal "Nueva relación"
  (misma planta + mismo producto) la revive con sus precios. No hay papelera de
  relaciones, igual que en los catálogos del panel.
- i18n: `delete_relation`, `delete_relation_confirm`,
  `delete_relation_warning`, `relation_deleted`.

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
POST /api/pricing/relations                → crear/revivir relación
PUT  /api/pricing/relations/{plant_product} → activar/desactivar
DELETE /api/pricing/relations/{plant_product} → baja lógica (solo is_owner)
GET  /api/pricing/relations/{plant_product}/history → snapshots (JSON)
```

### 9.2 Servicios

- `App\Services\Pricing\PricingAdminService`:
  - `activeConfiguration()`: configuración activa o `RuntimeException`.
  - `calculate(PlantProduct)` → `?PricingResult`.
  - `savePrice($pp, $wholesalerId, ?$price)`: upsert + recálculo + historial.
  - `savePrices($pp, array $prices, ?string $margin = null)`: lote completo, una
    transacción (margen opcional → se escribe en la relación antes de recalcular).
  - `preview($pp, array $prices, ?string $margin = null)`: filas editadas +
    precios vigentes no tocados → `PriceCalculator::resolve()` con el margen
    indicado o el vigente de la relación.
  - `createRelation($plantId, $productId, ?string $margin = null)`: busca con
    `withDeleted()` (inactiva o dada de baja) y la revive; crea solo si no
    existe. Con margen `null` en una relación **nueva** no se escribe la
    columna (la BD aplica `DEFAULT 0.1300`); en una **revivificada** se
    preserva el margen que tenía.
  - `normalizeMargin()`: `null`/vacío → `null`; coma → punto; exige numérico
    `>= 0`; devuelve string con 4 decimales (`number_format`).
  - `toggleRelation($pp, bool)`.
  - `deleteRelation($pp)`: transacción → `is_active = 0` + `delete()` (baja
    lógica). No toca `wholesaler_prices` ni `price_calculations`.
- Reutiliza: `PriceCalculator`, `PriceHistoryService::record()`,
  `PricingConfigurationService::active()`, `Decimal`.

### 9.3 Validación

- `prices.*.price`: `nullable|string|max:20`; los valores no numéricos, 0 o
  negativos se normalizan a NULL en `normalizePrice()`.
- `plant_id`/`product_id`/`wholesaler_id`: enteros + existencia scoped al
  tenant (404/error si no pertenece a la organización).
- Configuración inexistente → flash de error `no_active_configuration`.
- `DELETE relations/{plant_product}`: solo `is_owner` (403 en el resto). El
  modelo `PlantProduct` usa el trait `LogicalDelete` (scope global
  `is_deleted = 0`), por lo que el binding resuelve 404 para una relación dada
  de baja o de otra organización.
- `margin` (en `prices/preview`, `prices` y `relations`): `nullable|string|max:20`
  + regex `^\d{1,10}(\.\d{1,4})?$`. Acepta `0` (margen cero válido) y **no**
  admite negativos ni más de 4 decimales. En la importación, un margen no
  numérico o negativo marca el item con el error `invalid_margin` y no escribe
  nada.

### 9.4 Consumidores de `plant_products` y la baja lógica

Al añadir el scope global de `LogicalDelete`, todo consulta que deba ver
también las relaciones dadas de baja tiene que usar `withDeleted()`. Puntos
del código que lo hacen (y el porqué):

| Consumidor | Riesgo si no se usa `withDeleted()` |
|---|---|
| `OrderService::purchasePricesFor()` | Los pedidos con detalle de esa relación **perderían el precio de compra** (celda "—"). La relación dada de baja es un dato de referencia: sus precios siguen siendo válidos. |
| `PriceImportService::findOrRestoreRelation()` (usado por `confirm()`) | Intentaría insertar una segunda fila y fallaría con **duplicate key** (el único no incluye `is_deleted`). Debe revivir la existente. |
| `PriceImportService::catalogPreview()` (mapa de relaciones) | Ofrecería como "catálogo nuevo" una relación que en realidad ya existe. |
| `PricingAdminService::createRelation()` | Igual que la importación: duplicate key al volver a crear la misma planta+producto. |

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
- Acciones por fila: `actionMenuItems(row)` arma el `items` del `Dropdown`
  (usando `t('pricing.more_actions')` como `aria-label` del disparador
  `MoreOutlined` y `t('pricing.no_calc_short')` como pista del ítem sin
  cálculo) y `onActionClick(row, key)` hace el `switch` hacia los handlers
  existentes (`setEditRow`, `setCalcRow`, `setHistoryRow`, `doDeleteRelation`).
  El ícono del ítem se pasa como **elemento** (`<EditOutlined />`), nunca como
  componente crudo.
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
- E2E HTTP (script `verify_pricing_relation_delete.php`): **45/45** checks OK
  para la baja lógica de la relación. Cubre: (A) ciclo de vida sobre un par
  libre que el propio test crea — alta, 2 precios + historial, `DELETE` → 302,
  `is_deleted = 1` y `is_active = 0` en BD, **precios e historial intactos**,
  la fila desaparece de la matriz, `rows.total` vuelve al valor inicial, el
  export sigue 200, historial → 404, segundo `DELETE` → 404, `PUT is_active=1`
  → 404 sin alterar el estado, y al **volver a crear** la relación se reutiliza
  la **misma fila** (sin duplicate key) con sus precios e historial; (B) gate
  `is_owner`: un usuario temporal no-dueño entra a `/precios` (200) pero recibe
  **403** al eliminar, sin efecto en la BD; (C) regresión de `OrderService`: un
  pedido con detalle de la relación sigue mostrando su `purchase_price` con la
  relación dada de baja, y el estado original (incluido `is_active`) queda
  restaurado al final.
- E2E (script `verify_import_revives_deleted_relation.php`): **18/18** checks
  OK. Importa el archivo real `docs/files/Pedidos.xlsx` con la relación
  Callao/Diesel DB S50 **dada de baja** y comprueba que la importación la
  **revivifica** (mismo id, `is_deleted = 0`, `is_active = 1`), que no crea
  filas duplicadas ni duplicados `(tenant, planta, producto)`, que el preview no
  ofrece catálogos ya existentes, que el motor sigue cuadrando con el Excel
  (0 mismatches) y que el ROLLBACK devuelve la BD y el storage al estado
  inicial. Cubre el riesgo de duplicate key del §9.4.
- Regresiones sin novedad: `verify_pricing_admin.php` 18/18,
  `verify_pricing_calc_view.php` 16/16 y `verify_order_purchase_price.php`
  31/31.
- E2E del **margen por relación** (script `verify_pricing_margin_per_relation.php`,
  **51/51**): comprueba que el motor usa `plant_products.margin` y no el margen
  global (una fila con margen propio da un `sale_price` distinto), la
  resolución margen de la fila → default de `pricing_configurations` cuando la
  relación no trae override, la cadena P→V cuadrando con el margen propio, el
  `preview` y el `POST /api/pricing/prices` con `margin`, el recálculo +
  snapshot **solo por cambio de margen** (sin cambio de precio), el margen `0`
  como valor válido, la columna de margen en el export, y que la baja lógica +
  revivificación **conservan el margen**.
- E2E del **margen importado de la columna R** (script
  `verify_import_margin_from_excel.php`, archivo real `docs/files/Pedidos.xlsx`,
  **23/23**): cada item guarda el margen de su fila de R, la comparación con la
  columna V lo expone y sigue en **0 mismatches**, `confirm()` escribe R en la
  relación, las **filas sin precios no toman el 0 de relleno** de R (§3.6),
  reimportar los mismos datos **no duplica snapshots** (dedupe) y, tras editar
  un margen a mano, la importación lo **restaura** dejando un snapshot nuevo.
- E2E headless de la **columna Acciones** (script
  `pricing_actions_menu_test.mjs`, Edge + CDP sobre la app servida, Node
  `nvm v26.8.2`): **32/32** checks OK y consola limpia. Comprueba que cada fila
  tiene exactamente **1 botón "más" + 1 Switch visible** (ya no 5 botones
  sueltos), que la columna mide **90 px**, que el menú abre con los 4 ítems en
  orden (Editar precios / Ver cálculo / Historial / divider / Eliminar
  relación) todos con ícono, que solo el ítem de eliminar es `danger` y solo
  aparece por `is_owner`, que **"Ver cálculo" se habilita con `row.calc`** y en
  una fila sin cálculo queda `disabled` con la pista "Sin cálculo" mientras el
  resto de ítems siguen disponibles, y que cada ítem ejecuta su flujo real
  (modal de cálculo con desglose y margen, modal de edición con el campo de
  margen, drawer de historial que cierra, confirmación de borrado cancelada
  **sin tocar la BD** y la tabla con las mismas 15 filas). También valida que el
  `Switch` sigue siendo de un clic y que su cambio se cancela, y que no queda
  ningún desplegable abierto.
  Gotcha de antd v6 detectado aquí: el contenido del modal es
  **`.ant-modal-container`**, no `.ant-modal-content` (en v5); y en headless la
  transición CSS del `Drawer` no avanza sola — tras pulsar `.ant-drawer-close`
  hay que despachar `transitionend` sobre `.ant-drawer-content-wrapper` para
  comprobar que el panel queda en 0 px (el nodo raíz permanece en el DOM).
- Nota sobre los scripts de importación: `price_import_real_check.php` y
  `price_import_check.php` asumen una base **sin** datos de precios (afirman
  `Plant::count() === 2`, `PlantProduct::count() === 13`, 0 lotes y 0
  directorios en storage) y hoy fallan por esa línea base, no por un cambio de
  código: la BD de demo ya tiene los catálogos y precios de la importación
  real (7 plantas/productos/mayoristas, 16 relaciones, 18 precios, 13
  cálculos, 2 lotes con su archivo). Para validar el flujo de importación
  contra la base actual se usa `verify_import_revives_deleted_relation.php` o
  `verify_import_margin_from_excel.php` (comparan antes/después y hacen
  ROLLBACK).