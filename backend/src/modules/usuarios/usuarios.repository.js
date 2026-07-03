const { query } = require('../../db/query');

const USUARIO_COLUMNS = `
  id,
  persona_id,
  username,
  email_acceso,
  estado,
  ultimo_acceso,
  debe_cambiar_clave,
  intentos_fallidos,
  bloqueado_hasta,
  metadata,
  created_at,
  updated_at
`;

const USUARIO_COLUMNS_WITH_ALIAS = USUARIO_COLUMNS
  .split('\n')
  .map((line) => line.trim().replace(/,$/, ''))
  .filter(Boolean)
  .map((column) => `u.${column}`)
  .join(',\n      ');

async function findAll(filters = {}) {
  const params = [];
  const where = [];

  if (filters.estado) {
    params.push(filters.estado);
    where.push(`u.estado = $${params.length}`);
  }

  if (filters.personaId) {
    params.push(filters.personaId);
    where.push(`u.persona_id = $${params.length}`);
  }

  if (filters.username) {
    params.push(filters.username);
    where.push(`LOWER(u.username) = LOWER($${params.length})`);
  }

  if (filters.emailAcceso) {
    params.push(filters.emailAcceso);
    where.push(`LOWER(u.email_acceso) = LOWER($${params.length})`);
  }

  const result = await query(`
    SELECT
      ${USUARIO_COLUMNS_WITH_ALIAS},
      jsonb_build_object(
        'id', p.id,
        'tipo_identificacion', p.tipo_identificacion,
        'identificacion', p.identificacion,
        'nombres', p.nombres,
        'apellidos', p.apellidos,
        'correo', p.correo,
        'estado', p.estado
      ) AS persona
    FROM erp.usuario u
    INNER JOIN erp.persona p ON p.id = u.persona_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY u.username ASC, u.id ASC
  `, params);

  return result.rows;
}

async function findById(id) {
  const result = await query(`
    SELECT
      ${USUARIO_COLUMNS_WITH_ALIAS},
      jsonb_build_object(
        'id', p.id,
        'tipo_identificacion', p.tipo_identificacion,
        'identificacion', p.identificacion,
        'nombres', p.nombres,
        'apellidos', p.apellidos,
        'correo', p.correo,
        'estado', p.estado
      ) AS persona
    FROM erp.usuario u
    INNER JOIN erp.persona p ON p.id = u.persona_id
    WHERE u.id = $1
    LIMIT 1
  `, [id]);

  return result.rows[0] || null;
}

async function findByCredential(credential) {
  const result = await query(`
    SELECT
      u.id,
      u.persona_id,
      u.username,
      u.email_acceso,
      u.password_hash,
      u.estado,
      u.ultimo_acceso,
      u.debe_cambiar_clave,
      u.intentos_fallidos,
      u.bloqueado_hasta,
      u.metadata,
      u.created_at,
      u.updated_at,
      jsonb_build_object(
        'id', p.id,
        'tipo_identificacion', p.tipo_identificacion,
        'identificacion', p.identificacion,
        'nombres', p.nombres,
        'apellidos', p.apellidos,
        'correo', p.correo,
        'estado', p.estado
      ) AS persona
    FROM erp.usuario u
    INNER JOIN erp.persona p ON p.id = u.persona_id
    WHERE LOWER(u.username) = LOWER($1)
       OR LOWER(u.email_acceso) = LOWER($1)
    LIMIT 1
  `, [credential]);

  return result.rows[0] || null;
}

async function registrarLoginExitoso(id) {
  const result = await query(`
    UPDATE erp.usuario
    SET
      ultimo_acceso = now(),
      intentos_fallidos = 0,
      bloqueado_hasta = NULL
    WHERE id = $1
    RETURNING ${USUARIO_COLUMNS}
  `, [id]);

  return result.rows[0] || null;
}

async function registrarLoginFallido(id, intentosFallidos) {
  const result = await query(`
    UPDATE erp.usuario
    SET intentos_fallidos = $2
    WHERE id = $1
    RETURNING ${USUARIO_COLUMNS}
  `, [id, intentosFallidos]);

  return result.rows[0] || null;
}

async function create(data) {
  const result = await query(`
    INSERT INTO erp.usuario (
      persona_id,
      username,
      email_acceso,
      password_hash,
      estado,
      debe_cambiar_clave,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    RETURNING ${USUARIO_COLUMNS}
  `, [
    data.personaId,
    data.username,
    data.emailAcceso,
    data.passwordHash,
    data.estado,
    data.debeCambiarClave,
    JSON.stringify(data.metadata)
  ]);

  return result.rows[0];
}

async function update(id, data) {
  const result = await query(`
    UPDATE erp.usuario
    SET
      email_acceso = COALESCE($2, email_acceso),
      estado = COALESCE($3, estado),
      debe_cambiar_clave = COALESCE($4, debe_cambiar_clave),
      intentos_fallidos = COALESCE($5, intentos_fallidos),
      bloqueado_hasta = COALESCE($6, bloqueado_hasta),
      metadata = COALESCE($7::jsonb, metadata)
    WHERE id = $1
    RETURNING ${USUARIO_COLUMNS}
  `, [
    id,
    data.emailAcceso,
    data.estado,
    data.debeCambiarClave,
    data.intentosFallidos,
    data.bloqueadoHasta,
    data.metadata === undefined ? null : JSON.stringify(data.metadata)
  ]);

  return result.rows[0] || null;
}

async function updatePassword(id, data) {
  const result = await query(`
    UPDATE erp.usuario
    SET
      password_hash = $2,
      debe_cambiar_clave = $3,
      intentos_fallidos = 0,
      bloqueado_hasta = NULL
    WHERE id = $1
    RETURNING ${USUARIO_COLUMNS}
  `, [
    id,
    data.passwordHash,
    data.debeCambiarClave
  ]);

  return result.rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByCredential,
  registrarLoginExitoso,
  registrarLoginFallido,
  create,
  update,
  updatePassword
};
