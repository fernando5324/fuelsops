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
order_deposits          ADR-013
order_compartments      ADR-015
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

orders
  │
  │ 1:N   (ADR-013: un depósito por voucher del cliente)
  ▼
order_deposits

orders
  │
  │ 1:N   (ADR-015: un compartimento por fila de la distribución)
  ▼
order_compartments
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

An order also **has** (never stores inline): details, deposits, compartment
distribution, files, status history and deletion history.

``` text
orders (1)
    ├── order_details (N)
    ├── order_deposits (N)     ADR-013
    ├── order_compartments (N)  ADR-015
    ├── media_files (N)        polimórfica
    ├── order_status_history (N)
    └── order_deletions (N)    ADR-011 (histórico de papelera)
```

## Order details

Each order can contain multiple details.

Current fields:

-   `scop`
-   `plant_id`
-   `wholesaler_id`
-   `product_id`
-   `gallons`
-   `sale_price`

The SCOP belongs to the order detail.

## Order compartments (ADR-015)

Each order can also declare how its load is distributed across the tanker
compartments. It is a separate table because the compartment distribution is not
a property of a single detail: the same number of compartments applies to the
whole order, and a detail's gallons can be split across several of them.

Current fields:

-   `compartment_number` (the 1..N numbering of the compartment)
-   `product_id` (product of the detail line loaded in that compartment)
-   `scop` (SCOP of that same detail line)
-   `volume` (gallons assigned to the compartment)

Rules:

- The product and the SCOP of each row always come from a line of that order's
  `order_details`; the backend rejects any other combination, so the
  distribution can never reference a product that is not in the order.
- The three values are stored denormalized instead of a foreign key to
  `order_details` because the panel's order update soft-deletes the details and
  creates new ones: a foreign key would end up pointing at logically deleted
  rows.
- The number of compartments is not stored: it is the row count of the order
  (`COUNT(*)`), the same way the deposit total is computed on screen (ADR-013).
  The form sends it so the request can check it against the number of rows.
- The sum of `volume` is shown as the total of gallons at the end of the list,
  but it does not block the order: a mismatch with the total of the details is
  only a visual warning.
- Like deposits, the data is historical for the order: the trash (ADR-011) does
  not touch it, the foreign key to `orders` is `ON DELETE RESTRICT` and rows are
  soft-deleted (`is_deleted`).

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

Two order-level totals were added with the pricing module and fixed by
ADR-013:

``` text
total_purchase = SUM(gallons × precio de compra de la celda ganadora)
                 null si NINGUNA línea tiene precio (celda vacía o 0)

margin(detalle)        = plant_products.margin de (plant_id, product_id)
                         null si la relación planta+producto no existe
margin_amount(detalle) = gallons × margin(detalle)
gain(pedido)           = SUM(margin_amount de sus detalles)
                         null si NINGÚN detalle tiene margen
```

`gain` is no longer `total_sale - total_purchase` (ADR-013 §3), and the
percentage margin box was removed from the order summary. Both sums are
accumulated with bcmath at scale 2 (`bcadd(..., 2)` on the unrounded
`bcmul(gallons, valor)` product), never with float. `Decimal::round` (half away
from zero) belongs to the pricing engine results (ADR-010), not to these two
order-level sums.

## Order deposits (ADR-013)

`order_deposits` stores the deposits a client pays against an order, one
row per voucher, transcribed manually from the attached document:

``` text
order_deposits (N)
    tenant_id  → tenants (1)
    order_id   → orders (1)        ON DELETE RESTRICT
    created_by → users (1)

deposit_date    DATE          fecha del voucher (sin hora)
bank            VARCHAR(100)  banco de la operación
operation_number VARCHAR(50)   N° de operación del voucher
amount          DECIMAL(12,4) CHECK (amount > 0)
is_deleted      TINYINT(1)    baja lógica (LogicalDelete)
```

Notes:

- The deposit total is computed on screen (`SUM(amount)` of active rows) and is
  **not** stored, so a logically deleted deposit can never leave a wrong total
  persisted on the order.
- The **supplier payable** ("Depósito por proveedor" in the order detail) is
  **derived and not stored either**: `OrderService::supplierPayables()` groups
  the order details by their own `wholesaler_id` and sums
  `gallons × purchase price of that wholesaler's cell`, so its total is exactly
  `total_purchase`. There is no `order_supplier_deposits` table, no vouchers and
  no CRUD for it — it is read-only, also in the trash (ADR-013 §14).
- Deposits survive the order trash: the order's `is_deleted` does not touch
  `order_deposits`, and the trash detail lists them read-only. The
  `order_deletions.snapshot` carries a `deposits` block (replacing the old
  `payments: []` placeholder).
- There is no uniqueness on `(order_id, operation_number)`: two vouchers of the
  same bank can share an operation number.
- Only **add** and **logical delete** exist (no edit, no restore from UI): the
  cash history is never rewritten.
- Registering **actual payments** made to a supplier (vouchers, like the client
  deposits) remains unimplemented; the business confirmed it only needs the
  amount owed per wholesaler, which is derived.

## Pricing (ADR-010)

The pricing module separates source data, configuration, imports, and
historical results (see `docs/03_Decisions/ADR-010.md`).

Existing catalogs `plants`, `wholesalers` and `products` are reused; no
parallel catalogs are created.

New tables:

-   `plant_products`: which products are available on each plant
    (unique per tenant/plant/product, `is_active`). Not all products
    exist on all plants. It also has a logical deletion flag
    (`is_deleted`) so a plant+product can be removed from the matrix
    without losing its prices (`wholesaler_prices`) or its calculation
    history (`price_calculations`); both reference it with `ON DELETE
    RESTRICT`, so the row is never deleted physically. The unique key
    does not include `is_deleted`, which is why re-creating the same
    plant+product revives the existing row instead of inserting a new
    one. It owns **`margin DECIMAL(12,4) NOT NULL DEFAULT 0.1300`**, the
    absolute amount in S/ that the pricing engine adds to the
    purchase price for this combination (`S = Q + margin`); it is
    imported from column R (`MARGEN SERTOCO`) of the Excel file, which
    is its source of truth, and is editable per row in the admin
    matrix.
-   `wholesaler_prices`: price offered by each wholesaler for a
    plant+product (unique per tenant/plant_product/wholesaler).
    `price DECIMAL(12,4)` is NULL when the wholesaler has no price for
    that product; an empty cell never means price `0`. `import_batch_id`
    links to the import that created/updated the price.
-   `price_import_batches` / `price_import_items`: audit of Excel
    imports. The batch holds the summary (file, status, total/new/
    updated/unchanged/error rows); each item keeps the per-row result
    (`new`, `updated`, `unchanged`, `error`) with previous/new price and
    error message, enabling preview before confirming an import. Items
    also keep the **`margin DECIMAL(12,4) NULL`** read from column R of
    their row (NULL when the row had no prices, i.e. no meaningful
    margin; historical rows stay NULL).
-   `pricing_configurations`: calculation parameters stored as decimals
    (`margin`, `igv_rate`, `perception_rate`), active flag and
    `effective_from`/`effective_until` for future versioning. Default
    values: margin 0.13, IGV 0.18, perception 0.01. **Only IGV and
    perception are global**: `margin` is now just the default value
    proposed for new `plant_products` rows, since the margin that the
    engine uses lives in each relation.
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
