# Database Design

## Overview

The database is designed around the `orders` entity.

An order contains references to the customer, driver, vehicles, advisor
and multiple order details.

## Main entities

``` text
tenants
advisors
customers
wholesalers
plants
products
drivers
vehicles
order_statuses
order_status_history
orders
order_details
order_files
```

## Relationships

``` text
customers ────────────────┐
                          │
advisors ────────────────►│
                          │
drivers ─────────────────►│
                          │
vehicles ────────────────►│
                          ▼
                       orders
                          │
                          │ 1:N
                          ▼
                    order_details
                     │      │      │
                     ▼      ▼      ▼
                   plants wholesalers products

orders
  │
  │ 1:N
  ▼
order_status_history

orders
  │
  │ N:1
  ▼
order_statuses

orders
  │
  │ 1:N
  ▼
order_files
```

## Organizations (multi-tenant)

The platform is organized by **organizations** (tenants). Every user account
belongs to exactly one organization and can create accounts only within its
own organization. All business information is routed by organization through
the `tenant_id` column, which references `tenants.id`.

Current rules:

-   Each user is responsible for a single organization; internal users create
    accounts only inside their assigned organization (`tenant_id` forced at
    creation, ignoring any request input).
-   Only the organization owner (`users.is_owner`) can create or mark other
    owners; non-owners always create regular users.
-   All business tables include `tenant_id` as a NOT NULL column with a
    foreign key to `tenants`, except `users` where it is nullable (the system
    user `sistema` does not belong to any organization). Every query is
    filtered by the current organization at the application level.
-   Uniqueness rules are **per organization**: RUC (customers), license
    number (drivers), license plate per vehicle type (vehicles) and status
    code (order_statuses) are unique within the tenant, so different
    organizations may share the same values. A vehicle is identified by
    plate + type: the same plate may be registered both as tanker and as
    tractor.
-   `order_statuses` is an organization-level catalog: each tenant has its own
    statuses (initially pending/attended/cancelled seeded for Sertoco).
-   The main organization is **Sertoco** (id 1); all current seed data belongs
    to it. End users do not notice that other organizations may exist (no
    tenant switcher or tenant selector in the UI).
-   The public order form and unauthenticated flows operate under the default
    organization (Sertoco), resolved through `config/sertoco.php`
    (`default_tenant_id`).

## Catalogs

The following are pre-registered catalogs:

-   Advisors
-   Plants
-   Wholesalers
-   Products

These catalogs are independent of each other.

They include an `is_active` flag so records can be disabled without
removing historical references.

## Customers

Customers are stored separately from orders.

Current fields:

-   `ruc`
-   `name`
-   `preferred_wholesaler_id`
-   `is_active`

The preferred wholesaler is optional and is intended as a future
convenience for the order registration flow. It does not force the
wholesaler used in an order.

## Drivers

Drivers are independent entities identified by their driving license.

Current fields:

-   `license_number`
-   `name`
-   `is_active`

Future integrations may provide additional legal or regulatory
information.

## Vehicles

Vehicles are stored independently and currently support two types:

-   `TANKER`
-   `TRACTOR`

The order references one tanker and one tractor.

## Orders

An order stores:

-   Order date
-   Advisor
-   Customer
-   Driver
-   Tanker
-   Tractor
-   Notes

## Order details

Each order can contain multiple details.

Current fields:

-   `scop`
-   `plant_id`
-   `wholesaler_id`
-   `product_id`
-   `gallons`
-   `sale_price`
-   `compartments`

The SCOP belongs to the order detail.

`compartments` represents the number/portion of tanker compartments
assigned to the product in that detail. The current prototype stores it
as a number.

## Provisional calculations

The current calculation is intentionally simple:

``` text
detail_total = gallons × sale_price

total_gallons = SUM(gallons)

total_sale = SUM(gallons × sale_price)
```

The final business calculation will be updated when Sertoco provides the
definitive rule.

Totals are calculated from order details instead of being stored as
independent order fields.

## Pricing (ADR-010)

The pricing module separates source data, configuration, imports, and
historical results (see `docs/03_Decisions/ADR-010.md`).

Existing catalogs `plants`, `wholesalers` and `products` are reused; no
parallel catalogs are created.

New tables:

-   `plant_products`: which products are available on each plant
    (unique per tenant/plant/product, `is_active`). Not all products
    exist on all plants.
-   `wholesaler_prices`: price offered by each wholesaler for a
    plant+product (unique per tenant/plant_product/wholesaler).
    `price DECIMAL(12,4)` is NULL when the wholesaler has no price for
    that product; an empty cell never means price `0`. `import_batch_id`
    links to the import that created/updated the price.
-   `price_import_batches` / `price_import_items`: audit of Excel
    imports. The batch holds the summary (file, status, total/new/
    updated/unchanged/error rows); each item keeps the per-row result
    (`new`, `updated`, `unchanged`, `error`) with previous/new price and
    error message, enabling preview before confirming an import.
-   `pricing_configurations`: calculation parameters stored as decimals
    (`margin`, `igv_rate`, `perception_rate`), active flag and
    `effective_from`/`effective_until` for future versioning. Default
    values: margin 0.13, IGV 0.18, perception 0.01.
-   `price_calculations`: append-only history of every confirmed
    calculation. Stores `calculation_data` as an immutable JSON snapshot
    with the exact values used at that moment (best wholesaler price,
    margin, IGV, perception and all intermediate/final results).

All tables are multi-tenant (`tenant_id`) and follow the audit-field and
`ON DELETE RESTRICT` conventions of the project. Monetary amounts are
stored as `DECIMAL(12,4)` and processed with bcmath (never float/double).

## Order files

Orders can have attached documents such as:

-   Invoice
-   Voucher
-   Other

The database stores file metadata and path information, not the binary
file itself.

## Historical data

The prototype currently references customers, drivers, vehicles and
catalog records through foreign keys.

Historical snapshots of names or other master data have not been
implemented yet. This decision may be revisited once the required
reports and historical-document behavior are known.

## Order statuses

Orders are created through a public form and are stored in `orders`
with a default status of `Pendiente`. Internal users can change the
status of an order from the administrative panel.

Statuses are modeled as a catalog (`order_statuses`) instead of an
`ENUM` so that new statuses can be added later without altering the
schema.

Current `order_statuses` fields:

-   `code` (unique, e.g. `pending`, `attended`, `cancelled`)
-   `name`
-   `description`
-   `color` (UI badge color)
-   `is_default`
-   `is_active`

Initial seed:

| code      | name      | default |
|-----------|-----------|---------|
| `pending` | Pendiente | yes     |
| `attended`| Atendido  | no      |
| `cancelled`| Anulado  | no      |

`orders.status_id` references `order_statuses.id`.

Every status change is recorded in `order_status_history`:

-   `order_id`
-   `status_id` (new status)
-   `previous_status_id`
-   `notes`
-   `created_by` (the user who changed the status)

This provides traceability of who changed the status and when.

## Audit fields convention

Every business table includes the following audit fields:

-   `created_at` --- `TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP`
-   `updated_at` --- `DATETIME NULL DEFAULT NULL` (stored in America/Lima, UTC-5)
-   `created_by` --- `BIGINT UNSIGNED NOT NULL` referencing `users`
-   `updated_by` --- `BIGINT UNSIGNED NULL` referencing `users`

Tables considered main modules or master entities also include
`is_deleted` (`TINYINT(1) NOT NULL DEFAULT 0`) to support logical
deletion:

-   `orders`
-   `order_details`
-   `media_files`
-   `customers`
-   `drivers`
-   `vehicles`

Simple catalogs with few fields (such as `order_statuses`) do not use
`is_deleted`; they only use `is_active` as defined in ADR-001.

Because `created_by` is `NOT NULL`, every insert must identify an
actor. Data created through the public form and seeded catalogs use the
seed system user (`sistema`) defined for that purpose. See ADR-005.
