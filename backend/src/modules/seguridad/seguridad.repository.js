const { query } = require('../../db/query');

const ROL_COLUMNS = `
  id,
  codigo,
  nombre,
  descripcion,
  es_sistema,
  estado,
  created_at,
  updated_at
`;

const PERMISO_COLUMNS = `
  id,
  codigo,
  modulo,
  recurso,
  accion,
  descripcion,
  estado,
  created_at,
  updated_at
`;

const USUARIO_ROL_COLUMNS = `
  id,
  usuario_id,
  rol_id,
  institucion_id,
  sede_id,
  periodo_id,
  fecha_inicio,
  fecha_fin,
  estado,
  created_at,
  updated_at
`;

async function findRoles({ estado } = {}) {
  const params = [];
  const where = [];

  if (estado) {
    params.push(estado);
    where.push(`estado = $${params.length}`);
  }

  const result = await query(`
    SELECT ${ROL_COLUMNS}
    FROM erp.rol
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY es_sistema DESC, nombre ASC
  `, params);

  return result.rows;
}

async function findRolByCodigo(codigo) {
  const result = await query(`
    SELECT ${ROL_COLUMNS}
    FROM erp.rol
    WHERE codigo = $1
    LIMIT 1
  `, [codigo]);

  return result.rows[0] || null;
}

async function findPermisos({ estado, modulo } = {}) {
  const params = [];
  const where = [];

  if (estado) {
    params.push(estado);
    where.push(`estado = $${params.length}`);
  }

  if (modulo) {
    params.push(modulo);
    where.push(`modulo = $${params.length}`);
  }

  const result = await query(`
    SELECT ${PERMISO_COLUMNS}
    FROM erp.permiso
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY modulo ASC, recurso ASC, accion ASC
  `, params);

  return result.rows;
}

async function findPermisoByCodigo(codigo) {
  const result = await query(`
    SELECT ${PERMISO_COLUMNS}
    FROM erp.permiso
    WHERE codigo = $1
    LIMIT 1
  `, [codigo]);

  return result.rows[0] || null;
}

async function findPermisosByRol(rolId) {
  const result = await query(`
    SELECT
      rp.id AS rol_permiso_id,
      rp.estado AS asignacion_estado,
      rp.created_at AS asignacion_created_at,
      rp.updated_at AS asignacion_updated_at,
      p.id,
      p.codigo,
      p.modulo,
      p.recurso,
      p.accion,
      p.descripcion,
      p.estado
    FROM erp.rol_permiso rp
    INNER JOIN erp.permiso p ON p.id = rp.permiso_id
    WHERE rp.rol_id = $1
    ORDER BY p.modulo ASC, p.recurso ASC, p.accion ASC
  `, [rolId]);

  return result.rows;
}

async function upsertRolPermiso(rolId, permisoId, estado) {
  const result = await query(`
    INSERT INTO erp.rol_permiso (rol_id, permiso_id, estado)
    VALUES ($1, $2, $3)
    ON CONFLICT (rol_id, permiso_id)
    DO UPDATE SET estado = EXCLUDED.estado
    RETURNING id, rol_id, permiso_id, estado, created_at, updated_at
  `, [rolId, permisoId, estado]);

  return result.rows[0];
}

async function findUsuarioRoles(usuarioId) {
  const result = await query(`
    SELECT
      ${USUARIO_ROL_COLUMNS
        .split('\n')
        .map((line) => line.trim().replace(/,$/, ''))
        .filter(Boolean)
        .map((column) => `ur.${column}`)
        .join(',\n      ')},
      jsonb_build_object(
        'id', r.id,
        'codigo', r.codigo,
        'nombre', r.nombre,
        'descripcion', r.descripcion,
        'es_sistema', r.es_sistema,
        'estado', r.estado
      ) AS rol
    FROM erp.usuario_rol ur
    INNER JOIN erp.rol r ON r.id = ur.rol_id
    WHERE ur.usuario_id = $1
    ORDER BY ur.estado ASC, r.nombre ASC
  `, [usuarioId]);

  return result.rows;
}

async function createUsuarioRol(data) {
  const result = await query(`
    INSERT INTO erp.usuario_rol (
      usuario_id,
      rol_id,
      institucion_id,
      sede_id,
      periodo_id,
      fecha_inicio,
      fecha_fin,
      estado
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING ${USUARIO_ROL_COLUMNS}
  `, [
    data.usuarioId,
    data.rolId,
    data.institucionId,
    data.sedeId,
    data.periodoId,
    data.fechaInicio,
    data.fechaFin,
    data.estado
  ]);

  return result.rows[0];
}

async function updateUsuarioRol(id, data) {
  const result = await query(`
    UPDATE erp.usuario_rol
    SET
      fecha_inicio = COALESCE($2, fecha_inicio),
      fecha_fin = COALESCE($3, fecha_fin),
      estado = COALESCE($4, estado)
    WHERE id = $1
    RETURNING ${USUARIO_ROL_COLUMNS}
  `, [
    id,
    data.fechaInicio,
    data.fechaFin,
    data.estado
  ]);

  return result.rows[0] || null;
}

async function findUsuarioRolById(usuarioId, id) {
  const result = await query(`
    SELECT ${USUARIO_ROL_COLUMNS}
    FROM erp.usuario_rol
    WHERE usuario_id = $1
      AND id = $2
    LIMIT 1
  `, [usuarioId, id]);

  return result.rows[0] || null;
}

module.exports = {
  findRoles,
  findRolByCodigo,
  findPermisos,
  findPermisoByCodigo,
  findPermisosByRol,
  upsertRolPermiso,
  findUsuarioRoles,
  createUsuarioRol,
  updateUsuarioRol,
  findUsuarioRolById
};
