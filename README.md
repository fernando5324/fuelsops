# fuels-ops

Plataforma de gestión de pedidos de combustible (venta y distribución).
`fuels-ops` es el **nombre interno del producto**; el panel y el título del
navegador muestran el nombre del **cliente** (`tenants.name` de la organización
activa), hoy **Fuels-ops** (`tenants.slug = fuelsops`).

## Stack

- Laravel 12 / PHP 8.4
- MySQL (`sertocobd`) — SQL versionado, **sin migraciones de Laravel**
- Inertia + React (`.jsx`) + Ant Design v6
- `maatwebsite/excel` para la importación de precios
- Motor de precios con `bcmath`

## Puesta en marcha

- Servidor de desarrollo: host virtual `http://sertocoplatform` (Apache de
  WAMP64, puerto 80). No usar `php artisan serve`.
- Frontend: `npm run build` (compila la app y el runtime de gráficos del PDF).
- Cambios de esquema: aplicar directo a la base viva y reflejarlos en
  `docs/02_Database/database.sql`.
- Restablecer la base de datos requiere consentimiento explícito del usuario.

## Identidad y marca

- Fuente única de identidad visual: `config/brand.php`.
- Personalización por cliente: columna `tenants.details` (JSON), con prioridad
  sobre el archivo.
- El nombre visible sale de `tenants.name`; `fuels-ops` no se muestra al usuario.
- Detalle en `docs/03_Decisions/ADR-019.md`.

## Documentación

Toda la documentación operativa vive en `docs/`:

- `AGENTS.md` (raíz) — guía operativa para agentes y desarrolladores.
- `docs/README.md` — propósito, flujo de negocio, stack y reglas del proyecto.
- `docs/03_Decisions/` — ADRs (decisiones de arquitectura).
- `docs/04_Roadmap/roadmap.md` y `docs/05_Tasks/backlog.md` — plan y tareas.
