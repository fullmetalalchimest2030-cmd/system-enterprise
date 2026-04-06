-- =============================================
-- ESTRUCTURA DE BASE DE DATOS - FLORERÍA
-- =============================================

-- Configuración inicial
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- =============================================
-- TIPOS ENUM
-- =============================================

CREATE TYPE cashbox_status AS ENUM ('open', 'closed');
CREATE TYPE sale_status AS ENUM ('completed', 'cancelled', 'refunded');

-- =============================================
-- TABLAS
-- =============================================

-- Tabla de usuarios
CREATE TABLE users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email character varying(150) NOT NULL UNIQUE,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    is_active boolean DEFAULT true,
    phone character varying(20),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

-- Tabla de roles
CREATE TABLE roles (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name character varying(50) NOT NULL UNIQUE,
    description character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de permisos
CREATE TABLE permissions (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code character varying(100) NOT NULL UNIQUE,
    description character varying(255)
);

-- Relación roles-permisos
CREATE TABLE role_permissions (
    role_id smallint NOT NULL,
    permission_id smallint NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- Relación usuarios-roles
CREATE TABLE user_roles (
    user_id bigint NOT NULL,
    role_id smallint NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

-- Tabla de categorías
CREATE TABLE categories (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name character varying(100) NOT NULL UNIQUE,
    description character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

-- Tabla de productos
CREATE TABLE products (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id integer NOT NULL,
    name character varying(150) NOT NULL,
    sku character varying(100),
    unit_of_measure character varying(20) NOT NULL,
    cost_price numeric(14,4) NOT NULL,
    sell_price numeric(14,2) NOT NULL,
    stock_cached numeric(14,4) DEFAULT 0,
    min_stock numeric(14,4) DEFAULT 0,
    description character varying(500),
    image_url character varying(500),
    show_in_catalog boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT products_stock_cached_check CHECK (stock_cached >= 0)
);

-- Tabla de cajas
CREATE TABLE cashboxes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint NOT NULL,
    opening_amount numeric(14,2) NOT NULL,
    closing_amount numeric(14,2),
    expected_amount numeric(14,2),
    difference numeric(14,2),
    status cashbox_status DEFAULT 'open',
    opened_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    closed_at timestamp with time zone
);

-- Tipos de flujo de caja
CREATE TABLE cash_flow_types (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code character varying(50) NOT NULL UNIQUE
);

-- Flujo de caja
CREATE TABLE cash_flow (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cashbox_id bigint NOT NULL,
    flow_type_id smallint NOT NULL,
    reference_table character varying(50),
    reference_id bigint,
    amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Métodos de pago
CREATE TABLE payment_methods (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code character varying(50) NOT NULL UNIQUE,
    description character varying(100)
);

-- Pagos
CREATE TABLE payments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id bigint,
    cashbox_id bigint NOT NULL,
    payment_method_id smallint NOT NULL,
    amount numeric(14,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Ventas
CREATE TABLE sales (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_number character varying(25) UNIQUE,
    user_id bigint NOT NULL,
    cashbox_id bigint NOT NULL,
    total_amount numeric(14,2) NOT NULL,
    customer_identifier character varying(20),
    customer_name character varying(150),
    status sale_status DEFAULT 'completed',
    subtotal numeric(14,2) DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0,
    discount_amount numeric(14,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);

-- Ítems de venta
CREATE TABLE sale_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id bigint NOT NULL,
    product_id bigint,
    recipe_id bigint,
    item_name_snapshot character varying(150) NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit_price_at_sale numeric(14,2) NOT NULL,
    unit_cost_at_sale numeric(14,4) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_or_recipe CHECK (
        ((product_id IS NOT NULL AND recipe_id IS NULL) OR 
         (product_id IS NULL AND recipe_id IS NOT NULL))
    )
);

-- Gastos
CREATE TABLE expenses (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cashbox_id bigint NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    amount numeric(14,2) NOT NULL,
    user_id bigint,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT expenses_amount_check CHECK (amount > 0)
);

-- Recetas
CREATE TABLE recipes (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name character varying(150) NOT NULL,
    suggested_price numeric(14,2),
    description text,
    category_id integer,
    total_cost numeric(10,2),
    preparation_time integer,
    is_active boolean DEFAULT true,
    image_url character varying(500),
    show_in_catalog boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);

-- Ítems de receta
CREATE TABLE recipe_items (
    recipe_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(14,4) NOT NULL,
    deleted_at timestamp with time zone,
    PRIMARY KEY (recipe_id, product_id)
);

-- Tipos de movimiento de stock
CREATE TABLE stock_movement_types (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code character varying(50) NOT NULL UNIQUE
);

-- Movimientos de stock
CREATE TABLE stock_movements (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id bigint NOT NULL,
    movement_type_id smallint NOT NULL,
    quantity numeric(14,4) NOT NULL,
    unit_cost numeric(14,4),
    reference_table character varying(50),
    reference_id bigint,
    user_id bigint,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Series de documentos
CREATE TABLE document_series (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code character varying(10) NOT NULL UNIQUE,
    prefix character varying(5) NOT NULL,
    current_number integer DEFAULT 0,
    is_active boolean DEFAULT true
);

-- Logs de auditoría
CREATE TABLE audit_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id bigint,
    action character varying(150) NOT NULL,
    module character varying(100),
    reference_table character varying(50),
    reference_id bigint,
    old_values jsonb,
    new_values jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Notificaciones
CREATE TABLE notifications (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'warning',
    message text NOT NULL,
    reference_table character varying(50),
    reference_id bigint,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- FUNCIONES / TRIGGERS
-- =============================================

-- Función para prevenir eliminación física
CREATE OR REPLACE FUNCTION prevent_physical_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Delete físico no permitido. Usa soft delete (deleted_at).';
END;
$$;

-- Función para registrar flujo de caja por pago
CREATE OR REPLACE FUNCTION fn_payment_to_cashflow() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO cash_flow (cashbox_id, flow_type_id, reference_table, reference_id, amount)
    VALUES (
        NEW.cashbox_id,
        (SELECT id FROM cash_flow_types WHERE code = 'sale_income'),
        'payments',
        NEW.id,
        NEW.amount
    );
    RETURN NEW;
END;
$$;

-- Función para registrar flujo de caja por gasto
CREATE OR REPLACE FUNCTION fn_expense_to_cashflow() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO cash_flow (cashbox_id, flow_type_id, reference_table, reference_id, amount)
    VALUES (
        NEW.cashbox_id,
        (SELECT id FROM cash_flow_types WHERE code = 'expense'),
        'expenses',
        NEW.id,
        NEW.amount * -1
    );
    RETURN NEW;
END;
$$;

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_category_id ON products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_cashbox ON sales(cashbox_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX idx_cashboxes_status ON cashboxes(status);
CREATE INDEX idx_cashboxes_opened_at ON cashboxes(opened_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = false;

-- =============================================
-- SEED DATA - REGISTROS BÁSICOS
-- =============================================

-- Roles
INSERT INTO roles (name, description) VALUES 
    ('admin', 'Administrador con acceso total al sistema'),
    ('cashier', 'Cajero con acceso a ventas y caja'),
    ('warehouse', 'Encargado de inventario y productos');

-- Permisos
INSERT INTO permissions (code, description) VALUES 
    ('products_read', 'Ver productos'),
    ('products_write', 'Crear/editar productos'),
    ('products_delete', 'Eliminar productos'),
    ('sales_read', 'Ver ventas'),
    ('sales_write', 'Crear ventas'),
    ('cashbox_read', 'Ver caja'),
    ('cashbox_write', 'Gestionar caja'),
    ('reports_read', 'Ver reportes'),
    ('employees_read', 'Ver empleados'),
    ('employees_write', 'Gestionar empleados'),
    ('settings_write', 'Configurar sistema');

-- Asignar todos los permisos al rol admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Usuario administrador (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES 
    ('admin@floreria.com', '$2a$10$SD44wDYpkQjsT/UJCBvCKuh9neB9WgnXF2tImN8dzy7pcsa79sSGG', 'Administrador', 'Sistema', '999111222');

-- Asignar rol admin al usuario
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);

-- Métodos de pago
INSERT INTO payment_methods (code, description) VALUES 
    ('cash', 'Efectivo'),
    ('yape', 'Yape'),
    ('plin', 'Plin'),
    ('transfer', 'Transferencia'),
    ('card', 'Tarjeta');

-- Tipos de flujo de caja
INSERT INTO cash_flow_types (code) VALUES 
    ('sale_income'),
    ('expense'),
    ('opening'),
    ('closing');

-- Tipos de movimiento de stock
INSERT INTO stock_movement_types (code) VALUES 
    ('purchase'),
    ('sale'),
    ('waste'),
    ('adjustment'),
    ('consumption');

CREATE USER floreria_db WITH PASSWORD 'contraseñadelasGOD';
GRANT ALL PRIVILEGES ON DATABASE floreria TO floreria_db;
GRANT ALL ON ALL TABLES IN SCHEMA public TO floreria_db;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO floreria_db;

