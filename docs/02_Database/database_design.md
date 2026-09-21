# Database Design

## Overview

The database is designed around the `orders` entity.

An order contains references to the customer, driver, vehicles, advisor
and multiple order details.

## Main entities

``` text
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
