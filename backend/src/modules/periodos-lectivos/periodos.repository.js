const { pool, query } = require('../../db/query');

const PERIODO_COLUMNS = `
  id,
  institucion_id,
  codigo,
  nombre,
  fecha_inicio,
  fecha_fin,
  estado,
  es_actual,
  metadata,
  created_at,
  updated_at
`;

async function findAllByInstitucion(institucionId, { estado, esActual } = {}) {
  const params = [institucionId];
  const filters = ['institucion_id = $1'];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}`);
  }

  if (esActual !== undefined) {
    params.push(esActual);
    filters.push(`es_actual = $${params.length}`);
  }

  const result = await query(`
    SELECT ${PERIODO_COLUMNS}
    FROM erp.periodo_lectivo
    WHERE ${filters.join(' AND ')}
    ORDER BY fecha_inicio DESC, codigo DESC
  `, params);

  return result.rows;
}

async function findByCodigo(institucionId, codigo) {
  const result = await query(`
    SELECT ${PERIODO_COLUMNS}
    FROM erp.periodo_lectivo
    WHERE institucion_id = $1
      AND codigo = $2
    LIMIT 1
  `, [institucionId, codigo]);

  return result.rows[0] || null;
}

async function create(institucionId, data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (data.esActual) {
      await client.query(`
        UPDATE erp.periodo_lectivo
        SET es_actual = FALSE
        WHERE institucion_id = $1
          AND es_actual = TRUE
      `, [institucionId]);
    }

    const result = await client.query(`
      INSERT INTO erp.periodo_lectivo (
        institucion_id,
        codigo,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado,
        es_actual,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      RETURNING ${PERIODO_COLUMNS}
    `, [
      institucionId,
      data.codigo,
      data.nombre,
      data.fechaInicio,
      data.fechaFin,
      data.estado,
      data.esActual,
      JSON.stringify(data.metadata)
    ]);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, institucionId, data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (data.esActual === true) {
      await client.query(`
        UPDATE erp.periodo_lectivo
        SET es_actual = FALSE
        WHERE institucion_id = $1
          AND id <> $2
          AND es_actual = TRUE
      `, [institucionId, id]);
    }

    const result = await client.query(`
      UPDATE erp.periodo_lectivo
      SET
        nombre = COALESCE($2, nombre),
        fecha_inicio = COALESCE($3, fecha_inicio),
        fecha_fin = COALESCE($4, fecha_fin),
        estado = COALESCE($5, estado),
        es_actual = COALESCE($6, es_actual),
        metadata = COALESCE($7::jsonb, metadata)
      WHERE id = $1
      RETURNING ${PERIODO_COLUMNS}
    `, [
      id,
      data.nombre,
      data.fechaInicio,
      data.fechaFin,
      data.estado,
      data.esActual,
      data.metadata === undefined ? null : JSON.stringify(data.metadata)
    ]);

    await client.query('COMMIT');
    return result.rows[0] || null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  findAllByInstitucion,
  findByCodigo,
  create,
  update
};
