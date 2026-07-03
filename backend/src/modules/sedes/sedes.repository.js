const { query } = require('../../db/query');

const SEDE_COLUMNS = `
  id,
  institucion_id,
  codigo,
  nombre,
  direccion,
  telefono,
  correo,
  estado,
  metadata,
  created_at,
  updated_at
`;

async function findAllByInstitucion(institucionId, { estado } = {}) {
  const params = [institucionId];
  const filters = ['institucion_id = $1'];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}`);
  }

  const result = await query(`
    SELECT ${SEDE_COLUMNS}
    FROM erp.sede
    WHERE ${filters.join(' AND ')}
    ORDER BY nombre ASC, codigo ASC
  `, params);

  return result.rows;
}

async function findByCodigo(institucionId, codigo) {
  const result = await query(`
    SELECT ${SEDE_COLUMNS}
    FROM erp.sede
    WHERE institucion_id = $1
      AND codigo = $2
    LIMIT 1
  `, [institucionId, codigo]);

  return result.rows[0] || null;
}

async function create(institucionId, data) {
  const result = await query(`
    INSERT INTO erp.sede (
      institucion_id,
      codigo,
      nombre,
      direccion,
      telefono,
      correo,
      estado,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    RETURNING ${SEDE_COLUMNS}
  `, [
    institucionId,
    data.codigo,
    data.nombre,
    data.direccion,
    data.telefono,
    data.correo,
    data.estado,
    JSON.stringify(data.metadata)
  ]);

  return result.rows[0];
}

async function update(id, data) {
  const result = await query(`
    UPDATE erp.sede
    SET
      nombre = COALESCE($2, nombre),
      direccion = COALESCE($3, direccion),
      telefono = COALESCE($4, telefono),
      correo = COALESCE($5, correo),
      estado = COALESCE($6, estado),
      metadata = COALESCE($7::jsonb, metadata)
    WHERE id = $1
    RETURNING ${SEDE_COLUMNS}
  `, [
    id,
    data.nombre,
    data.direccion,
    data.telefono,
    data.correo,
    data.estado,
    data.metadata === undefined ? null : JSON.stringify(data.metadata)
  ]);

  return result.rows[0] || null;
}

module.exports = {
  findAllByInstitucion,
  findByCodigo,
  create,
  update
};
