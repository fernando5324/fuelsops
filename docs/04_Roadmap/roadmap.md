# Roadmap del Proyecto

## Objetivo

Definir la evolución del producto a través de versiones, permitiendo priorizar funcionalidades y evitar la sobreingeniería.

---

## Phase 1 --- Database foundation

-   [x] Identify the main order flow.
-   [x] Identify catalog entities.
-   [x] Separate customers, drivers and vehicles from orders.
-   [x] Define orders and order details.
-   [x] Define order attachments.
-   [x] Define provisional total calculations.
-   [x] Define public-to-internal flow and the order status model (ADR-004).
-   [x] Define the audit fields convention and the system user (ADR-005).
-   [x] Add `order_statuses` and `order_status_history` tables.
-   [ ] Review SQL with the real Sertoco data.
-   [x] Add authentication tables aligned with the users table
      (`password_reset_tokens`; sessions already present).
-   [x] Add initial catalog data (including the `sistema` user seed).
-   [x] Implement the persistence layer with Eloquent models matching the
      current SQL schema (audit + logical delete). Laravel migrations were
      retired: the framework works 100% with the SQL schema
      (`php artisan sql:run` applies SQL deltas/seed files).
-   [x] Install Ant Design and integrate the locale (`es_ES`) and the
      Spanish translations (`lang/es`).

---

## Phase 2 --- Order registration

The registration form is **public** (no login). Orders are stored with
the default `pending` status and become visible in the internal panel
after login (ADR-004).

-   [x] Create the public order registration form (route without auth).
-   [x] Load advisors.
-   [x] Load plants.
-   [x] Load wholesalers.
-   [x] Load products.
-   [x] Select customer: reuse by RUC or create a new customer record.
-   [x] Select driver.
-   [x] Select tanker and tractor.
-   [x] Add/remove order detail rows.
-   [x] Calculate provisional totals.
-   [x] Save order and details with the `pending` status.
-   [x] Upload invoice/voucher in the public form.
-   [x] Internal panel: log in and list registered orders.
-   [x] Internal panel: view order detail.
-   [x] Internal panel: change order status (attended / cancelled) with
      history in `order_status_history`.

## Phase 3 --- Catalog management

-   [x] Manage advisors.
-   [x] Manage plants.
-   [x] Manage wholesalers.
-   [x] Manage products.
-   [x] Manage customers.
-   [x] Manage drivers.
-   [x] Manage vehicles.
-   [x] Manage order statuses (add/edit new statuses).
-   [x] Support active/inactive records.

## Phase 4 --- Validation and business rules

-   [ ] Confirm definitive order total calculation.
-   [ ] Confirm compartment rules.
-   [ ] Confirm SCOP rules.
-   [ ] Confirm required fields.
-   [ ] Confirm customer rules.
-   [ ] Confirm driver and vehicle validation rules.

## Phase 5 --- External information

Potential future integrations:

-   Customer legal information.
-   Driver license information.
-   Vehicle information.
-   Other regulatory sources.

The exact integrations will be defined after the available external
services and legal sources are identified.

## Phase 6 --- Reports and improvements

-   [ ] Order listing.
-   [ ] Order detail view.
-   [ ] Search and filters.
-   [ ] Export/report requirements.
-   [ ] Historical data requirements.
-   [ ] Document management improvements.
