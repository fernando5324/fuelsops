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
    -- Identidad y presentacion del cliente (ADR-019). NULL = se usan los
    -- valores por defecto de config/brand.php. Estructura esperada:
    --   {"colors": {"primary": "#1B3A6B", "accent": "#F47920", ...},
    --    "format": {"locale": "es-PE", "symbol": "S/", ...}}
    -- Prioridad: tenants.details > config/brand.php. Solo se aceptan claves
    -- que ya existan en el archivo y, para colores, formato #RRGGBB.
    details JSON NULL,
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

-- 7. VEHICLES (cisternas)

-- Una fila es una CISTERNA con sus dos placas: la de la cisterna y la del
-- tracto que la mueve (ADR-023). Antes el tracto era una fila aparte
-- distinguished por `type`, lo que obligaba a duplicar la placa en dos
-- entidades; ahora el tracto es un valor al mismo nivel que la cisterna, y
-- puede coincidir con ella.
--
-- `tractor_plate` es el dato vigente del parque. El histórico de cada pedido se
-- conserva en `orders.tractor_plate` (snapshot del día).

CREATE TABLE IF NOT EXISTS vehicles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    license_plate VARCHAR(20) NOT NULL COMMENT 'Placa de la cisterna',
    tractor_plate VARCHAR(20) NULL COMMENT 'Placa del tracto asociado (puede ser igual a license_plate)',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_vehicles_tenant_plate (tenant_id, license_plate),

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
    code VARCHAR(50) NULL,
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

    -- Código operativo visible para el usuario (ADR-020). Es independiente del
    -- id interno (que sigue siendo la clave técnica de URLs, relaciones y
    -- adjuntos), es editable desde el panel y único SOLO dentro del tenant:
    -- UNIQUE (tenant_id, code). El prefijo y el relleno salen de
    -- tenant_settings (ADR-021) y el número, de order_code_counters: nunca de
    -- MAX(code), porque el código es editable y admite formatos heredados.
    code VARCHAR(50) NOT NULL COMMENT 'Código operativo del pedido, único por tenant (ADR-020)',

    -- Origen del registro (ADR-025): `public` = enviado por el cliente desde el
    -- formulario web; `panel` = alta manual de un usuario del panel. Es
    -- INDEPENDIENTE de `created_by`, que siempre guarda quién lo envió de verdad
    -- (usuario sistema 999999 cuando el formulario web se usa sin sesión). La UI
    -- usa esta columna para no atribuir al usuario principal un pedido del
    -- cliente. No se modifica al editar el pedido y no se recycle.
    source VARCHAR(20) NOT NULL DEFAULT 'panel' COMMENT 'Origen del registro: public (formulario web del cliente) | panel (alta manual) (ADR-025)',

    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora del pedido en America/Lima',

    status_id BIGINT UNSIGNED NOT NULL COMMENT 'Estado del pedido; por defecto: pendiente',

    advisor_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    driver_id BIGINT UNSIGNED NOT NULL,

    tanker_id BIGINT UNSIGNED NOT NULL COMMENT 'Cisterna del pedido (fila de vehicles)',
    tractor_plate VARCHAR(20) NULL COMMENT 'Snapshot de la placa de tracto usada ese día (ADR-023); el dato vigente vive en vehicles.tractor_plate',

    notes TEXT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    INDEX idx_orders_date (order_date),
    INDEX idx_orders_tenant (tenant_id),
    -- Unicidad del código dentro de la organización (ADR-020 §4). NO incluye
    -- is_deleted a propósito: el código de un pedido en papelera queda
    -- reservado y no se recicla (el contador nunca reutiliza números). La
    -- validación de duplicados al editar usa Rule::unique, que consulta sin
    -- global scopes, así que también ve los pedidos dados de baja.
    UNIQUE KEY uq_orders_tenant_code (tenant_id, code),
    INDEX idx_orders_status (status_id),
    INDEX idx_orders_advisor (advisor_id),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_driver (driver_id),
    INDEX idx_orders_tanker (tanker_id),
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
        CHECK (sale_price >= 0)
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


-- 13. PLANT PRODUCTS (ADR-010)

CREATE TABLE IF NOT EXISTS plant_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    plant_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Baja lógica de la relación planta+producto (se conservan precios e historial)',

    -- Margen S/ de ESTA relación (columna R del Excel "MARGEN SERTOCO"). Es un
    -- MONTO absoluto, no una tasa: S = Q + margin. Distinto del
    -- pricing_configurations.margin, que solo es el valor por defecto para las
    -- relaciones nuevas. IGV y percepción siguen siendo globales.
    margin DECIMAL(12,4) NOT NULL DEFAULT 0.1300 COMMENT 'Margen S/ por relación (columna R del Excel): S = Q + margen',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    -- El único NO incluye is_deleted a propósito: no puede haber dos filas de
    -- la misma relación. Al dar de baja lógicamente una relación, volver a
    -- crearla la REVIVE (is_deleted = 0) en vez de insertar una nueva fila.
    UNIQUE KEY uq_plant_products_tenant_plant_product (tenant_id, plant_id, product_id),

    INDEX idx_plant_products_tenant (tenant_id),
    INDEX idx_plant_products_plant (plant_id),
    INDEX idx_plant_products_product (product_id),
    INDEX idx_plant_products_active (is_active),
    INDEX idx_plant_products_created_by (created_by),
    INDEX idx_plant_products_updated_by (updated_by),

    CONSTRAINT fk_plant_products_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_plant_products_plant
        FOREIGN KEY (plant_id)
        REFERENCES plants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_plant_products_product
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_plant_products_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_plant_products_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 14. PRICE IMPORT BATCHES (ADR-010)

CREATE TABLE IF NOT EXISTS price_import_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    total_rows INT UNSIGNED NOT NULL DEFAULT 0,
    new_rows INT UNSIGNED NOT NULL DEFAULT 0,
    updated_rows INT UNSIGNED NOT NULL DEFAULT 0,
    unchanged_rows INT UNSIGNED NOT NULL DEFAULT 0,
    error_rows INT UNSIGNED NOT NULL DEFAULT 0,

    started_at DATETIME NULL DEFAULT NULL,
    completed_at DATETIME NULL DEFAULT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_price_import_batches_tenant (tenant_id),
    INDEX idx_price_import_batches_status (status),
    INDEX idx_price_import_batches_created_by (created_by),
    INDEX idx_price_import_batches_updated_by (updated_by),

    CONSTRAINT fk_price_import_batches_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_import_batches_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_import_batches_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 15. WHOLESALER PRICES (ADR-010)

CREATE TABLE IF NOT EXISTS wholesaler_prices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    plant_product_id BIGINT UNSIGNED NOT NULL,
    wholesaler_id BIGINT UNSIGNED NOT NULL,

    price DECIMAL(12,4) NULL,

    import_batch_id BIGINT UNSIGNED NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    UNIQUE KEY uq_wholesaler_prices_relation (tenant_id, plant_product_id, wholesaler_id),

    INDEX idx_wholesaler_prices_tenant (tenant_id),
    INDEX idx_wholesaler_prices_plant_product (plant_product_id),
    INDEX idx_wholesaler_prices_wholesaler (wholesaler_id),
    INDEX idx_wholesaler_prices_import_batch (import_batch_id),
    INDEX idx_wholesaler_prices_created_by (created_by),
    INDEX idx_wholesaler_prices_updated_by (updated_by),

    CONSTRAINT fk_wholesaler_prices_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesaler_prices_plant_product
        FOREIGN KEY (plant_product_id)
        REFERENCES plant_products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesaler_prices_wholesaler
        FOREIGN KEY (wholesaler_id)
        REFERENCES wholesalers (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesaler_prices_import_batch
        FOREIGN KEY (import_batch_id)
        REFERENCES price_import_batches (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesaler_prices_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_wholesaler_prices_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 16. PRICE IMPORT ITEMS (ADR-010)

CREATE TABLE IF NOT EXISTS price_import_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    import_batch_id BIGINT UNSIGNED NOT NULL,

    `row_number` INT UNSIGNED NOT NULL,

    plant_name VARCHAR(150) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    wholesaler_name VARCHAR(150) NOT NULL,

    previous_price DECIMAL(12,4) NULL,
    new_price DECIMAL(12,4) NULL,

    -- Margen S/ de la fila (columna R del Excel), replicado en cada item de la
    -- fila para poder auditarlo y aplicarlo en confirm() sin releer el archivo.
    margin DECIMAL(12,4) NULL DEFAULT NULL COMMENT 'Margen S/ leído de la columna R del Excel (por fila)',

    status VARCHAR(20) NOT NULL,
    error_message TEXT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_price_import_items_tenant (tenant_id),
    INDEX idx_price_import_items_batch (import_batch_id),
    INDEX idx_price_import_items_status (status),
    INDEX idx_price_import_items_created_by (created_by),
    INDEX idx_price_import_items_updated_by (updated_by),

    CONSTRAINT fk_price_import_items_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_import_items_batch
        FOREIGN KEY (import_batch_id)
        REFERENCES price_import_batches (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_import_items_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_import_items_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 17. PRICING CONFIGURATIONS (ADR-010)

CREATE TABLE IF NOT EXISTS pricing_configurations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    name VARCHAR(150) NOT NULL,

    -- margin aquí es solo el VALOR POR DEFECTO para las relaciones nuevas
    -- (matriz de precios e importación de Excel). El margen con el que calcula
    -- cada relación vive en plant_products.margin.
    margin DECIMAL(12,4) NOT NULL DEFAULT 0.1300 COMMENT 'Margen S/ por defecto para relaciones nuevas; el margen que usa el motor es plant_products.margin (columna R del Excel)',
    igv_rate DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    perception_rate DECIMAL(12,4) NOT NULL DEFAULT 0.0000,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    effective_from DATETIME NULL DEFAULT NULL,
    effective_until DATETIME NULL DEFAULT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_pricing_configurations_tenant (tenant_id),
    INDEX idx_pricing_configurations_active (is_active),
    INDEX idx_pricing_configurations_created_by (created_by),
    INDEX idx_pricing_configurations_updated_by (updated_by),

    CONSTRAINT fk_pricing_configurations_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pricing_configurations_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_pricing_configurations_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 18. PRICE CALCULATIONS (ADR-010) — append-only: snapshot histórico inmutable

CREATE TABLE IF NOT EXISTS price_calculations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,

    plant_product_id BIGINT UNSIGNED NOT NULL,
    wholesaler_price_id BIGINT UNSIGNED NOT NULL,
    pricing_configuration_id BIGINT UNSIGNED NOT NULL,

    calculation_version VARCHAR(20) NOT NULL,

    calculation_data JSON NOT NULL,

    calculated_at DATETIME NOT NULL COMMENT 'Fecha y hora del cálculo en America/Lima',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT UNSIGNED NOT NULL,

    INDEX idx_price_calculations_tenant (tenant_id),
    INDEX idx_price_calculations_plant_product (plant_product_id),
    INDEX idx_price_calculations_wholesaler_price (wholesaler_price_id),
    INDEX idx_price_calculations_configuration (pricing_configuration_id),
    INDEX idx_price_calculations_calculated_at (calculated_at),
    INDEX idx_price_calculations_created_by (created_by),

    CONSTRAINT fk_price_calculations_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_calculations_plant_product
        FOREIGN KEY (plant_product_id)
        REFERENCES plant_products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_calculations_wholesaler_price
        FOREIGN KEY (wholesaler_price_id)
        REFERENCES wholesaler_prices (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_calculations_configuration
        FOREIGN KEY (pricing_configuration_id)
        REFERENCES pricing_configurations (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_price_calculations_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 19. ORDER DELETIONS (ADR-011)

-- Registro histórico de cada eliminación lógica de un pedido (papelera).
-- No es una tabla de "estado": un pedido con orders.is_deleted = 1 tiene un
-- registro con restored_at IS NULL. Al restaurar se cierra ese registro; una
-- nueva eliminación crea otro registro (historial completo por pedido).
-- Este registro es permanente: nunca se elimina físicamente.

CREATE TABLE IF NOT EXISTS order_deletions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,

    reason VARCHAR(500) NOT NULL,

    deleted_at DATETIME NOT NULL,
    deleted_by BIGINT UNSIGNED NOT NULL,

    snapshot JSON NULL,

    affected_media_ids JSON NULL COMMENT 'ids de media_files marcados como is_deleted=1 en esta eliminación (para restaurar solo los afectados)',

    restored_at DATETIME NULL,
    restored_by BIGINT UNSIGNED NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    INDEX idx_order_deletions_tenant (tenant_id),
    INDEX idx_order_deletions_order (order_id),
    INDEX idx_order_deletions_deleted_by (deleted_by),
    INDEX idx_order_deletions_deleted_at (deleted_at),
    INDEX idx_order_deletions_restored_by (restored_by),

    CONSTRAINT fk_order_deletions_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deletions_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deletions_deleted_by
        FOREIGN KEY (deleted_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deletions_restored_by
        FOREIGN KEY (restored_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deletions_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deletions_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 20. ORDER DEPOSITS (ADR-013)

-- Depósitos del cliente registrados manualmente a partir de los vouchers
-- (operaciones bancarias) adjuntos al pedido. Un pedido tiene N depósitos y
-- cada depósito indica banco, número de operación, fecha y monto; el total se
-- calcula en pantalla (SUM(amount)), no se almacena.
-- El alta es SIEMPRE manual: los adjuntos (media_files) son vouchers que el
-- usuario lee y transcribe, el sistema no interpreta sus importes.
-- Estos depósitos son datos históricos del pedido: la papelera (ADR-011) NO
-- los toca, por eso la FK a orders es ON DELETE RESTRICT (nunca CASCADE) y el
-- borrado de un depósito es lógico (is_deleted).

CREATE TABLE IF NOT EXISTS order_deposits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,

    deposit_date DATE NOT NULL COMMENT 'Fecha del depósito segun el voucher adjunto',
    bank VARCHAR(100) NOT NULL,
    operation_number VARCHAR(50) NOT NULL,
    amount DECIMAL(12,4) NOT NULL,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    INDEX idx_order_deposits_tenant (tenant_id),
    INDEX idx_order_deposits_order (order_id),
    INDEX idx_order_deposits_date (deposit_date),
    INDEX idx_order_deposits_created_by (created_by),
    INDEX idx_order_deposits_updated_by (updated_by),

    CONSTRAINT fk_order_deposits_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deposits_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deposits_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_deposits_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_deposits_amount
        CHECK (amount > 0)
) ENGINE=InnoDB;

-- 21. ORDER COMPARTMENTS (ADR-015,vehicle_id en ADR-023)
--
-- Distribución por compartimentos de la cisterna: qué producto, de qué línea del
-- detalle y cuántos galones van en cada compartimento. Un pedido tiene N
-- compartimentos, uno por fila, y `compartment_number` es su numeración 1..N.
-- El formulario público declara cuántos compartimentos se necesitan y dibuja esa
-- cantidad de filas; el producto y el SCOP de cada fila SIEMPRE provienen de una
-- línea de `order_details` del mismo pedido (el backend lo valida), por eso la
-- tabla guarda esos tres datos denormalizados en lugar de una FK a
-- `order_details`: la edición del pedido en el panel da de baja y recrea los
-- detalles (§ update de OrderService), y una FK quedaría apuntando a filas
-- borradas lógicamente.
-- `vehicle_id` es la cisterna a la que se repartió la carga (ADR-023). Es
-- redundante con `orders.tanker_id`, y a propósito: (a) hace directa la consulta
-- "distribuciones de esta cisterna" que usa el autocompletado, (b) conserva la
-- cisterna aunque algún día se corrigiera la del pedido, y (c) documenta en la
-- propia fila dónde se repartió. El servidor lo escribe siempre desde la cisterna
-- del pedido, nunca lo toma del formulario.
-- La cantidad de compartimentos NO se persiste: es el número de filas
-- (COUNT(*)), igual que el total de los depósitos se calcula en pantalla
-- (ADR-013). El formulario la envía y se valida contra la cantidad de filas.
-- La suma de `volume` se muestra al pie como total de galones, pero no bloquea el
-- registro del pedido si no cuadra con el total del detalle: es un aviso visual
-- (ADR-015).
-- Estos datos son históricos del pedido: la papelera (ADR-011) NO los toca, por
-- eso la FK a orders es ON DELETE RESTRICT (nunca CASCADE). El borrado de un
-- compartimento es lógico (is_deleted); la edición del pedido en el panel da de
-- baja los previos y crea los nuevos.
-- Sin índice único en (order_id, compartment_number): el scope global de
-- LogicalDelete escondería la fila dada de baja y el INSERT chocaría con el
-- índice (mismo gotcha que plant_products y que vehicle_compartments). La
-- unicidad la valida el request.

CREATE TABLE IF NOT EXISTS order_compartments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT UNSIGNED NOT NULL,
    order_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL COMMENT 'Cisterna (vehicles) a la que se repartió la carga',

    compartment_number TINYINT UNSIGNED NOT NULL COMMENT 'Numeración 1..N del compartimento',
    product_id BIGINT UNSIGNED NOT NULL COMMENT 'Producto de la línea del detalle asignada al compartimento',
    scop VARCHAR(50) NOT NULL COMMENT 'SCOP de la línea del detalle',
    volume DECIMAL(12,2) NOT NULL COMMENT 'Volumen en galones asignado al compartimento',

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    INDEX idx_order_compartments_tenant (tenant_id),
    INDEX idx_order_compartments_order (order_id),
    INDEX idx_order_compartments_vehicle (vehicle_id),
    INDEX idx_order_compartments_product (product_id),
    INDEX idx_order_compartments_created_by (created_by),
    INDEX idx_order_compartments_updated_by (updated_by),

    CONSTRAINT fk_order_compartments_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_compartments_order
        FOREIGN KEY (order_id)
        REFERENCES orders (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_compartments_product
        FOREIGN KEY (product_id)
        REFERENCES products (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_compartments_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_compartments_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_compartments_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_order_compartments_volume
        CHECK (volume > 0)
) ENGINE=InnoDB;


-- 22. TENANT SETTINGS (ADR-021, ADR-026)

-- Configuración operativa y de presentación de cada organización (1:1 con
-- `tenants`, que conserva la identidad de la entidad: nombre comercial, RUC,
-- correo, teléfono, logo, ver ADR-026). De esta tabla se usan hoy
-- `order_code_prefix`, `order_code_start` y `order_code_padding` para
-- generar el código del pedido (ADR-020), y el resto alimenta las páginas
-- de Configuración (/configuracion/compania y /configuracion/sistema,
-- ADR-026): descripción, dirección, horario, redes y preferencias
-- (idioma/zona horaria).
--
-- `order_code_start` es el número DESDE el cual comienza la generación, no el
-- contador: el avance real vive en `order_code_counters` (sección 23), porque
-- el código es editable y no se puede deducir del anterior.
--
-- `is_deleted` se mantiene por convención del proyecto, pero conceptualmente
-- esta tabla no se elimina: la configuración simplemente se actualiza. El
-- UNIQUE (tenant_id) impide tener más de una fila por organización.

CREATE TABLE IF NOT EXISTS tenant_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT UNSIGNED NOT NULL,

    organization_name VARCHAR(150) NOT NULL DEFAULT '' COMMENT 'Nombre comercial (espejo de tenants.name, ADR-026)',
    n_document VARCHAR(30) NOT NULL DEFAULT '' COMMENT 'Número de documento (dato reservado, no se muestra)',

    organization_description VARCHAR(500) NULL,

    default_language VARCHAR(10) NOT NULL DEFAULT 'es',
    timezone VARCHAR(100) NOT NULL DEFAULT 'America/Lima',

    address TEXT NULL,

    business_hours JSON NULL,
    social_links JSON NULL,
    branding JSON NULL,

    order_code_prefix VARCHAR(20) NOT NULL DEFAULT 'PED' COMMENT 'Prefijo del código de pedido (ADR-020/021)',
    order_code_start BIGINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Número inicial de la secuencia de códigos',
    order_code_padding SMALLINT UNSIGNED NOT NULL DEFAULT 6 COMMENT 'Dígitos de relleno del código (PED-000001)',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT UNSIGNED NULL,

    updated_at TIMESTAMP NULL DEFAULT NULL
        ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    UNIQUE KEY uk_tenant_settings_tenant (tenant_id),
    INDEX idx_tenant_settings_created_by (created_by),
    INDEX idx_tenant_settings_updated_by (updated_by),

    CONSTRAINT fk_tenant_settings_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_tenant_settings_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_tenant_settings_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 23. ORDER CODE COUNTERS (ADR-020 §13)

-- Secuencia independiente por organización para el código de pedido. Existe
-- para NO depender de `MAX(code) + 1`: el código es editable y puede tener
-- formatos distintos (ADR-020 §12), así que el siguiente número no se deduce
-- del anterior.
--
-- `last_number` es el último número ENTREGADO (no el inicial de
-- tenant_settings.order_code_start). Se incrementa con `lockForUpdate()` dentro
-- de la transacción que crea el pedido; el índice único
-- uq_orders_tenant_code queda como red de seguridad. Los números nunca se
-- reciclan, tampoco para pedidos en papelera.
--
-- Tabla técnica (no de negocio): por eso no lleva `is_deleted`. Al dar de
-- alta una entidad nueva se crea su fila con `last_number = 0` y el primer
-- código usa `order_code_start` de su tenant_settings.

CREATE TABLE IF NOT EXISTS order_code_counters (
    tenant_id BIGINT UNSIGNED PRIMARY KEY,

    last_number BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Último número de secuencia entregado a la organización',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
--
-- Desde ADR-013 la ganancia NO es (total_sale - total_purchase) sino la suma
-- de los márgenes configurados por relación planta+producto, uno por galón
-- (plant_products.margin, columna R del Excel):
-- detail_margin_amount = gallons * plant_products.margin   (por detalle)
-- gain = SUM(detail_margin_amount)                         (total del pedido)
-- total_purchase sigue siendo SUM(gallons * precio de compra de la celda
-- winner de wholesaler_prices) y se muestra aparte en el resumen financiero.


-- 24. VEHICLE COMPARTMENTS (ADR-023)
--
-- Plantilla de cámaras de cada cisterna: cuántas tiene y qué volumen (Volumen
-- Gas) maneja cada una. Es la fuente del autocompletado del formulario público
-- y de la edición del pedido: al escribir la placa de una cisterna ya
-- registrada, se dibujan sus compartimentos con el volumen precargado y el
-- usuario lo ajusta si la carga es distinta.
--
-- Es MAESTRA del vehículo, no del pedido: lo que se cargó cada día vive en
-- `order_compartments` (§21). Aquí va "cómo es la cisterna"; allí "cuánto se
-- puso en cada cámara ese día".
--
-- La crea el primer pedido que declara la distribución de esa cisterna y la
-- reconcilia cada alta o edición posterior con lo que el usuario declaró
-- (última realidad gana). NO tiene interfaz propia todavía: se administra a
-- través del formulario público.
--
-- `scop` es opcional a propósito (una cámara puede llevar cualquier producto):
-- cuando viene informado sirve para enlazar sola la fila con la línea del
-- detalle que coincide.
--
-- Sin índice único en (vehicle_id, compartment_number): la reconciliación da de
-- baja las filas que sobran y el scope global de `LogicalDelete` escondería la
-- dada de baja, así que un índice único haría chocar el INSERT (mismo gotcha que
-- `order_compartments` y `plant_products`).

CREATE TABLE IF NOT EXISTS vehicle_compartments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT UNSIGNED NOT NULL,
    vehicle_id BIGINT UNSIGNED NOT NULL COMMENT 'Cisterna (fila de vehicles) a la que pertenece la cámara',

    compartment_number TINYINT UNSIGNED NOT NULL COMMENT 'Numeración 1..N de la cámara dentro de la cisterna',
    scop VARCHAR(50) NULL COMMENT 'SCOP que suele cargar la cámara; NULL si sirve para cualquiera',
    volume DECIMAL(12,2) NOT NULL COMMENT 'Volumen en galones (Volumen Gas) de la cámara',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL COMMENT 'Fecha y hora del registro en America/Lima',
    created_by BIGINT UNSIGNED NOT NULL,
    updated_by BIGINT UNSIGNED NULL,

    is_deleted TINYINT(1) NOT NULL DEFAULT 0,

    INDEX idx_vehicle_compartments_tenant (tenant_id),
    INDEX idx_vehicle_compartments_vehicle (vehicle_id),
    INDEX idx_vehicle_compartments_created_by (created_by),
    INDEX idx_vehicle_compartments_updated_by (updated_by),

    CONSTRAINT fk_vehicle_compartments_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicle_compartments_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicle_compartments_created_by
        FOREIGN KEY (created_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_vehicle_compartments_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_vehicle_compartments_volume
        CHECK (volume > 0)
) ENGINE=InnoDB;


-- SEEDS
--

-- Organización principal. Toda la data de arranque pertenece a "fuels-ops".
-- Las organizaciones aíslan la información (multi-tenant, tenant_id) y el
-- usuario no percibe la existencia de otras.

INSERT INTO tenants (id, account_id, name, slug, legal_name, tax_id, email, phone, website, logo_media_file_id, status, created_by)
VALUES (1, NULL, 'fuels-ops', 'fuelsops', 'fuelsops S.A.C.', '20560398630', 'contacto@fuelsops.com', NULL, NULL, NULL, 'active', 999999);


-- Main platform user (owner of the Sertoco organization).
-- Password hash de prueba: 'password'. Solo este usuario (is_owner = 1) y los
-- que él designe pueden crear/marcar dueños dentro de su organización.

INSERT INTO users (id, tenant_id, name, first_name, last_name, email, password, remember_token, is_owner, is_active, created_by)
VALUES (1, 1, 'lfbaltazarv', 'Luis', 'Baltazar', 'lfbaltazarv@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '', 1, 1, 999999);


-- System user used by the public form, seeded catalogs and system changes.
-- The password is intentionally empty; this user must never authenticate.
-- It uses a high id (999999) so regular users start from small ids.
-- No pertenece a ninguna organización (tenant_id NULL).

INSERT INTO users (id, name, first_name, last_name, email, password, remember_token, is_owner, is_active, created_by)
VALUES (999999, 'sistema', 'Sistema', NULL, 'sistema@sertoco.local', '', '', 0, 1, 999999);


-- Initial order statuses.
-- pendiente is the default status assigned to orders registered through the
-- public form. New statuses can be added to this catalog later.
-- Los estados pertenecen a cada organización (aquí, a fuels-ops).

INSERT INTO order_statuses (id, tenant_id, code, name, description, color, is_default, is_active, created_by)
VALUES
    (1, 1, 'pending', 'Pendiente', 'Pedido registrado desde el formulario público, pendiente de atención.', 'orange', 1, 1, 999999),
    (2, 1, 'attended', 'Atendido', 'Pedido atendido por fuels-ops.', 'green', 0, 1, 999999),
    (3, 1, 'cancelled', 'Anulado', 'Pedido anulado.', 'red', 0, 1, 999999);


-- Pricing configuration (ADR-010). Módulo de precios: parámetros del motor de cálculo.
-- Porcentajes como valores decimales: margen 13%, IGV 18%, percepción 1%.

INSERT INTO pricing_configurations (id, tenant_id, name, margin, igv_rate, perception_rate, is_active, effective_from, created_by)
VALUES (1, 1, 'Configuración estándar', 0.1300, 0.1800, 0.0100, 1, NOW(), 999999);