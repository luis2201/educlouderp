-- ============================================================
-- ERP EDUCATIVO INTEGRAL
-- MIGRACION 004: PERMISOS ESPECIFICOS FASE 1
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS erp;
SET search_path TO erp;

INSERT INTO erp.permiso (codigo, modulo, recurso, accion, descripcion)
VALUES
    ('catalogo.ver', 'nucleo', 'catalogo', 'ver', 'Ver catálogos e ítems de catálogo.'),
    ('catalogo.crear', 'nucleo', 'catalogo', 'crear', 'Crear catálogos e ítems editables.'),
    ('catalogo.editar', 'nucleo', 'catalogo', 'editar', 'Editar catálogos e ítems editables.'),
    ('institucion.ver', 'nucleo', 'institucion', 'ver', 'Ver instituciones.'),
    ('institucion.crear', 'nucleo', 'institucion', 'crear', 'Crear instituciones.'),
    ('institucion.editar', 'nucleo', 'institucion', 'editar', 'Editar instituciones.'),
    ('sede.ver', 'nucleo', 'sede', 'ver', 'Ver sedes.'),
    ('sede.crear', 'nucleo', 'sede', 'crear', 'Crear sedes.'),
    ('sede.editar', 'nucleo', 'sede', 'editar', 'Editar sedes.'),
    ('parametro.ver', 'nucleo', 'parametro_configuracion', 'ver', 'Ver parámetros de configuración.'),
    ('parametro.crear', 'nucleo', 'parametro_configuracion', 'crear', 'Crear parámetros de configuración.'),
    ('parametro.editar', 'nucleo', 'parametro_configuracion', 'editar', 'Editar parámetros de configuración.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO erp.rol_permiso (rol_id, permiso_id, estado)
SELECT r.id, p.id, 'ACTIVO'
FROM erp.rol r
CROSS JOIN erp.permiso p
WHERE r.codigo = 'SUPERADMIN'
ON CONFLICT (rol_id, permiso_id)
DO UPDATE SET estado = 'ACTIVO';

COMMIT;
