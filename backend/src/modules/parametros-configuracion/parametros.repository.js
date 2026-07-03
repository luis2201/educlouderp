const { query } = require('../../db/query');

const PARAMETRO_COLUMNS = `
  id,
  codigo,
  nombre,
  descripcion,
  tipo_dato,
  valor,
  ambito,
  institucion_id,
  sede_id,
  periodo_id,
  modulo,
  usuario_id,
  editable,
  version,
  fecha_inicio,
  fecha_fin,
  estado,
  created_at,
  updated_at
`;

async function findAll(filters = {}) {
  const params = [];
  const where = [];

  for (const [column, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      params.push(value);
      where.push(`${column} = $${params.length}`);
    }
  }

  const result = await query(`
    SELECT ${PARAMETRO_COLUMNS}
    FROM erp.parametro_configuracion
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ambito ASC, codigo ASC, id ASC
  `, params);

  return result.rows;
}

async function findById(id) {
  const result = await query(`
    SELECT ${PARAMETRO_COLUMNS}
    FROM erp.parametro_configuracion
    WHERE id = $1
    LIMIT 1
  `, [id]);

  return result.rows[0] || null;
}

async function create(data) {
  const result = await query(`
    INSERT INTO erp.parametro_configuracion (
      codigo,
      nombre,
      descripcion,
      tipo_dato,
      valor,
      ambito,
      institucion_id,
      sede_id,
      periodo_id,
      modulo,
      usuario_id,
      editable,
      version,
      fecha_inicio,
      fecha_fin,
      estado
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING ${PARAMETRO_COLUMNS}
  `, [
    data.codigo,
    data.nombre,
    data.descripcion,
    data.tipoDato,
    JSON.stringify(data.valor),
    data.ambito,
    data.institucionId,
    data.sedeId,
    data.periodoId,
    data.modulo,
    data.usuarioId,
    data.editable,
    data.version,
    data.fechaInicio,
    data.fechaFin,
    data.estado
  ]);

  return result.rows[0];
}

async function update(id, data) {
  const result = await query(`
    UPDATE erp.parametro_configuracion
    SET
      nombre = COALESCE($2, nombre),
      descripcion = COALESCE($3, descripcion),
      valor = COALESCE($4::jsonb, valor),
      editable = COALESCE($5, editable),
      version = COALESCE($6, version),
      fecha_inicio = COALESCE($7, fecha_inicio),
      fecha_fin = COALESCE($8, fecha_fin),
      estado = COALESCE($9, estado)
    WHERE id = $1
    RETURNING ${PARAMETRO_COLUMNS}
  `, [
    id,
    data.nombre,
    data.descripcion,
    data.valor === undefined ? null : JSON.stringify(data.valor),
    data.editable,
    data.version,
    data.fechaInicio,
    data.fechaFin,
    data.estado
  ]);

  return result.rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  create,
  update
};
