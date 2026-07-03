const { query } = require('../../db/query');

const SESSION_COLUMNS = `
  id,
  usuario_id,
  ip,
  user_agent,
  fecha_inicio,
  fecha_expira,
  fecha_cierre,
  estado,
  metadata
`;

async function createSession(data) {
  const result = await query(`
    INSERT INTO erp.sesion_usuario (
      usuario_id,
      token_hash,
      ip,
      user_agent,
      fecha_expira,
      estado,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, 'ACTIVA', $6::jsonb)
    RETURNING ${SESSION_COLUMNS}
  `, [
    data.usuarioId,
    data.tokenHash,
    data.ip,
    data.userAgent,
    data.fechaExpira,
    JSON.stringify(data.metadata)
  ]);

  return result.rows[0];
}

async function findActiveSessionByTokenHash(tokenHash) {
  const result = await query(`
    SELECT
      ${SESSION_COLUMNS
        .split('\n')
        .map((line) => line.trim().replace(/,$/, ''))
        .filter(Boolean)
        .map((column) => `s.${column}`)
        .join(',\n      ')},
      jsonb_build_object(
        'id', u.id,
        'persona_id', u.persona_id,
        'username', u.username,
        'email_acceso', u.email_acceso,
        'estado', u.estado,
        'debe_cambiar_clave', u.debe_cambiar_clave
      ) AS usuario
    FROM erp.sesion_usuario s
    INNER JOIN erp.usuario u ON u.id = s.usuario_id
    WHERE s.token_hash = $1
      AND s.estado = 'ACTIVA'
      AND s.fecha_cierre IS NULL
      AND s.fecha_expira > now()
    LIMIT 1
  `, [tokenHash]);

  return result.rows[0] || null;
}

async function closeSessionByTokenHash(tokenHash) {
  const result = await query(`
    UPDATE erp.sesion_usuario
    SET
      estado = 'CERRADA',
      fecha_cierre = now()
    WHERE token_hash = $1
      AND estado = 'ACTIVA'
      AND fecha_cierre IS NULL
    RETURNING ${SESSION_COLUMNS}
  `, [tokenHash]);

  return result.rows[0] || null;
}

async function findSessionsByUser(usuarioId, { estado } = {}) {
  const params = [usuarioId];
  const filters = ['usuario_id = $1'];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}`);
  }

  const result = await query(`
    SELECT ${SESSION_COLUMNS}
    FROM erp.sesion_usuario
    WHERE ${filters.join(' AND ')}
    ORDER BY fecha_inicio DESC
  `, params);

  return result.rows;
}

async function findSessionById(usuarioId, sessionId) {
  const result = await query(`
    SELECT ${SESSION_COLUMNS}
    FROM erp.sesion_usuario
    WHERE usuario_id = $1
      AND id = $2
    LIMIT 1
  `, [usuarioId, sessionId]);

  return result.rows[0] || null;
}

async function closeSessionById(usuarioId, sessionId) {
  const result = await query(`
    UPDATE erp.sesion_usuario
    SET
      estado = 'CERRADA',
      fecha_cierre = COALESCE(fecha_cierre, now())
    WHERE usuario_id = $1
      AND id = $2
      AND estado = 'ACTIVA'
      AND fecha_cierre IS NULL
    RETURNING ${SESSION_COLUMNS}
  `, [usuarioId, sessionId]);

  return result.rows[0] || null;
}

async function closeActiveSessionsByUser(usuarioId) {
  const result = await query(`
    UPDATE erp.sesion_usuario
    SET
      estado = 'CERRADA',
      fecha_cierre = COALESCE(fecha_cierre, now())
    WHERE usuario_id = $1
      AND estado = 'ACTIVA'
      AND fecha_cierre IS NULL
    RETURNING ${SESSION_COLUMNS}
  `, [usuarioId]);

  return result.rows;
}

module.exports = {
  createSession,
  findActiveSessionByTokenHash,
  closeSessionByTokenHash,
  findSessionsByUser,
  findSessionById,
  closeSessionById,
  closeActiveSessionsByUser
};
