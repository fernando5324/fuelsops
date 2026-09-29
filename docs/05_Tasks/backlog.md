# Backlog de Tareas

Backlog granular del proyecto Sertoco, derivado de `docs/04_Roadmap/roadmap.md`
y de las decisiones registradas en `docs/03_Decisions/`.

Convenciones de estados, prioridades y formato: ver `README.md` de esta
misma carpeta.

## Estado general

| Fase/Flujo | Estado |
|------------|--------|
| A. Base de datos y arquitectura | Completado: esquema, auditoría, estados, semillas, modelos Eloquent (Auditable/LogicalDelete), traducciones es y SQL-run implementados. Pendiente: revisión con datos reales (T-009). Política de cambios: los esquemas se aplican directo sobre `sertocobd` y se reflejan en `database.sql` (SCHEMA_UPDATES.sql eliminado); restablecer la BD exige OK del usuario. `orders.order_date` es DATETIME (fecha + hora, America/Lima) |
| B. Formulario público           | Completado (verificado E2E por HTTP); pendiente anti-spam (T-031) pleno. Rediseño ADR-006 aplicado y refinado: header público con logo + pill de conexión, **5 secciones exactas de la referencia** (Información general, Datos del chofer, Datos del vehículo, Detalle del pedido, Observaciones del pedido) con encabezados numerados y Resumen del pedido destacado (azul informativo + monto venta en naranja), CTA "Registrar pedido" con estado "Registrando pedido...", tabla de productos responsive (tabla desktop / tarjetas móvil) con numeración automática, eliminar por ícono + aria-label, `prefix="S/"` en precio, autocompletado licencia→conductor y RUC→cliente (`POST /orders/lookup-customer`), scroll al primer error + `validation_summary` |
| C. Panel interno (Ant Design)   | Completado: login/registro, layout, dashboard, pedidos, estado+historial, adjuntos, usuarios, perfil (solo accesible desde el dropdown del nombre, ya no en el menú) y auth legacy migrado a antd. Breeze/Tailwind eliminado. Fechas `dd/mm/yyyy` (pedidos con `hh:mm:ss`) en America/Lima. Rediseño ADR-006 aplicado y refinado: paleta institucional, logo real en el sidebar, acciones de tabla solo con íconos + Tooltip (Ver/Editar/Eliminar), filtros responsive y Drawer de inspección. Listados sin Card (`.ui-list-section`) y título por página vía `PageHeader` (PanelLayout sin `title`) |
| D. Catálogos y estados          | Completado: CRUD de los 9 módulos + activo/inactivo en el panel. Arquitectura ADR-009/ADR-064 aplicada: cada módulo compone los traits `HasIndexPage`/`HasCrudActions` (+ `Service` backend opcional), rutas/APIs en inglés (`/api/*`, `orders/*/status|detail`, lookups `/orders/lookup-*`, sin `Route::resource`) y front via `Utils/Ajax.js` + un Service por módulo en `resources/js/Services/` (registro `catalogServices`); página genérica en `Platform/Shared/Index.jsx` |
| E. Validaciones y reglas        | Pendiente de confirmación con Sertoco |
| F. Integraciones externas       | Backlog (futuro) |
| G. Reportes y mejoras           | No iniciado |
| H. Módulo de precios (ADR-010)  | Completado (Fases 1-7 + Fase 8 panel, verificado E2E sin residuos): modelo de datos (6 tablas, secciones 13-18 de `database.sql`), configuración sembrada, motor bcmath (`PriceCalculator` pasos 1-10 + `PricingResult`/`Decimal`/`PriceHistoryService`), **importación desde Excel** (`PricesImport` + `PriceImportService` upload/preview/confirm/cancel, `Platform/Pricing/PriceImportController`, `lang/es/pricing.php`, rutas `/precios/importar`, front `Platform/Pricing/Import.jsx` con catálogos nuevos por checkboxes y comparación Excel vs motor, menú "Precios") y **panel de administración** (`Platform/Pricing/PriceController` + `PriceApiController`, `PricingAdminService`, matriz en `Platform/Pricing/Index.jsx` con edición por modal + preview en vivo del motor, drawer de historial `price_calculations`, nueva relación y activar/desactivar; APIs `/api/pricing/*`; submenú Precios {Precios, Importar de Excel}; verificación E2E 18/18). Validado con el archivo real `docs/files/Pedidos.xlsx` (doble encabezado, plantas combinadas, motor == Excel con 0 mismatches). Pendiente: integración de `wholesaler_prices` con cotizaciones/pedidos (fuera de alcance, ADR-010 §32) y tablas de precios por cliente en el Excel final de Sertoco (§24-§26). Ver notas de implementación ADR-010 §33-§34 |

---

## A. Base de datos y arquitectura (Roadmap Fase 1)

- [x] T-001 — Identificar el flujo principal de pedido. (roadmap.md Fase 1)
- [x] T-002 — Identificar entidades de catálogo. (ADR-001)
- [x] T-003 — Separar clientes, conductores y vehículos de los pedidos. (ADR-001)
- [x] T-004 — Definir pedidos (orders) y detalles de pedido (order_details). (ADR-001, database_design.md)
- [x] T-005 — Definir adjuntos de pedido (media_files). (ADR-001)
- [x] T-006 — Definir cálculos provisionales de totales. (ADR-001, database.sql)
- [x] T-007 — Definir flujo público → interno y modelo de estados. (ADR-004)
- [x] T-008 — Definir convención de campos de auditoría y usuario sistema. (ADR-005)

- [ ] T-009 — Revisar el SQL con los datos reales de Sertoco.
    - Prioridad: Alta
    - Fase: A
    - Dependencias: ninguna
    - Referencias: `docs/02_Database/database.sql`, ADR-001
    - Criterio de aceptación: el esquema SQL es validado con ejemplos
      reales y se corrigen inconsistencias detectadas.

- [x] T-010 — Aplicar convención de auditoría e `is_deleted` en `database.sql`.
    - Prioridad: Alta
    - Fase: A
    - Dependencias: T-008
    - Referencias: `database.sql`, ADR-005
    - Criterio de aceptación: todas las tablas de negocio tienen
      `created_at`, `updated_at` (TimeZone 0), `created_by`, `updated_by`;
      los módulos principales y entidades maestras llevan `is_deleted`;
      los catálogos simples no.

- [x] T-011 — Agregar tablas `order_statuses` y `order_status_history`.
    - Prioridad: Alta
    - Fase: A
    - Dependencias: T-007
    - Referencias: `database.sql`, ADR-004
    - Criterio de aceptación: catálogo de estados extensible (sin ENUM),
      FK `orders.status_id` y tabla de historial con estado anterior,
      nuevo, usuario y fecha.

- [x] T-012 — Agregar estados iniciales y usuario "sistema" como seed.
    - Prioridad: Alta
    - Fase: A
    - Dependencias: T-011
    - Referencias: ADR-004, ADR-005
    - Criterio de aceptación: semilla con `Pendiente` (por defecto),
      `Atendido`, `Anulado` y usuario `sistema` para el formulario público.

- [x] T-013 — Definir semillas de catálogos iniciales (asesores, plantas,
      mayoristas, productos).
    - Prioridad: Media
    - Fase: A
    - Dependencias: T-012
    - Referencias: roadmap.md Fase 1
    - Criterio de aceptación: datos iniciales cargados con `created_by = usuario sistema`.
      Implementado en `docs/02_Database/SEEDS.sql` y aplicado con `php artisan sql:run`.

- [x] T-014 — Crear modelos Eloquent para las entidades de negocio.
    - Prioridad: Media
    - Fase: A
    - Dependencias: T-010
    - Referencias: ADR-064
    - Criterio de aceptación: modelos con castings, soft deletes
      (`is_deleted`) en módulos principales y relaciones documentadas.
      Implementado con los traits `Auditable` y `LogicalDelete`
      (app/Models/Concerns) y 13 modelos.

- [x] T-015 — Configurar `HandleInertiaRequests` para exponer datos globales
      (traducciones del panel, usuario actual, configuración).
    - Prioridad: Media
    - Fase: A
    - Dependencias: ninguna
    - Referencias: ADR-062
    - Criterio de aceptación: el panel consume traducciones centralizadas.
      Implementado: `flag_translations`, `strict` y se comparte `flash`;

---

## B. Formulario público de registro de pedidos (Roadmap Fase 2)

El formulario es público (sin login). Al guardar crea la orden con
estado `Pendiente` por defecto.

- [ ] T-020 — Definir especificación del formulario público (campos, flujo
      y mensajes).
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-007, T-009
    - Referencias: ADR-004
    - Criterio de aceptación: documento de especificación aprobado por Sertoco.
      Nota: implementación hecha y verificada E2E; falta validación/ajuste con Sertoco.

- [x] T-021 — Crear ruta pública del formulario (sin middleware auth).
    - Prioridad: Alta
    - Fase: B
    - Dependencias: ninguna
    - Referencias: routes/web.php
    - Criterio de aceptación: se accede al formulario sin iniciar sesión.

- [x] T-022 — Diseñar layout del formulario público (estilo claro e
      intuitivo, con su propio layout independiente del panel).
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-021
    - Referencias: ADR-062
    - Criterio de aceptación: layout responsive, limpio y validado.

- [x] T-023 — Cargar catálogos en el formulario (asesores, plantas,
      mayoristas, productos).
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-010, T-013
    - Criterio de aceptación: selects alimentados con registros activos.

- [x] T-024 — Registro de cliente: reutilizar por RUC o crear si no existe.
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-010
    - Referencias: `customers.tax_id` única, ADR-004
    - Criterio de aceptación: si el RUC ya existe se vincula el cliente al
      pedido; si no, se crea y se vincula. Verificado E2E: RUC existente
      reutilizado (id 3) en la orden HTTP de prueba.

- [x] T-025 — Seleccionar conductor (por licencia) y vehículos (tankera +
      tractora).
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-010
    - Criterio de aceptación: selección válida con reglas según vehículos activos.

- [x] T-026 — Filas dinámicas de detalle (agregar/eliminar).
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-023
    - Criterio de aceptación: agregar/quitar líneas SCOP + plant + mayorista +
      producto + galones + precio + compartimentos.

- [x] T-027 — Calcular totales provisionales en vivo.
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-026
    - Referencias: database_design.md (cálculo provisional, ADR-001)
    - Criterio de aceptación: `detail_total = gallons * sale_price`,
      `total_gallons` y `total_sale` actualizados al editar.

- [x] T-028 — Validar y guardar pedido (transacción orden + detalles) con
      estado `Pendiente`.
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-024, T-025, T-026
    - Criterio de aceptación: pedido y detalles persistidos en una sola
      transacción con `created_by = usuario sistema`. Implementado en
      `OrderService::create` y verificado por HTTP (orden 4 creada).

- [x] T-029 — Subida de factura/comprobante en el formulario público.
    - Prioridad: Alta
    - Fase: B
    - Dependencias: T-028
    - Referencias: `media_files`, ADR-001
    - Criterio de aceptación: archivo almacenado y registrado en `media_files`
      vinculado al pedido; visibilidad privada. Implementado en
      `MediaService`, disco `local` (storage/app/private).

- [x] T-030 — Mensaje de confirmación y manejo de errores en el formulario.
    - Prioridad: Media
    - Fase: B
    - Dependencias: T-028
    - Criterio de aceptación: feedback claro al cliente final y control de
      duplicados (reintento seguro). Página `/pedidos/{order}/confirmado`
      con flash y reintento seguro por id único.

- [ ] T-031 — Control anti-spam / limitaciones del envío público.
    - Prioridad: Media
    - Fase: B
    - Dependencias: T-028
    - Criterio de aceptación: protección básica definida (tiempo entre
      envíos, token, captcha opcional).

---

## C. Panel interno (login + Ant Design)

Todo el panel autenticado se construye con Ant Design.

- [x] T-040 — Integrar Ant Design al proyecto (dependencias y ConfigProvider).
    - Prioridad: Alta
    - Fase: C
    - Dependencias: ninguna
    - Referencias: ADR-064
    - Criterio de aceptación: `antd` instalado, tema claro y locale es_ES.

- [x] T-041 — Sistema de traducciones del panel (español inicial).
    - Prioridad: Media
    - Fase: C
    - Dependencias: T-015
    - Referencias: ADR-062
    - Criterio de aceptación: textos del panel centralizados en `lang/es/`.
      Implementado también `resources/js/i18n.js` (fallback del front).
      Con la fuente única (T-041 revisado): `resources/js/i18n.js` fue
      eliminado; el backend comparte en cada Inertia page las props
      `translations` (todos los grupos de `lang/es/*.php`, incluidos los
      nuevos `profile.php`, `pages.php`, `tiptap.php` y `services.php`) y
      `locale` vía `HandleInertiaRequests`. El front consume el hook
      `useTranslations` (lookup anidado por punto, fallback = clave cruda,
      soporte `replace` y `locale`) en todos los componentes y páginas del
      panel y flujo público; los botones de guardar/enviar usan el
      componente `SubmitButton` (anti doble clic por `processing` global).

- [x] T-042 — Página de login con Ant Design.
    - Prioridad: Alta
    - Fase: C
    - Dependencias: T-040
    - Criterio de aceptación: login funcional con validación y mensajes claros.
      Verificado por HTTP (login real → /panel).

- [x] T-043 — Layout del panel interno con Ant Design (menú lateral,
      topbar, contenido).
    - Prioridad: Alta
    - Fase: C
    - Dependencias: T-040
    - Criterio de aceptación: navegación a pedidos, catálogos y perfil.
    - Nota 2026-09-19: bug visual de render en el menú lateral subsanado — los
      íconos de los ítems de catálogo se pasaban como componentes forwardRef
      (objeto `{$$typeof, render}`) en lugar de elementos JSX, lo que hacía
      fallar todas las páginas del panel en cliente (`Objects are not valid as
      a React child`). `iconFor()` ahora devuelve `<Icon />`. Verificado por
      navegador headless real: login → `/panel` renderiza sin excepciones de
      consola.

- [x] T-044 — Dashboard del panel interno.
    - Prioridad: Media
    - Fase: C
    - Dependencias: T-043
    - Criterio de aceptación: resumen de pedidos por estado y accesos directos.

- [x] T-045 — Listado de pedidos (tabla con filtros y paginación).
    - Prioridad: Alta
    - Fase: C
    - Dependencias: T-043
    - Criterio de aceptación: listado con búsqueda por cliente/RUC/placa y
      filtro por estado/asesor/fecha. La paginación y filtros básicos están;
      la búsqueda avanzada queda para la Fase G (T-092).

- [x] T-046 — Vista de detalle de pedido.
    - Prioridad: Alta
    - Fase: C
    - Dependencias: T-045
    - Criterio de aceptación: muestra datos del pedido, detalles, totales,
      auditoría y archivos adjuntos. Verificado por HTTP (/pedidos/4 → 200).

- [x] T-047 — Cambio de estado de pedido (Atendido/Anulado) con historial.
    - Prioridad: Alta
    - Fase: C
    - Dependencias: T-046, T-011
    - Referencias: ADR-004
    - Criterio de aceptación: al cambiar estado se registra fila en
      `order_status_history` con usuario y fecha; no se permite volver a un
      estado anulado sin regla definida. Historial verificado (3 filas).
      La regla exacta de transiciones queda en la Fase E con Sertoco.

- [x] T-048 — Visualización y gestión de archivos adjuntos en el panel.
    - Prioridad: Media
    - Fase: C
    - Dependencias: T-046
    - Referencias: `media_files`, ADR-001
    - Criterio de aceptación: descargar/previsualizar facturas y comprobantes
      con acceso autorizado. Descarga verificada por HTTP (/archivos/1/descargar → 200).

- [x] T-049 — Gestión de usuarios internos (CRUD y roles básicos).
    - Prioridad: Media
    - Fase: C
    - Dependencias: T-043
    - Referencias: `users` (is_owner, is_active)
    - Criterio de aceptación: alta/baja de usuarios y control de accesos.

- [x] T-050 — Migrar/portar páginas de perfil y auth al panel Ant Design.
    - Prioridad: Baja
    - Fase: C
    - Dependencias: T-040
    - Criterio de aceptación: consistencia visual total del panel.
      Nota: perfil ya está en Ant Design; las últimas páginas Breeze
      (verificación/recuperación/confirmación de contraseña) fueron migradas
      a antd con `Layouts/AuthLayout.jsx` y se eliminó por completo el
      código Breeze/Tailwind restante (layouts `GuestLayout`/
      `AuthenticatedLayout`, `Pages/Dashboard.jsx` huérfano y los 12
      componentes Breeze sin uso).

---

## C1. UI/UX — Rediseño de formulario público y panel (ADR-006)

Rediseño integral según `docs/03_Decisions/ADR-006.md` (Aceptado e
Implementado el 19-09-2026): paleta institucional, header público, 2 tarjetas
en el formulario, panel con columnas de placas/galones/monto, filtros y Drawer
de inspección. Sin cambios de esquema de BD: los totales se calculan con
`withSum`.

Iteración de rediseño del 21-09-2026 (T-054): el formulario público adoptó
**exactamente las 5 secciones de la referencia** (Información general, Datos
del chofer, Datos del vehículo, Detalle del pedido, Observaciones del pedido)
con encabezados numerados, tabla de productos responsive (tabla en desktop /
tarjetas en móvil), autocompletado conductor (licencia→nombre) y cliente
(RUC→nombre vía endpoint público aditivo). Ver nota de implementación en
`docs/03_Decisions/ADR-006.md` (sección 52).

- [x] T-051 — Paleta y tokens de diseño globales (ADR-006).
    - Prioridad: Alta
    - Fase: C1 (ADR-006)
    - Dependencias: ninguna
    - Referencias: `resources/js/app.jsx`, `resources/css/app.css`, ADR-006
    - Criterio de aceptación: `ConfigProvider` con primario `#1B3A6B`,
      `colorBgLayout #F8FAFC`, `colorFillAlter #F1F5F9` (header de tablas),
      `borderRadius 8`; clases `.ui-accent-btn`, `.ui-total`, `.ui-pill`,
      `.ui-autocomplete-tag`. Verificado por build y navegador headless.

- [x] T-052 — Header público y agrupación del formulario (ADR-006).
    - Prioridad: Alta
    - Fase: C1 (ADR-006)
    - Dependencias: T-051
    - Referencias: `resources/js/Components/PublicHeader.jsx`,
      `resources/js/Pages/Public/Orders/{Create,Confirmed}.jsx`, ADR-006
    - Criterio de aceptación: fondo `#F8FAFC`, header blanco con logo y pill
      "En línea/Sin conexión"; formulario en 2 tarjetas (operación +
      transporte + detalle de carga / observaciones 60% + resumen 40%);
      tag "(Autocompletado)"; "+ Agregar fila" naranja secundario; submit
      `.ui-accent-btn` centrado (máx. 400px). Montos en S/ (`es-PE`).
      Verificado por headless a 375px sin desbordes.

- [x] T-053 — Panel de pedidos: columnas, filtros y Drawer de inspección (ADR-006).
    - Prioridad: Alta
    - Fase: C1 (ADR-006)
    - Dependencias: T-051
    - Referencias: `resources/js/Pages/Platform/Orders/{Index,Show}.jsx`,
      `resources/js/Components/OrderInspection.jsx`,
      `app/Http/Controllers/Platform/Orders/{OrderController,OrderApiController}.php`,
      `routes/web.php`, ADR-006
    - Criterio de aceptación: columnas Cliente (RUC), Conductor con placas,
      Galones y Monto Total (S/); badges por código (`pending`→ámbar,
      `attended`→verde); filtros de búsqueda (RUC/cliente/placa), rango de
      fechas y asesor; clic en fila abre un Drawer solo lectura alimentado
      por el endpoint JSON nuevo `GET /pedidos/{order}/detalle`. La página
      `Show` se conserva para el cambio de estado. Verificado por headless.

- [x] T-054 — Formulario público: 5 secciones de la referencia + autocompletado.
    - Prioridad: Alta
    - Fase: C1 (ADR-006)
    - Dependencias: T-051, T-052
    - Referencias: `resources/js/Pages/Public/Orders/{Create,Confirmed}.jsx`,
      `resources/js/Components/SectionCard.jsx`,
      `app/Http/Controllers/Public/OrderController.php`, `routes/web.php`,
      `resources/css/app.css`, `lang/es/order.php`, ADR-006 (sección 52)
    - Criterio de aceptación: formulario con las 5 secciones exactas de la
      referencia y encabezados numerados (1–5) + Resumen del pedido; Datos del
      chofer con licencia (select buscable) que autocompleta el nombre;
      cisterna/tracto como selects; tabla de productos con encabezado real en
      desktop y tarjetas en móvil; RUC consulta `POST /pedidos/consulta-cliente`
      (`throttle:30,1`) y autocompleta el cliente; tokens antd reactivados y
      alineados con `:root`; página de confirmación con hero de éxito y resumen
      en S/. Sin cambios de esquema ni de reglas de negocio. Verificado por
      build y headless (375px/1280px, sin excepciones).

---

## D. Gestión de catálogos y estados (Roadmap Fase 3)

Cada módulo sigue la estructura de ADR-064 con los traits `HasIndexPage`/
`HasCrudActions` de `app/Http/Controllers/Platform/Concerns/` (`Controller`
Inertia + `ApiController` JSON + `Service` opcional) y el patrón
`is_active` / `is_deleted` de ADR-001/005. "Catálogo" es solo un nombre
lógico: no existe carpeta física `Platform/Catalogs/`. El front consume las
APIs vía `resources/js/Utils/Ajax.js` + un Service por módulo
(`resources/js/Services/`), y la página genérica vive en
`resources/js/Pages/Platform/Shared/Index.jsx` (ADR-009 §36).

- [x] T-060 — Gestión de asesores (advisors).
    - Prioridad: Media
    - Fase: D
    - Criterio de aceptación: CRUD + activo/inactivo en el panel.
      Verificado por HTTP (POST asesor → 302 y aparece en el listado).
    - 22-09-2026: individualizado — primer módulo con página propia
      `Platform/Advisors/Index.jsx` (modal de alta/edición, búsqueda,
      filtro activo, borrado con confirm, paginación server-side) y
      `AdvisorController::pageComponent()` → `Platform/Advisors/Index`;
      retirado de `catalogServices`. Verificado E2E (render de la página
      dedicada, CRUD `/api/advisors` 302, limpieza a seed).
    - Corregido bug de cliente al guardar desde el modal: `const submit =
      router.put : router.post` desacoplaba el `this` de `@inertiajs/core`
      (`Cannot read properties of undefined (reading 'visit')`); se llama
      `router.put/post(...)` directo (mismo fix en `Shared/Index.jsx`).
      Guardado del modal verificado con Edge headless (fila creada, sin
      excepciones de consola, limpieza a seed).

- [x] T-061 — Gestión de plantas (plants).
    - Prioridad: Media
    - Fase: D
    - Criterio de aceptación: CRUD + activo/inactivo en el panel.

- [x] T-062 — Gestión de mayoristas (wholesalers).
    - Prioridad: Media
    - Fase: D
    - Criterio de aceptación: CRUD + activo/inactivo en el panel.

- [x] T-063 — Gestión de productos (products).
    - Prioridad: Media
    - Fase: D
    - Criterio de aceptación: CRUD + activo/inactivo en el panel.

- [x] T-064 — Gestión de clientes (customers).
    - Prioridad: Alta
    - Fase: D
    - Criterio de aceptación: CRUD con RUC único, mayorista preferido y
      baja lógica (`is_deleted`).

- [x] T-065 — Gestión de conductores (drivers).
    - Prioridad: Media
    - Fase: D
    - Criterio de aceptación: CRUD con licencia única y baja lógica.

- [x] T-066 — Gestión de vehículos (vehicles).
    - Prioridad: Alta
    - Fase: D
    - Criterio de aceptación: CRUD de tanquera/tractora con placa única por
      tipo de vehículo y baja lógica.

- [x] T-067 — Gestión de estados de pedido (alta de nuevos estados).
    - Prioridad: Media
    - Fase: D
    - Dependencias: T-011
    - Referencias: ADR-004
    - Criterio de aceptación: crear/editar/desactivar estados desde el panel
      sin alterar el esquema (catálogo, no ENUM).

---

## E. Validaciones y reglas de negocio (Roadmap Fase 4)

Todo queda pendiente de confirmación con Sertoco. Ninguna tarea debe avanzar
a `Done` sin la regla real confirmada.

- [ ] T-070 — Confirmar fórmula definitiva de totales de pedido.
    - Prioridad: Alta
    - Fase: E
    - Referencias: ADR-001 (cálculo provisional)
    - Criterio de aceptación: regla real documentada y aplicada.

- [ ] T-071 — Confirmar reglas de compartimentos.
    - Prioridad: Alta
    - Fase: E
    - Criterio de aceptación: validación de compartimentos definida.
    - Avance 2026-09-28 (ADR-015): la parte **técnica** está implementada y
      verificada de punta a punta (tabla `order_compartments`, formulario
      público, edición, consulta y papelera; E2E 74/74 y headless 43/43 con
      consola limpia). Se mantiene pendiente porque la sección exige la regla
      real confirmada por Sertoco: hoy la implementación **solo advierte**
      (no bloquea) cuando la suma de los compartimentos no cuadra con el total
      del detalle, y no se inventó ninguna regla extra. Ver la nota de
      implementación de `docs/03_Decisions/ADR-015.md` y "Estado actual" en
      `AGENTS.md`.

- [ ] T-072 — Confirmar reglas de SCOP.
    - Prioridad: Media
    - Fase: E
    - Criterio de aceptación: formato/reglas de SCOP definidos.

- [ ] T-073 — Confirmar campos requeridos.
    - Prioridad: Media
    - Fase: E
    - Criterio de aceptación: lista de requeridos definida y aplicada.

- [ ] T-074 — Confirmar reglas de cliente (RUC, datos, duplicados).
    - Prioridad: Media
    - Fase: E
    - Criterio de aceptación: reglas de cliente confirmadas.

- [ ] T-075 — Confirmar validaciones de conductor y vehículos.
    - Prioridad: Media
    - Fase: E
    - Criterio de aceptación: reglas de licencia y vehículos confirmadas.

---

## F. Integraciones externas (Roadmap Fase 5)

Solo backlog. No implementar hasta identificar los servicios disponibles.

- [ ] T-080 — Identificar servicios de información legal del cliente.
    - Prioridad: Baja
    - Fase: F
    - Criterio de aceptación: candidatos evaluados y documentados.

- [ ] T-081 — Identificar fuentes de información de licencias de conducir.
    - Prioridad: Baja
    - Fase: F

- [ ] T-082 — Identificar fuentes de información de vehículos.
    - Prioridad: Baja
    - Fase: F

- [ ] T-083 — Definir alcance y contratos de las integraciones a adoptar.
    - Prioridad: Baja
    - Fase: F

---

## G. Reportes y mejoras (Roadmap Fase 6)

- [ ] T-090 — Listado de pedidos consolidado.
    - Prioridad: Alta
    - Fase: G
    - Criterio de aceptación: listado con estados y totales.

- [ ] T-091 — Vista de detalle con histórico de estados.
    - Prioridad: Alta
    - Fase: G
    - Dependencias: T-047
    - Criterio de aceptación: línea de tiempo de cambios de estado visible.

- [x] T-092 — Búsqueda y filtros avanzados.
    - Prioridad: Media
    - Fase: G
    - Referencias: ADR-069 (`docs/03_Decisions/ADR-007.md`)
    - Implementado (2026-09-21): búsqueda textual server-side con debounce
      de 350 ms (mínimo 1 carácter) en el índice de pedidos y en el índice
      genérico de catálogos/usuarios; filtros por módulo server-side:
      `is_active` en todos los catálogos, `type` (Tanquera/Tractora) en
      vehículos y `is_owner`/`is_active` en usuarios; paginación server-side
      conservada y respeto al aislamiento por organización (los filtros se
      aplican después del global scope). Verificado E2E por HTTP.

- [ ] T-093 — Exportación/reportes según requerimientos.
    - Prioridad: Media
    - Fase: G

- [ ] T-094 — Requerimientos de datos históricos.
    - Prioridad: Media
    - Fase: G
    - Referencias: ADR-001 (limitación de snapshots históricos)

- [ ] T-095 — Mejoras de gestión documental.
    - Prioridad: Baja
    - Fase: G