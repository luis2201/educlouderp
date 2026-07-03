-- ============================================================
-- ERP EDUCATIVO INTEGRAL
-- MIGRACION 002: TIPOS DE CATALOGOS E ITEMS BASE
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS erp;
SET search_path TO erp;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'tipo_catalogo'
          AND n.nspname = 'erp'
    ) THEN
        CREATE TYPE erp.tipo_catalogo AS ENUM ('SISTEMA', 'INSTITUCIONAL', 'OPERATIVO');
    END IF;
END $$;

ALTER TABLE erp.catalogo
ADD COLUMN IF NOT EXISTS institucion_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_catalogo_institucion'
    ) THEN
        ALTER TABLE erp.catalogo
        ADD CONSTRAINT fk_catalogo_institucion
        FOREIGN KEY (institucion_id)
        REFERENCES erp.institucion(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;
    END IF;
END $$;

ALTER TABLE erp.catalogo
ADD COLUMN IF NOT EXISTS tipo erp.tipo_catalogo NOT NULL DEFAULT 'OPERATIVO';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_catalogo_sistema_global'
    ) THEN
        ALTER TABLE erp.catalogo
        ADD CONSTRAINT chk_catalogo_sistema_global
        CHECK (tipo <> 'SISTEMA' OR institucion_id IS NULL);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_catalogo_institucional_contexto'
    ) THEN
        ALTER TABLE erp.catalogo
        ADD CONSTRAINT chk_catalogo_institucional_contexto
        CHECK (tipo <> 'INSTITUCIONAL' OR institucion_id IS NOT NULL);
    END IF;
END $$;

ALTER TABLE erp.catalogo_item
ADD COLUMN IF NOT EXISTS es_base BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE erp.catalogo
SET tipo = 'SISTEMA',
    editable = FALSE
WHERE codigo IN ('TIPO_IDENTIFICACION');

UPDATE erp.catalogo
SET tipo = 'OPERATIVO'
WHERE codigo IN ('GENERO', 'PARENTESCO', 'ESTADO_CIVIL')
  AND tipo <> 'SISTEMA';

UPDATE erp.catalogo_item ci
SET es_base = TRUE
FROM erp.catalogo c
WHERE c.id = ci.catalogo_id
  AND c.codigo = 'TIPO_IDENTIFICACION'
  AND ci.codigo IN ('CEDULA', 'RUC', 'PASAPORTE', 'EXTRANJERO', 'OTRO');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_catalogo_codigo'
    ) THEN
        ALTER TABLE erp.catalogo
        DROP CONSTRAINT uq_catalogo_codigo;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_codigo_global
ON erp.catalogo (codigo)
WHERE institucion_id IS NULL AND estado <> 'ELIMINADO';

CREATE UNIQUE INDEX IF NOT EXISTS uq_catalogo_codigo_institucion
ON erp.catalogo (institucion_id, codigo)
WHERE institucion_id IS NOT NULL AND estado <> 'ELIMINADO';

COMMIT;
