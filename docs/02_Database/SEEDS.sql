-- SEEDS.sql
--
-- Datos de prueba para el prototipo Sertoco.
-- Idempotente: usa INSERT IGNORE con ids explícitos, por lo que puede
-- ejecutarse más de una vez sin duplicar registros.
--
-- Notas:
--  - El usuario administrador lfbaltazar@gmail.com (id 1) ya existe en la
--    base y NO se crea aquí.
--  - El usuario "sistema" (id 999999) se siembra porque es requerido por
--    las referencias NOT NULL de auditoría (ADR-005) y por el formulario
--    público (ADR-004).

-- ---------------------------------------------------------------------------
-- Usuario sistema
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO users (id, name, first_name, last_name, email, password, remember_token, is_owner, is_active, created_by)
VALUES (999999, 'sistema', 'Sistema', NULL, 'sistema@sertoco.local', '', '', 0, 1, 999999);

-- ---------------------------------------------------------------------------
-- Estados de pedido
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO order_statuses (id, code, name, description, color, is_default, is_active, created_by)
VALUES
    (1, 'pending',    'Pendiente', 'Pedido registrado desde el formulario público, pendiente de atención.', 'orange', 1, 1, 1),
    (2, 'attended',   'Atendido',  'Pedido atendido por Sertoco.',                                         'green',  0, 1, 1),
    (3, 'cancelled',  'Anulado',   'Pedido anulado.',                                                      'red',    0, 1, 1);

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO advisors (id, name, is_active, created_by) VALUES
    (1, 'Asesor Norte', 1, 1),
    (2, 'Asesor Sur',   1, 1);

INSERT IGNORE INTO wholesalers (id, name, is_active, created_by) VALUES
    (1, 'Mayorista Lima',   1, 1),
    (2, 'Mayorista Callao', 1, 1);

INSERT IGNORE INTO plants (id, name, is_active, created_by) VALUES
    (1, 'Planta Ventanilla', 1, 1),
    (2, 'Planta Lurín',      1, 1);

INSERT IGNORE INTO products (id, name, is_active, created_by) VALUES
    (1, 'Petróleo B5',   1, 1),
    (2, 'Gasolina 95',   1, 1),
    (3, 'Diésel B5',     1, 1);

-- ---------------------------------------------------------------------------
-- Clientes, conductores y vehículos
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO customers (id, tax_id, name, preferred_wholesaler_id, is_active, is_deleted, created_by) VALUES
    (1, '20123456789', 'Transportes Rojas EIRL',  1, 1, 0, 1),
    (2, '20534567891', 'AgroIndustria Sur SAC',   2, 1, 0, 1);

INSERT IGNORE INTO drivers (id, license_number, name, is_active, is_deleted, created_by) VALUES
    (1, 'D12345678', 'Juan Pérez',   1, 0, 1),
    (2, 'D87654321', 'María Gómez',  1, 0, 1);

INSERT IGNORE INTO vehicles (id, license_plate, type, is_active, is_deleted, created_by) VALUES
    (1, 'ABC-123', 'TANKER',  1, 0, 1),
    (2, 'DEF-456', 'TANKER',  1, 0, 1),
    (3, 'GHI-789', 'TRACTOR', 1, 0, 1),
    (4, 'JKL-012', 'TRACTOR', 1, 0, 1);

-- ---------------------------------------------------------------------------
-- Pedidos de ejemplo
-- ---------------------------------------------------------------------------

INSERT IGNORE INTO orders (id, order_date, status_id, advisor_id, customer_id, driver_id, tanker_id, tractor_id, notes, created_by) VALUES
    (1, NOW(), 1, 1, 1, 1, 1, 3, 'Pedido de muestra pendiente.',                                                      1),
    (2, DATE_SUB(NOW(), INTERVAL 1 DAY), 2, 2, 2, 2, 2, 4, 'Pedido de muestra atendido.',                             1);

INSERT IGNORE INTO order_details (id, order_id, scop, plant_id, wholesaler_id, product_id, gallons, sale_price, compartments, created_by) VALUES
    (1, 1, 'SCOP-0001', 1, 1, 1, 500.00, 12.5000, 2, 1),
    (2, 1, 'SCOP-0002', 2, 2, 3, 300.00, 11.3000, 1, 1),
    (3, 2, 'SCOP-0003', 1, 1, 2, 900.00, 13.1000, 3, 1);

-- Historial de estado para el pedido de muestra atendido.
INSERT IGNORE INTO order_status_history (id, order_id, status_id, previous_status_id, notes, created_by) VALUES
    (1, 2, 2, 1, 'Pedido atendido por Sertoco.', 1);