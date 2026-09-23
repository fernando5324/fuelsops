CREATE DATABASE IF NOT EXISTS sertocobd CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sertocobd;

CREATE TABLE tenants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id BIGINT UNSIGNED NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    legal_name VARCHAR(200) NULL,
    tax_id VARCHAR(30) NULL,
    email VARCHAR(150) NULL,
    phone VARCHAR(30) NULL,
    website VARCHAR(255) NULL,
    logo_media_file_id BIGINT UNSIGNED NULL,
    status ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT UNSIGNED NULL,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    UNIQUE KEY uk_tenants_slug (slug),
    KEY idx_tenants_status (status),
    KEY idx_tenants_account (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NULL,
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
        KEY idx_users_active (is_active),
        UNIQUE KEY uk_users_tenant_email (tenant_id, email),
        KEY idx_users_tenant (tenant_id),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON UPDATE CASCADE ON DELETE RESTRICT
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
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_advisors_active (is_active),
    INDEX idx_advisors_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_advisors_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 2. WHOLESALERS

CREATE TABLE IF NOT EXISTS wholesalers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_wholesalers_active (is_active),
    INDEX idx_wholesalers_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesalers_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 3. PLANTS

CREATE TABLE IF NOT EXISTS plants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_plants_active (is_active),
    INDEX idx_plants_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_plants_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 4. PRODUCTS

CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_products_active (is_active),
    INDEX idx_products_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_products_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 5. CUSTOMERS

CREATE TABLE IF NOT EXISTS customers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    tax_id VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,

    preferred_wholesaler_id BIGINT UNSIGNED NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_customers_tenant_tax_id (tenant_id, tax_id),

    INDEX idx_customers_name (name),
    INDEX idx_customers_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_customers_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 6. DRIVERS

CREATE TABLE IF NOT EXISTS drivers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_drivers_tenant_license (tenant_id, license_number),

    INDEX idx_drivers_name (name),
    INDEX idx_drivers_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_drivers_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 7. VEHICLES

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    license_plate VARCHAR(20) NOT NULL,

    type ENUM('TANKER', 'TRACTOR') NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_vehicles_tenant_plate (tenant_id, license_plate),

    INDEX idx_vehicles_type (type),
    INDEX idx_vehicles_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicles_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 8. ORDER STATUSES

CREATE TABLE IF NOT EXISTS order_statuses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
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

    UNIQUE KEY uq_order_statuses_tenant_code (tenant_id, code),
    INDEX idx_order_statuses_default (is_default),
    INDEX idx_order_statuses_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_statuses_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 9. ORDERS

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

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
    INDEX idx_orders_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 10. ORDER STATUS HISTORY

CREATE TABLE IF NOT EXISTS order_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    order_id BIGINT UNSIGNED NOT NULL,
    status_id BIGINT UNSIGNED NOT NULL,
    previous_status_id BIGINT UNSIGNED NULL,

    notes VARCHAR(255) NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_order_status_history_order (order_id),
    INDEX idx_osh_tenant (tenant_id),
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
        ON DELETE RESTRICT,

    CONSTRAINT fk_osh_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 11. ORDER DETAILS

CREATE TABLE IF NOT EXISTS order_details (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

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
    INDEX idx_order_details_tenant (tenant_id),
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

    CONSTRAINT fk_order_details_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
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

CREATE TABLE media_files (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'Identificador único del archivo',
    tenant_id BIGINT UNSIGNED NOT NULL COMMENT 'Tenant propietario del archivo',
    model_type VARCHAR(50) NOT NULL COMMENT 'Tabla o entidad relacionada',
    model_id BIGINT UNSIGNED NOT NULL COMMENT 'ID del registro relacionado',
    disk VARCHAR(50) NOT NULL DEFAULT 'public' COMMENT 'Disco o proveedor de almacenamiento',
    directory VARCHAR(255) NOT NULL COMMENT 'Directorio donde se almacena el archivo',
    folder VARCHAR(100) NULL COMMENT 'Carpeta lógica mostrada al usuario',
    file_name VARCHAR(255) NOT NULL COMMENT 'Nombre físico del archivo',
    extension VARCHAR(10) NOT NULL COMMENT 'Extensión del archivo',
    mime_type VARCHAR(100) NOT NULL COMMENT 'Tipo MIME del archivo',
    file_type ENUM('image','document','video','audio','other') NOT NULL DEFAULT 'image' COMMENT 'Categoría general del archivo',
    file_size BIGINT UNSIGNED NOT NULL COMMENT 'Tamaño del archivo en bytes',
    width INT UNSIGNED NULL COMMENT 'Ancho en píxeles',
    height INT UNSIGNED NULL COMMENT 'Alto en píxeles',
    hash CHAR(64) NULL COMMENT 'Hash SHA-256 para detectar archivos duplicados',
    visibility ENUM('public','private') NOT NULL DEFAULT 'public' COMMENT 'Visibilidad del archivo',
    alt_text VARCHAR(255) NULL COMMENT 'Texto alternativo para accesibilidad y SEO',
    original_name VARCHAR(255) NULL COMMENT 'Nombre original del archivo al momento de la carga',
    title VARCHAR(255) NULL COMMENT 'Título descriptivo del archivo',
    description TEXT NULL COMMENT 'Descripción opcional del archivo',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro',
    created_by BIGINT UNSIGNED NULL COMMENT 'Usuario que registró el archivo',
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT 'Fecha de la última actualización',
    updated_by BIGINT UNSIGNED NULL COMMENT 'Usuario que realizó la última actualización',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indica si el registro fue eliminado lógicamente',
    KEY idx_media_tenant (tenant_id),
    KEY idx_media_model (model_type, model_id),
    KEY idx_media_hash (hash),
    KEY idx_media_type (file_type),
    KEY idx_media_visibility (visibility),
    CONSTRAINT fk_media_files_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_media_files_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_media_files_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Repositorio centralizado de archivos multimedia del sistema';


ALTER TABLE tenants
ADD CONSTRAINT fk_tenants_logo_media
    FOREIGN KEY (logo_media_file_id) REFERENCES media_files(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

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

-- Organización principal. Toda la data de arranque pertenece a "Sertoco".
-- Las organizaciones aíslan la información (multi-tenant, tenant_id) y el
-- usuario no percibe la existencia de otras.

INSERT INTO tenants (id, account_id, name, slug, legal_name, tax_id, email, phone, website, logo_media_file_id, status, created_by)
VALUES (1, NULL, 'Sertoco', 'sertoco', 'Sertoco S.A.C.', '20560398630', 'contacto@sertoco.pe', NULL, NULL, NULL, 'active', 999999);


-- Main platform user (owner of the Sertoco organization).
-- Password hash de prueba: 'password'. Solo este usuario (is_owner = 1) y los
-- que él designe pueden crear/marcar dueños dentro de su organización.

INSERT INTO users (id, tenant_id, name, first_name, last_name, email, password, remember_token, is_owner, is_active, created_by)
VALUES (1, 1, 'sistema', 'Alejandro', 'Baltazar', 'lfbaltazarv@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', 1, 1, 999999);


-- System user used by the public form, seeded catalogs and system changes.
-- The password is intentionally empty; this user must never authenticate.
-- It uses a high id (999999) so regular users start from small ids.
-- No pertenece a ninguna organización (tenant_id NULL).

INSERT INTO users (id, name, first_name, last_name, email, password, remember_token, is_owner, is_active, created_by)
VALUES (999999, 'sistema', 'Sistema', NULL, 'sistema@sertoco.local', '', '', 0, 1, 999999);


-- Initial order statuses.
-- pendiente is the default status assigned to orders registered through the
-- public form. New statuses can be added to this catalog later.
-- Los estados pertenecen a cada organización (aquí, a Sertoco).

INSERT INTO order_statuses (id, tenant_id, code, name, description, color, is_default, is_active, created_by)
VALUES
    (1, 1, 'pending', 'Pendiente', 'Pedido registrado desde el formulario público, pendiente de atención.', 'orange', 1, 1, 999999),
    (2, 1, 'attended', 'Atendido', 'Pedido atendido por Sertoco.', 'green', 0, 1, 999999),
    (3, 1, 'cancelled', 'Anulado', 'Pedido anulado.', 'red', 0, 1, 999999);