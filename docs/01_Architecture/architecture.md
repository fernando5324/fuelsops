# Arquitectura de referencia (blueprint reutilizable)

Este documento es un **blueprint generalizado** de la arquitectura usada en
este proyecto, pensado para **re-crear un sistema nuevo desde cero** sin
depender de la lógica de negocio o del modelo de datos específico de Sertoco.

El documento describe: lenguajes y stack, estructura física de carpetas y su
orden, el patrón de controladores/APIs/servicios, el enrutado y su naming, la
organización del frontend, la internacionalización y el **soporte
multitenant listo** (la plataforma nace preparada para operar por
organizaciones, aunque se arranque con una sola).

No documenta aquí: reglas de negocio ni esquema de base de datos (ver
`docs/02_Database/` y los ADR).

## 1. Propósito y alcance

- **Qué es**: guía operativa para levantar un sistema idéntico en
  arquitectura: mismas carpetas, mismas convenciones, mismo orden de capas.
- **Qué NO es**: documentación de negocio ni del modelo de datos de Sertoco.
- **Enfoque**: cada patrón se resume aquí para ser útil por sí solo y cita su
  fuente canónica (ADR) para profundizar.

### Referencias canónicas (sumario + cita)

| Tema | Fuente canónica |
|---|---|
| Organización por módulos de controladores y servicios | `docs/03_Decisions/ARD-003.md` (ADR-064) |
| Arquitectura de Services del frontend (HTTP/axios) | `docs/03_Decisions/ADR-009.md` (ADR-066) |
| Multitenant por organizaciones | `docs/03_Decisions/ADR-008.md` |
| Auditoría y usuario sistema | `docs/03_Decisions/ADR-005.md` |
| UI/UX (paleta, panel, formulario público) | `docs/03_Decisions/ADR-006.md` |
| Búsqueda y filtros server-side | `docs/03_Decisions/ADR-007.md` (ADR-069) |
| Internacionalización | `docs/03_Decisions/ADR-002.md` (ADR-062) |

## 2. Stack y lenguajes

| Capa | Tecnología | Nota |
|---|---|---|
| Backend | PHP 8.4 + Laravel 12 | n/a |
| Frontend | Inertia v2 + React 18 + Ant Design v6 | `<ConfigProvider>` con locale y tokens de marca |
| Build | Vite (plugin react + laravel-vite-plugin) | entrada única `resources/js/app.jsx` |
| Base de datos | MySQL 8, SQL versionado | **Sin migraciones Laravel**: cambios aplicados directo a la BD viva y reflejados en el SQL canónico |
| Cálculos monetarios | extensión **bcmath** | nunca float para montos/precios |
| Importación de archivos | maatwebsite/excel | `.xlsx`/`.xls` |
| HTTP cliente (front) | axios (instancia única) | ver §6 `Utils/Ajax.js` |
| Auth | Laravel Breeze (adaptado a antd) | sesión + CSRF; registro público desactivado |

### Decisiones transversales

- **Sin migraciones**: la persistencia se gobierna con SQL versionado
  (comando `sql:run` para aplicar el SQL, ver §3). Cualquier cambio de
  esquema se aplica a la base viva y se refleja en el archivo canónico.
- **Soft delete lógico**: `is_deleted` + trait `LogicalDelete` para entidades
  maestras; las tablas puramente relacionales se eliminan físicamente.
- **Auditoría**: `created_by/updated_by` + marcas de tiempo en toda entidad
  principal (trait `Auditable`, ver §5).
- **Un solo proveedor de UI**: Ant Design v6 en todo el sistema (paneles,
  formularios públicos, auth). La UI responde a un *design system* central
  (tokens antd + variables CSS `:root`).

## 3. Árbol del backend (`app/`)

```
app/
├── Console/
│   └── Commands/
│       └── SqlRun.php                  # comando php artisan sql:run {file}
│                                       #   aplica SQL sentencia por sentencia,
│                                       #   ignorando errores de "ya existe"
├── Http/
│   ├── Controllers/
│   │   ├── Controller.php              # base común (Laravel)
│   │   ├── Auth/                       # controladores de autenticación estándar
│   │   │                                 (login, password, verify, logout…)
│   │   ├── ProfileController.php       # perfil del usuario autenticado
│   │   ├── Public/                     # flujos SIN autenticación (front público)
│   │   │   └── {Flow}Controller.php    #   vistas Inertia + lookups aditivos JSON
│   │   └── Platform/                   # panel privado (auth)
│   │       ├── DashboardController.php # vista de inicio del panel
│   │       ├── Concerns/               # traits transversales de controladores
│   │       │   ├── HasIndexPage.php    #   índice Inertia genérico
│   │       │   └── HasCrudActions.php  #   store/update/destroy genéricos
│   │       └── {Module}/               # UN subdirectorio por módulo de negocio
│   │           ├── {Module}Controller.php    # vistas Inertia (compose HasIndexPage)
│   │           └── {Module}ApiController.php # CRUD/JSON (compose HasCrudActions)
│   ├── Middleware/
│   │   └── HandleInertiaRequests.php   # props compartidas de Inertia (auth,
│   │                                   #   flash, locale, translations)
│   └── Requests/                       # Form Requests por operación
│       ├── Auth/                       #   …validaciones de auth
│       └── {Entity}{Action}Request.php #   p. ej. PublicOrderStoreRequest,
│                                       #   UpdateOrderRequest, ImportPricesRequest
├── Imports/                            # importadores maatwebsite/excel
│   └── PricesImport.php                #   ToArray no-op (se lee con Excel::toArray)
├── Models/
│   ├── {Entity}.php                    # un modelo por tabla de negocio
│   └── Concerns/
│       ├── Auditable.php               # created_by/updated_by automáticos + actorId()
│       ├── LogicalDelete.php           # soft delete con is_deleted (scope global)
│       └── BelongsToTenant.php         # aislamiento por tenant (scope global)
└── Services/                           # capa de servicios de lógica de negocio
    ├── TenantContext.php               # resuelve la organización activa (ver §7)
    ├── {Domain}Service.php             # un servicio por dominio multi-entidad
    └── {Complex}/                      # subcarpeta si el módulo es complejo
        ├── Decimal.php                 # aritmética exacta (bcmath)
        ├── {Engine}.php                # motor de cálculo del dominio
        ├── {History}Service.php        # registro append-only / snapshots
        ├── {Import}Service.php         # orquesta importación de archivos
        └── …                           # value objects, config service, etc.
```

> Nota: en este proyecto los ejemplos reales son `Services/OrderService.php`,
> `Services/MediaService.php` y la subcarpeta `Services/Pricing/` (motor de
> precios con bcmath + historial + importación desde Excel). El blueprint los
> muestra con corchetes para ser reutilizable.

### Reglas de colocación

1. **Controllers de módulo**: siempre en `Platform/{Module}/` con DOS clases:
   una que renderiza Inertia y otra para el CRUD/JSON. Nunca en una carpeta
   genérica "Catalogs" (es solo un nombre lógico de agrupación en la UI).
2. **Traits transversales**: en `Platform/Concerns/` (controllers) y en
   `Models/Concerns/` (modelos).
3. **Services**: SOLO cuando la operación involucra varias entidades,
   transacciones o reglas de negocio (ver §5). Los CRUD simples no necesitan
   servicio.
4. **Requests**: un Form Request por operación compleja; las validaciones
   sencillas pueden vivir en el `rules()` del ApiController.
5. **Nada de lógica de negocio en el controlador**: el controlador valida,
   orquesta y redirige; la regla vive en el Service o en el modelo.

## 4. Enrutado y naming

### Principio de naming (ADR-003)

- **Vistas (páginas web)**: segmentos de URL en **español**.
  Ej.: `/pedidos`, `/pedidos/{order}`, `/catalogos/asesores`, `/precios/importar`.
- **APIs internas (sin vista)**: prefijo **inglés** bajo `/api/{resource}`.
  Ej.: `POST /api/advisors`, `GET /api/orders/{order}/detail`.
- **Consultas aditivas públicas**: prefijo inglés, SIN `/api`, siempre con
  `throttle`. Ej.: `POST /orders/lookup-customer`.

### Orden de registro (importante)

Las rutas públicas que comparten prefijo con modelos se registran ANTES de
las rutas del panel con route-model binding de ese modelo. El flujo público
se declara primero; luego el grupo `auth`.

### Estructura

```
routes/
├── web.php     # rutas web (vistas ES + APIs EN), incluye require auth.php
└── auth.php    # rutas de autenticación (Breeze)
```

Ejemplo de organización en `web.php`:

- Raíz `/` → página Welcome (Inertia).
- `Route::prefix('pedidos')->name('pedidos.')` → vistas públicas del
  formulario y la confirmación.
- `Route::prefix('orders')->name('orders.')` → lookups aditivos con
  `throttle:30,1`.
- `Route::middleware('auth')` → panel: dashboard, vistas de pedidos,
  catálogos (`catalogos.*`), usuarios, precios, perfil, descarga de media.
- Dentro del grupo auth: `Route::prefix('api')->name('api.')` → APIs de CRUD
  por módulo y endpoints JSON de pedidos.

### Convenciones

- **Sin `Route::resource`**: rutas explícitas con names de la forma
  `{prefix}.{action}` (`api.advisors.store`, `catalogos.asesores.index`,
  `pricing.upload`).
- **URLs web de las vistas de módulo** derivadas por el hook `pageUrl()`
  del trait `HasIndexPage` (ver §5): el segmento español casi nunca coincide
  con el recurso interno en inglés, por eso cada módulo lo declara.
- Los endpoints aditivos públicos llevan `throttle:30,1` para mitigar abuso.

## 5. Patrón de módulo (back-end)

Cada módulo del panel sigue el mismo molde: **Controller (vista)** +
**ApiController (CRUD)** + **Service (opcional)**.

### 5.1 Controller (vistas Inertia)

Compone el trait `HasIndexPage` y declara **propiedades** (el trait solo
expone **métodos/hooks**, nunca propiedades, para evitar conflictos de
composición de traits):

```php
class {Module}Controller extends Controller
{
    use HasIndexPage;

    protected string $model = {Entity}::class;   // modelo a listar
    protected string $resource = '{entity}';      // identificador interno EN
    protected string $titleKey = 'menus.{module}'; // clave i18n del título
    protected array $searchable = ['name'];        // columnas de búsqueda
    protected array $filters = [];                 // filtros de listado (ADR-069)
    protected array $fields = [];                  // columnas/formulario genérico

    // hooks (métodos) que se sobreescriben cuando aplica:
    protected function pageComponent(): string { return 'Platform/Shared/Index'; }
    protected function pageUrl(): string { return '/catalogos/{resource}'; }
    protected function showAudit(): bool { return true; }
    protected function options(): array { return []; }       // opciones de selects
    protected function applyQueryScope(Builder $query): void { }
}
```

Qué hace `HasIndexPage::index()`:

1. Consulta el modelo con `$this->applyQueryScope()` (restricción por módulo).
2. Aplica búsqueda textual `q` sobre `$searchable` y los `$filters` declarados.
3. Paginación server-side (`paginate(15)`) conservando query string.
4. Renderiza `pageComponent()` con `config` = `{ resource, url, title,
   fields, filters, options, showAudit }` + `rows` + `filter`. El frontend
   genérico consume esa config (ver §6).

Los módulos con layout complejo (p. ej. pedidos, asesores) definen sus
propios métodos de vista (`index`, `show`, `edit`, `update`…), cargan
relaciones/catálogos y renderizan su página dedicada.

### 5.2 ApiController (CRUD/JSON)

Compone `HasCrudActions`. El mínimo:

```php
class {Module}ApiController extends Controller
{
    use HasCrudActions;

    protected string $model = {Entity}::class;

    protected function rules(?Model $entity = null): array { /* validación */ }
    protected function logicalDelete(): bool { return true; } // soft delete
}
```

Qué hace `HasCrudActions` (hooks sobreescribibles):

- `store(Request)`: valida, `beforeCreate()`, `create(prepareForCreate())`,
  error de unicidad → `catalogs.duplicate`, flash `catalogs.created`.
- `update(Request)`: resuelve la entidad del request con global scopes
  (`resolveRouteEntity()`, 404 si no pertenece a la org activa),
  `authorizeEntity()`, valida, `beforeUpdate()`, `update(prepareForUpdate())`.
- `destroy(Request)`: idem resolución + autorización; si `logicalDelete()`
  → `$entity->delete()`, si no → `is_active = 0`.

Gotchas del trait:

- `rules(?Model $entity = null)` recibe la entidad para validación
  condicional en update.
- NUNCA declarar propiedades en los traits (PHP aborta por incompatibilidad
  al componerse); solo docblocks.
- NUNCA tipar el parámetro del `update/destroy` con el modelo concreto en un
  override (rompe la firma con el `use Trait`); se resuelve vía
  `resolveRouteEntity()`.
- Los módulos que responden **JSON puro** (p. ej. `detail`, `changeStatus` de
  pedidos) agregan sus propios métodos al ApiController del módulo.

### 5.3 Service (capa de lógica)

Se usa SOLO cuando la operación es multi-entidad, transaccional o con reglas
(ADR-064). Reglas de diseño:

- Un Service por dominio (p. ej. `OrderService`, `MediaService`,
  `PriceImportService`).
- El controlador inyecta el Service por constructor o parámetro de método.
- Las operaciones que tocan varias tablas van en `DB::transaction(...)`.
- El Service recibe datos ya validados (`$request->validated()`).
- Los subdominios complejos usan subcarpeta (`Services/Pricing/`) con value
  objects y services pequeños especializados.

```php
class {Module}Service
{
    public function create(array $data): {Entity}
    {
        return DB::transaction(function () use ($data) {
            // find-or-create de referencias, validación cruzada, inserts…
        });
    }
}
```

### 5.4 Modelo

Cada entidad maestra compone los traits de `Models/Concerns/`:

- `Auditable` → rellena `created_by/updated_by` (actor actual o usuario
  sistema si no hay sesión).
- `LogicalDelete` → soft delete con `is_deleted` (scope global; delete /
  restore / forceDelete).
- `BelongsToTenant` → aislamiento por organización (ver §7). NO se usa en
  `User` (la autenticación es global por email).

Además: `$fillable`, `$attributes` (defaults globales), `casts()` y
relaciones Eloquent.

## 6. Frontend (`resources/js/`)

### 6.1 Estructura de carpetas

```
resources/js/
├── app.jsx                 # bootstrap de Inertia: ConfigProvider antd (locale es_ES
│                           #   + tokens de marca), ProcessingProvider, progress bar
├── bootstrap.js            # config base (axios CSRF, etc.)
├── css/app.css             # reset global + variables :root + clases utilitarias
├── Components/             # componentes compartidos (sin lógica de negocio)
│   ├── PageHeader.jsx      # título de página a la altura de las acciones
│   ├── SectionCard.jsx     # tarjeta/sección con índice opcional
│   ├── SubmitButton.jsx    # botón de guardar que bloquea doble clic
│   ├── ProcessingProvider.jsx / ProcessingOverlay.jsx  # estado global de envío
│   ├── PublicHeader.jsx    # header público con logo y pill de conexión
│   └── {Domain}/           # building blocks por dominio (p. ej. Components/Orders/)
├── hooks/                  # hooks de UI/estado
│   ├── useTranslations.js  # t('grupo.clave', {replace}) desde props
│   ├── useMediaQuery.js    # breakpoints responsive
│   └── usePermissions.js   # can(...slugs) opcional (RBAC listo, ver nota)
├── Layouts/
│   ├── AuthLayout.jsx      # página de auth (Card centrada sobre gradiente)
│   └── PanelLayout.jsx     # layout del panel (Sider + Header + Content)
├── lib/                    # helpers puros (sin UI)
│   ├── dates.js            # formato dd/mm/yyyy (+ hora hh:mm:ss opcional)
│   ├── money.js            # montos S/ (locale es-PE, PEN)
│   ├── files.js            # formatFileSize, etc.
│   └── status.js           # color de badge por código de estado
├── Pages/                  # UNA componente por componente Inertia
│   ├── Welcome.jsx
│   ├── Auth/               # Login, Register (inactivo), Forgot/Reset, Verify, Confirm
│   ├── Public/Orders/      # Create, Confirmed (formulario público)
│   ├── Platform/           # Dashboard; por módulo: Orders/{Index,Show,Edit},
│   │                       #   Advisors/Index (dedicada), Pricing/Import, etc.
│   ├── Platform/Shared/
│   │   └── Index.jsx       # página genérica de catálogos gobernada por config
│   └── Profile/            # Edit + Partials
├── Services/               # UN archivo por módulo (ADR-009): total independencia de UI
│   ├── index.js            # registro catalogServices {resource: Service}
│   └── {Module}.js         # objeto: routes (URLs Inertia) + métodos axios(JSON)
└── Utils/
    └── Ajax.js             # instancia axios única con X-Requested-With
```

### 6.2 Patrones obligatorios del frontend

- **Un Service por módulo** en `Services/` que expone:
  - `routes`: URLs para navegación Inertia (segmentos en español).
  - métodos axios: operaciones JSON (APIs `/api/*` en inglés).
  - Sin lógica de UI dentro del Service (ADR-009).
  - Registro en `Services/index.js` para la página genérica
    (`catalogServices[config.resource]`). Los módulos con página dedicada
    importan su Service directo.
- **HTTP SOLO vía axios central** (`Utils/Ajax.js`), nunca `fetch`/axios
  sueltos.
- **Página genérica vs dedicada**: la genérica `Shared/Index.jsx` renderiza
  tabla + modal usando `config` (fields/filters/options) declaradas por el
  Controller; al crecer complejidad, el módulo saca página propia
  (`pageComponent()`).
- **Submits**: siempre `router.post/router.put(...)` directo (nunca
  desacoplar en variable) y botón `SubmitButton` (bloquea doble clic vía
  `useProcessing`). Para PUT multipart con archivos: **POST + `_method=PUT`**
  (PHP no puebla `$_POST/$_FILES` en PUT multipart).
- **Uploads** dentro de `Form.Item`: requerir `valuePropName="fileList"` +
  `getValueFromEvent`.
- **Modal con Form**: poblar/resetear en `afterOpenChange` (no con el modal
  cerrado) y `destroyOnHidden`.
- **Helpers**: montos SIEMPRE con `lib/money.js`; fechas con `lib/dates.js`;
  badges de estado por `lib/status.js`.
- **Tablas responsive**: `scroll={{ x: 'max-content' }}`; anchos máximos con
  `min(100%, Xpx)`.

### 6.3 Internacionalización (ADR-002)

- Fuente única: `lang/{locale}/*.php`, un grupo por dominio
  (`auth`, `catalogs`, `common`, `menus`, `order`, `pricing`, `validation`…).
- `HandleInertiaRequests` comparte las props:
  - `translations`: todos los grupos de `lang/es/*.php` (key = basename).
  - `locale`.
- El front utiliza `useTranslations()` con `t('grupo.clave', {param})`;
  fallback = la clave cruda.
- `ConfigProvider` de antd con `locale={esES}` y `dayjs.locale('es')`.

### 6.4 Nota sobre RBAC

Existe `usePermissions.js` como patrón listo para RBAC por slugs
(`module.action` compartidos como `auth.permissions`) pero actualmente **no
está cableado** a `HandleInertiaRequests` (solo se comparten `auth.user`,
`flash`, `locale`, `translations`). Para activarlo: compartir `auth.permissions`
y `auth.is_platform_user` desde el middleware; el hook queda como está.

## 7. Multitenancy listo (organizaciones)

El sistema nace preparado para operar **por organizaciones (tenants)** desde
el inicio, aunque se arranque con una sola (ADR-008). Arquitectura:

### 7.1 Configuración

```php
// config/sertoco.php
'system_user_id'     => (int) env('SERTOCO_SYSTEM_USER_ID', 999999),
'default_tenant_id'  => (int) env('SERTOCO_DEFAULT_TENANT_ID', 1),
'default_tenant_slug'=> (string) env('SERTOCO_DEFAULT_TENANT_SLUG', 'sertoco'),
```

- `default_tenant_id/slug`: organización activa cuando no hay usuario
  autenticado (flujo público, tareas de sistema).
- `system_user_id`: usuario "sistema" usado como `created_by` en operaciones
  sin sesión; nunca autenticable.

### 7.2 `TenantContext` (resolución de la org activa)

```php
class TenantContext
{
    private static ?int $override = null;

    public static function id(): ?int
    {
        if (self::$override !== null) return self::$override;
        if (($user = Auth::user()) !== null && $user->tenant_id !== null) {
            return (int) $user->tenant_id;         // usuario autenticado
        }
        return (int) config('sertoco.default_tenant_id'); // flujo público/sistema
    }

    public static function override(?int $tenantId): void { self::$override = $tenantId; }
    public static function reset(): void { self::$override = null; }
}
```

Prioridad: override en memoria (tests) → usuario autenticado → organización
por defecto. Permite simular aislamiento entre tenants en pruebas.

### 7.3 Trait `BelongsToTenant` (modelos de negocio)

```php
trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', fn (Builder $builder) =>
            $builder->where($builder->qualifyColumn('tenant_id'), TenantContext::id()));

        static::creating(function ($model) {
            if (empty($model->tenant_id)) $model->tenant_id = TenantContext::id();
        });
    }

    public function tenant(): BelongsTo { return $this->belongsTo(Tenant::class, 'tenant_id'); }
}
```

- **Global scope**: toda consulta se filtra por la org activa (no se puede
  "olvidar" el aislamiento).
- **Auto-fill**: al insertar asigna `tenant_id` automáticamente.
- Cada tabla de negocio lleva su columna `tenant_id` con FK a la tabla de
  organizaciones. (Detalle de esquema en ADR-008 / `docs/02_Database/`.)

### 7.4 Reglas de aislamiento

- **Unicidades por organización** en los campos identificadores del negocio
  (RUC, licencia, placa — en vehículos la placa es única por tipo:
  `UNIQUE (tenant_id, license_plate, type)` —, códigos de estado…): la
  unicidad incluye a `tenant_id`.
- **`User` NO compone `BelongsToTenant`**: la autenticación es global (por
  email). Los usuarios se aíslan explícitamente en su módulo administrativo
  (todos operan dentro de su propia org; solo el dueño del tenant crea/marca
  dueños).
- **Route-model binding con global scopes**: acceder a un registro de otra
  organización devuelve 404.
- **Validación de referencias cruzada** en Services/Requests: las entidades
  referenciadas deben pertenecer a la org destino (exists/consulta scoped).
- **El usuario no percibe la existencia de otras organizaciones**: sin
  selector/switcher en la UI.
- El único caso no-tenanted es el usuario "sistema" (`users.tenant_id = NULL`).

### 7.5 Arrancar single-tenant y crecer a multi

1. Se parte con una sola organización sembrada (id 1) y `default_tenant_id=1`.
2. Toda tabla de negocio nace con `tenant_id` (columna + FK) desde el
   principio, aunque solo haya un tenant.
3. `TenantContext` sin `override` resuelve siempre al usuario o al default.
4. Para habilitar multi-tenant real: sembrar más organizaciones, asignar
   usuarios y operar igual (el aislamiento ya está en los scopes).

## 8. Checklists

### 8.1 Crear un sistema nuevo desde cero

1. Levantar Laravel 12 + Inertia v2 + React + antd v6 (vite).
2. Configurar convenciones base:
   - `resources/js/app.jsx` con `ConfigProvider` (locale es_ES + tokens).
   - `resources/css/app.css` con variables `:root` alineadas a los tokens.
   - `routes/web.php` + `routes/auth.php` (públicas antes del binding).
   - `app/Http/Middleware/HandleInertiaRequests.php` compartiendo
     `auth.user`, `flash`, `locale`, `translations`.
3. Definir `lang/{locale}/*.php` (grupos por dominio) y `useTranslations`.
4. Crear plantilla de modelo: `Models/{Entity}.php` + `Models/Concerns/`
   (`Auditable`, `LogicalDelete`, `BelongsToTenant`).
5. Multi-tenant listo (aunque haya un solo tenant):
   - tabla de organizaciones + columna `tenant_id`+FK en cada tabla de
     negocio + unicidades por org.
   - `config/sertoco.php`, `Services/TenantContext.php`, trait
     `BelongsToTenant`.
   - usuario "sistema" (`users.tenant_id NULL`, `system_user_id`).
6. Para cada módulo del panel: seguir 8.2.
7. Rutas web en español + APIs en inglés; Services frontend por módulo.
8. Convenciones de seguridad: CSRF, `throttle` en endpoints aditivos,
   borrado SOLO lógico, sin secretos en el repo.

### 8.2 Crear un módulo nuevo de punta a punta

1. **Modelo**: `app/Models/{Entity}.php` con traits `Auditable`,
   `LogicalDelete`, `BelongsToTenant` (si entidad maestra del negocio).
2. **Controladores**: `app/Http/Controllers/Platform/{Module}/`
   - `{Module}Controller.php`: `use HasIndexPage` + propiedades
     (`model`, `resource`, `titleKey`, `searchable`, `filters`, `fields`).
   - `{Module}ApiController.php`: `use HasCrudActions` + `$model` +
     `rules()`, `logicalDelete()` según aplique.
   - Si hay lógica multi-entidad/transaccional: `app/Services/{Module}Service.php`
     e inyectarlo en el controller.
3. **Rutas** (sin `Route::resource`):
   - Vista: `GET /{segmento_espanol}` → `{Module}Controller@index`
     (`catalogos.*` o el prefijo que corresponda).
   - APIs: `POST|PUT|DELETE /api/{resource}` → `{Module}ApiController`
     (nombres `api.{resource}.{store|update|destroy}`).
4. **Frontend**:
   - Service: `resources/js/Services/{Module}.js` (objeto `routes` +
     métodos axios); registrarlo en `Services/index.js` si sigue la página
     genérica, o crear página dedicada `Pages/Platform/{Module}/Index.jsx`.
   - Si usa la página genérica `Platform/Shared/Index.jsx`, no hace nada más.
   - Si el módulo necesita layout propio: implementar `pageComponent()`
     en el Controller y la página en `Pages/Platform/{Module}/`.
5. **Traducciones**: agregar claves en `lang/es/{dominio}.php`
   (título: `menus.{module}`; mensajes: `catalogs.*` o grupo propio).
6. **Catálogos/opciones de select**: declarar en `options()` del Controller.
7. **Menú lateral**: agregar el ítem en `Layouts/PanelLayout.jsx`.
8. **Verificar**: `npm run build`, login por HTTP y CRUD E2E, limpiar datos
   de prueba al terminar.