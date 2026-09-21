# Sertoco Prototype

Prototype system for managing fuel delivery orders for Sertoco.

## Purpose

This project replicates and improves an existing internal workflow used
to register fuel delivery orders.

The current prototype focuses on:

-   Order registration.
-   Customer information.
-   Driver and vehicle information.
-   Order details.
-   Pre-registered catalogs.
-   Basic order totals.
-   Invoice/voucher attachments.
-   Authentication and user management.

## Current technology

-   Laravel
-   MySQL
-   React/Inertia for the administrative interface

## Main business flow

``` text
Advisor
   ↓
Customer
   ↓
Driver + Vehicles
   ↓
Order details
   ├── SCOP
   ├── Plant
   ├── Wholesaler
   ├── Product
   ├── Gallons
   ├── Sale price
   └── Compartments
   ↓
Order totals
   ↓
Invoice/Voucher
```

Registration is done through a public form (no login). Orders enter with
the `pending` status and are viewed and managed by authenticated users
in the internal panel (Ant Design). See `ADR-004.md` and `05_Tasks/`.

## Documentation

-   `database_design.md` --- Current database structure and
    relationships.
-   `database.sql` --- Canonical schema (fresh install).
-   `SEEDS.sql` --- Idempotent test/seed data.
-   `roadmap.md` --- Initial implementation roadmap.
-   `ADR-001.md` --- Initial database design decisions.
-   `ADR-002.md` --- Internationalization strategy (interfaz y
    multilingüe) - ADR-062.
-   `ARD-003.md` --- Module-based controller and service organization -
    ADR-064.
-   `ADR-004.md` --- Public-to-internal flow and the order status model.
-   `ADR-005.md` --- Audit fields convention and the system user.
-   `05_Tasks/` --- Task tracking (README.md + backlog.md).

## Scope note

The current model intentionally keeps the business rules simple. Some
calculations and external validations are provisional until the real
business logic is provided by Sertoco.



## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Laravel 12, PHP 8.4 |
| Base de datos | MySQL, SQL versionado (sin migraciones Laravel; cambios aplicados directo a la BD y reflejados en `database.sql`) |
| Admin Panel | React + Ant Design |
| Infraestructura futura | Redis, S3/Spaces/R2, Workers, CDN |
| Documentación | Markdown, ADR |

## Regla del proyecto

Antes de implementar cualquier funcionalidad se debe verificar:

1. ¿Existe un ADR relacionado?
2. ¿La funcionalidad pertenece al MVP?
3. ¿La base de datos ya la soporta?
4. ¿Debe actualizarse la documentación?
5. ¿Impacta algún módulo o plan comercial?
6. ¿Requiere eliminar o recrear la base de datos?

## Política de actualización de documentos

- Agregar o modificar solo lo necesario, sin resumir ni eliminar contenido existente.
- Mantener el máximo detalle posible: entre más información y contexto, mejor.
- No reemplazar bloques de contenido por versiones resumidas.
- Los archivos marcados como "CONTENIDO MÍNIMO" o vacíos deben completarse cuando se aborde el tema.
- No leas toda la carpeta `/docs` de una sola vez.
- Usa la búsqueda de archivos para localizar únicamente el `.md` relevante a la consulta actual.