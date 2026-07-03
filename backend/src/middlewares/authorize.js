const { query } = require('../db/query');
const { httpError } = require('../shared/httpErrors');

async function userHasPermission(userId, permissionCode) {
  const result = await query(`
    SELECT 1
    FROM erp.usuario_rol ur
    INNER JOIN erp.rol r ON r.id = ur.rol_id
    LEFT JOIN erp.rol_permiso rp ON rp.rol_id = r.id AND rp.estado = 'ACTIVO'
    LEFT JOIN erp.permiso p ON p.id = rp.permiso_id AND p.estado = 'ACTIVO'
    WHERE ur.usuario_id = $1
      AND ur.estado = 'ACTIVO'
      AND (ur.fecha_inicio IS NULL OR ur.fecha_inicio <= CURRENT_DATE)
      AND (ur.fecha_fin IS NULL OR ur.fecha_fin >= CURRENT_DATE)
      AND (
        r.codigo = 'SUPERADMIN'
        OR p.codigo = $2
      )
    LIMIT 1
  `, [userId, permissionCode]);

  return result.rowCount > 0;
}

function authorize(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw httpError(401, 'Autenticación requerida');
      }

      const allowed = await userHasPermission(req.user.id, permissionCode);

      if (!allowed) {
        throw httpError(403, 'No tiene permisos para realizar esta acción');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = authorize;
