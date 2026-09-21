CREATE DATABASE IF NOT EXISTS sertocobd CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sertocobd;


CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NULL,
        email_verified_at  TIMESTAMP NULL,
        email VARCHAR(150) NOT NULL,
        password VARCHAR(255) NOT NULL,
        remember_token VARCHAR(255) NOT NULL DEFAULT '',
        is_owner TINYINT (1) NOT NULL DEFAULT 1,
        is_active TINYINT (1) NOT NULL DEFAULT 1,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by BIGINT UNSIGNED NOT NULL,
updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
        updated_by BIGINT UNSIGNED NULL,
        is_deleted TINYINT (1) NOT NULL DEFAULT 0,
        UNIQUE KEY uk_users_email (email),
        KEY idx_users_active (is_active)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;



CREATE TABLE `jobs` (
	`id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
	`queue` VARCHAR(191) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`payload` LONGTEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`attempts` TINYINT(3) UNSIGNED NOT NULL,
	`reserved_at` INT(10) UNSIGNED NULL DEFAULT NULL,
	`available_at` INT(10) UNSIGNED NOT NULL,
	`created_at` INT(10) UNSIGNED NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `jobs_queue_index` (`queue`) USING BTREE
)
COLLATE='utf8mb4_unicode_ci'
ENGINE=InnoDB
;

CREATE TABLE `job_batches` (
	`id` VARCHAR(191) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`name` VARCHAR(191) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`total_jobs` INT(11) NOT NULL,
	`pending_jobs` INT(11) NOT NULL,
	`failed_jobs` INT(11) NOT NULL,
	`failed_job_ids` LONGTEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`options` MEDIUMTEXT NULL COLLATE 'utf8mb4_unicode_ci',
	`cancelled_at` INT(10) UNSIGNED NULL DEFAULT NULL,
	`created_at` INT(10) UNSIGNED NOT NULL,
	`finished_at` INT(10) UNSIGNED NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb4_unicode_ci'
ENGINE=InnoDB
;

CREATE TABLE `failed_jobs` (
	`id` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
	`uuid` VARCHAR(191) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`connection` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`queue` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`payload` LONGTEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`exception` LONGTEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`) USING BTREE
)
COLLATE='utf8mb4_unicode_ci'
ENGINE=InnoDB
;

CREATE TABLE IF NOT EXISTS sessions (
    `id` VARCHAR(255) NOT NULL PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` LONGTEXT NOT NULL,
    `last_activity` INT NOT NULL,
    KEY `idx_sessions_user` (`user_id`),
    KEY `idx_sessions_last_activity` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    email VARCHAR(150) NOT NULL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- 1. ADVISORS

CREATE TABLE IF NOT EXISTS advisors (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_advisors_active (is_active),
    INDEX idx_advisors_created_by (created_by),
    INDEX idx_advisors_updated_by (updated_by),

    CONSTRAINT fk_advisors_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_advisors_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 2. WHOLESALERS

CREATE TABLE IF NOT EXISTS wholesalers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_wholesalers_active (is_active),
    INDEX idx_wholesalers_created_by (created_by),
    INDEX idx_wholesalers_updated_by (updated_by),

    CONSTRAINT fk_wholesalers_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesalers_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 3. PLANTS

CREATE TABLE IF NOT EXISTS plants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_plants_active (is_active),
    INDEX idx_plants_created_by (created_by),
    INDEX idx_plants_updated_by (updated_by),

    CONSTRAINT fk_plants_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_plants_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 4. PRODUCTS

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_products_active (is_active),
    INDEX idx_products_created_by (created_by),
    INDEX idx_products_updated_by (updated_by),

    CONSTRAINT fk_products_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_products_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 5. CUSTOMERS

CREATE TABLE IF NOT EXISTS customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tax_id VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,

    preferred_wholesaler_id BIGINT UNSIGNED NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_customers_tax_id (tax_id),

    INDEX idx_customers_name (name),
    INDEX idx_customers_preferred_wholesaler (preferred_wholesaler_id),
    INDEX idx_customers_active (is_active),
    INDEX idx_customers_created_by (created_by),
    INDEX idx_customers_updated_by (updated_by),

    CONSTRAINT fk_customers_preferred_wholesaler
        FOREIGN KEY (preferred_wholesaler_id)
        REFERENCES wholesalers (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_customers_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_customers_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 6. DRIVERS

CREATE TABLE IF NOT EXISTS drivers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    license_number VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_drivers_license_number (license_number),

    INDEX idx_drivers_name (name),
    INDEX idx_drivers_active (is_active),
    INDEX idx_drivers_created_by (created_by),
    INDEX idx_drivers_updated_by (updated_by),

    CONSTRAINT fk_drivers_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_drivers_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 7. VEHICLES

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    license_plate VARCHAR(20) NOT NULL,

    type ENUM('TANKER', 'TRACTOR') NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_vehicles_license_plate (license_plate),

    INDEX idx_vehicles_type (type),
    INDEX idx_vehicles_active (is_active),
    INDEX idx_vehicles_created_by (created_by),
    INDEX idx_vehicles_updated_by (updated_by),

    CONSTRAINT fk_vehicles_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicles_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 8. ORDER STATUSES

CREATE TABLE IF NOT EXISTS order_statuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    color VARCHAR(20) NULL,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
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


-- 9. ORDERS

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del pedido en America/Lima',

    status_id BIGINT UNSIGNED NOT NULL COMMENT 'Estado del pedido; por defecto: pendiente',

    advisor_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    driver_id BIGINT UNSIGNED NOT NULL,

    tanker_id BIGINT UNSIGNED NOT NULL,
    tractor_id BIGINT UNSIGNED NOT NULL,

    notes TEXT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    INDEX idx_orders_date (order_date),
    INDEX idx_orders_status (status_id),
    INDEX idx_orders_advisor (advisor_id),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_driver (driver_id),
    INDEX idx_orders_tanker (tanker_id),
    INDEX idx_orders_tractor (tractor_id),
    INDEX idx_orders_created_by (created_by),
    INDEX idx_orders_updated_by (updated_by),

    CONSTRAINT fk_orders_status
        FOREIGN KEY (status_id)
        REFERENCES order_statuses (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_advisor
        FOREIGN KEY (advisor_id)
        REFERENCES advisors (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_driver
        FOREIGN KEY (driver_id)
        REFERENCES drivers (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_tanker
        FOREIGN KEY (tanker_id)
        REFERENCES vehicles (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_tractor
        FOREIGN KEY (tractor_id)
        REFERENCES vehicles (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 10. ORDER STATUS HISTORY

CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    previous_status_id BIGINT UNSIGNED NULL,

    notes VARCHAR(255) NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
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


-- 11. ORDER DETAILS

CREATE TABLE IF NOT EXISTS order_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL,

    scop VARCHAR(50) NOT NULL,

    plant_id BIGINT UNSIGNED NOT NULL,
    wholesaler_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,

    gallons DECIMAL(12,2) NOT NULL,
    sale_price DECIMAL(12,4) NOT NULL,

    compartments TINYINT UNSIGNED NOT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    INDEX idx_order_details_order (order_id),
    INDEX idx_order_details_plant (plant_id),
    INDEX idx_order_details_wholesaler (wholesaler_id),
    INDEX idx_order_details_product (product_id),
    INDEX idx_order_details_created_by (created_by),
    INDEX idx_order_details_updated_by (updated_by),

    CONSTRAINT fk_order_details_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_order_details_plant
        FOREIGN KEY (plant_id)
        REFERENCES plants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_details_wholesaler
        FOREIGN KEY (wholesaler_id)
        REFERENCES wholesalers (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_details_product
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_details_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_details_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_details_gallons
        CHECK (gallons > 0),

    CONSTRAINT chk_order_details_sale_price
        CHECK (sale_price >= 0),

    CONSTRAINT chk_order_details_compartments
        CHECK (compartments > 0)
) ENGINE=InnoDB;


-- 12. ORDER FILES

CREATE TABLE IF NOT EXISTS media_files (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
        COMMENT 'Unique file identifier',

    model_type VARCHAR(50) NOT NULL
        COMMENT 'Related entity type',

    model_id BIGINT UNSIGNED NOT NULL
        COMMENT 'ID of the related record',

    disk VARCHAR(50) NOT NULL DEFAULT 'public'
        COMMENT 'Storage disk or provider',

    directory VARCHAR(255) NOT NULL
        COMMENT 'Directory where the file is stored',

    file_name VARCHAR(255) NOT NULL
        COMMENT 'Physical file name',

    extension VARCHAR(10) NOT NULL
        COMMENT 'File extension',

    mime_type VARCHAR(100) NOT NULL
        COMMENT 'File MIME type',

    file_type ENUM(
        'image',
        'document',
        'other'
    ) NOT NULL DEFAULT 'document'
        COMMENT 'General file category',

    file_size BIGINT UNSIGNED NOT NULL
        COMMENT 'File size in bytes',

    width INT UNSIGNED NULL
        COMMENT 'Image width in pixels',

    height INT UNSIGNED NULL
        COMMENT 'Image height in pixels',

    hash CHAR(64) NULL
        COMMENT 'SHA-256 hash for duplicate detection',

    visibility ENUM(
        'public',
        'private'
    ) NOT NULL DEFAULT 'private'
        COMMENT 'File visibility',

    original_name VARCHAR(255) NULL
        COMMENT 'Original file name when uploaded',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        COMMENT 'Creation date',

    created_by BIGINT UNSIGNED NOT NULL
        COMMENT 'User who uploaded the file; public form uses the system user',

    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima'
        COMMENT 'Last update date',

    updated_by BIGINT UNSIGNED NULL
        COMMENT 'User who last updated the file',

    is_deleted TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Logical deletion flag',

    KEY idx_media_model (model_type, model_id),
    KEY idx_media_hash (hash),
    KEY idx_media_type (file_type),
    KEY idx_media_visibility (visibility),
    KEY idx_media_deleted (is_deleted),

    CONSTRAINT fk_media_files_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_media_files_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Centralized repository for system files';


-- PROVISIONAL ORDER CALCULATIONS
--
-- Total gallons:
-- SELECT SUM(gallons) AS total_gallons
-- FROM order_details
-- WHERE order_id = 1;
--
-- Total sale:
-- SELECT SUM(gallons * sale_price) AS total_sale
-- FROM order_details
-- WHERE order_id = 1;
--
-- Current provisional business rule:
-- detail_total = gallons * sale_price
-- total_gallons = SUM(gallons)
-- total_sale = SUM(gallons * sale_price)


-- SEEDS
--

-- System user used by the public form, seeded catalogs and system changes.
-- The password is intentionally empty; this user must never authenticate.
-- It uses a high id (999999) so regular users start from small ids.

INSERT INTO users (id, name, first_name, last_name, email, password, remember_token, is_owner, is_active, created_by)
VALUES (999999, 'sistema', 'Sistema', NULL, 'sistema@sertoco.local', '', '', 0, 1, 999999);


-- Initial order statuses.
-- pendiente is the default status assigned to orders registered through the
-- public form. New statuses can be added to this catalog later.

INSERT INTO order_statuses (id, code, name, description, color, is_default, is_active, created_by)
VALUES
    (1, 'pending', 'Pendiente', 'Pedido registrado desde el formulario público, pendiente de atención.', 'orange', 1, 1, 999999),
    (2, 'attended', 'Atendido', 'Pedido atendido por Sertoco.', 'green', 0, 1, 999999),
    (3, 'cancelled', 'Anulado', 'Pedido anulado.', 'red', 0, 1, 999999);