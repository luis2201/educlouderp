-- ============================================================
-- ERP EDUCATIVO INTEGRAL
-- MIGRACION 003: ENDURECIMIENTO DE SEGURIDAD
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS erp;
SET search_path TO erp;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sesion_usuario_token_hash
ON erp.sesion_usuario (token_hash);

CREATE INDEX IF NOT EXISTS idx_sesion_usuario_activa_token
ON erp.sesion_usuario (token_hash, fecha_expira)
WHERE estado = 'ACTIVA' AND fecha_cierre IS NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_username_lower
ON erp.usuario (LOWER(username));

CREATE INDEX IF NOT EXISTS idx_usuario_email_acceso_lower
ON erp.usuario (LOWER(email_acceso))
WHERE email_acceso IS NOT NULL;

COMMIT;
