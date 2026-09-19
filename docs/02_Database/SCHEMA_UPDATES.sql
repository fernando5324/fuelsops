-- SCHEMA_UPDATES.sql
--
-- Deltas para aplicar sobre la base de datos existente `sertocobd`
-- (MySQL 8). No recrea la base de datos.
--
-- Idempotente: el comando `php artisan sql:run` ignora los errores de
-- "ya existe" (columna, índice o constraint duplicados).
--
-- Referencias: ADR-004 (estados), ADR-005 (auditoría), database.sql (canónico).

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. Tablas nuevas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    email VARCHAR(150) NOT NULL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_statuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    color VARCHAR(20) NULL,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_order_statuses_code (code),
    INDEX idx_order_statuses_default (is_default),
    INDEX idx_order_statuses_active (is_active),
    INDEX idx_order_statuses_created_by (created_by),
    INDEX idx_order_statuses_updated_by (updated_by),

    CONSTRAINT fk_order_statuses_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_statuses_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    previous_status_id BIGINT UNSIGNED NULL,

    notes VARCHAR(255) NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_order_status_history_order (order_id),
    INDEX idx_order_status_history_status (status_id),
    INDEX idx_order_status_history_previous (previous_status_id),
    INDEX idx_order_status_history_created_by (created_by),
    INDEX idx_order_status_history_updated_by (updated_by),

    CONSTRAINT fk_osh_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_osh_status
        FOREIGN KEY (status_id)
        REFERENCES order_statuses (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_osh_previous_status
        FOREIGN KEY (previous_status_id)
        REFERENCES order_statuses (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_osh_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_osh_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. users: alinear auditoría
-- ---------------------------------------------------------------------------

ALTER TABLE users
    MODIFY created_by BIGINT UNSIGNED NOT NULL,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0';

-- ---------------------------------------------------------------------------
-- 3. Catálogos: created_by / updated_by
-- ---------------------------------------------------------------------------

ALTER TABLE advisors
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_advisors_created_by (created_by),
    ADD KEY idx_advisors_updated_by (updated_by),
    ADD CONSTRAINT fk_advisors_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_advisors_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE wholesalers
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_wholesalers_created_by (created_by),
    ADD KEY idx_wholesalers_updated_by (updated_by),
    ADD CONSTRAINT fk_wholesalers_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_wholesalers_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE plants
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_plants_created_by (created_by),
    ADD KEY idx_plants_updated_by (updated_by),
    ADD CONSTRAINT fk_plants_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_plants_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE products
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_products_created_by (created_by),
    ADD KEY idx_products_updated_by (updated_by),
    ADD CONSTRAINT fk_products_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_products_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 4. Entidades maestras: created_by / updated_by / is_deleted
-- ---------------------------------------------------------------------------

ALTER TABLE customers
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active,
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_customers_created_by (created_by),
    ADD KEY idx_customers_updated_by (updated_by),
    ADD CONSTRAINT fk_customers_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_customers_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE drivers
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active,
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_drivers_created_by (created_by),
    ADD KEY idx_drivers_updated_by (updated_by),
    ADD CONSTRAINT fk_drivers_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_drivers_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE vehicles
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active,
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_vehicles_created_by (created_by),
    ADD KEY idx_vehicles_updated_by (updated_by),
    ADD CONSTRAINT fk_vehicles_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_vehicles_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 5. orders: status + auditoría + is_deleted
-- ---------------------------------------------------------------------------

ALTER TABLE orders
    ADD COLUMN status_id BIGINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Estado del pedido; por defecto: pendiente' AFTER order_date,
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_orders_status (status_id),
    ADD KEY idx_orders_created_by (created_by),
    ADD KEY idx_orders_updated_by (updated_by),
    ADD CONSTRAINT fk_orders_status
        FOREIGN KEY (status_id) REFERENCES order_statuses (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_orders_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_orders_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 6. order_details: auditoría + is_deleted
-- ---------------------------------------------------------------------------

ALTER TABLE order_details
    ADD COLUMN created_by BIGINT UNSIGNED NOT NULL DEFAULT 999999 AFTER updated_at,
    ADD COLUMN updated_by BIGINT UNSIGNED NULL AFTER created_by,
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_by,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0',
    ADD KEY idx_order_details_created_by (created_by),
    ADD KEY idx_order_details_updated_by (updated_by),
    ADD CONSTRAINT fk_order_details_created_by
        FOREIGN KEY (created_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    ADD CONSTRAINT fk_order_details_updated_by
        FOREIGN KEY (updated_by) REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 7. media_files: alinear auditoría
-- ---------------------------------------------------------------------------

ALTER TABLE media_files
    MODIFY created_by BIGINT UNSIGNED NOT NULL,
    MODIFY updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en TimeZone 0';

SET FOREIGN_KEY_CHECKS = 1;