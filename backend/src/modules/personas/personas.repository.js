const { query } = require('../../db/query');

const PERSONA_COLUMNS = `
  id,
  tipo_identificacion,
  identificacion,
  nombres,
  apellidos,
  fecha_nacimiento,
  genero,
  correo,
  telefono,
  direccion,
  estado,
  metadata,
  created_at,
  updated_at
`;

async function findAll(filters = {}) {
  const params = [];
  const where = [];

  if (filters.estado) {
    params.push(filters.estado);
    where.push(`estado = $${params.length}`);
  }

  if (filters.tipoIdentificacion) {
    params.push(filters.tipoIdentificacion);
    where.push(`tipo_identificacion = $${params.length}`);
  }

  if (filters.identificacion) {
    params.push(filters.identificacion);
    where.push(`identificacion = $${params.length}`);
  }

  if (filters.correo) {
    params.push(filters.correo);
    where.push(`LOWER(correo) = LOWER($${params.length})`);
  }

  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(
      nombres ILIKE $${params.length}
      OR apellidos ILIKE $${params.length}
      OR identificacion ILIKE $${params.length}
      OR correo ILIKE $${params.length}
    )`);
  }

  const result = await query(`
    SELECT ${PERSONA_COLUMNS}
    FROM erp.persona
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY apellidos ASC, nombres ASC, id ASC
  `, params);

  return result.rows;
}

async function findById(id) {
  const result = await query(`
    SELECT ${PERSONA_COLUMNS}
    FROM erp.persona
    WHERE id = $1
    LIMIT 1
  `, [id]);

  return result.rows[0] || null;
}

async function create(data) {
  const result = await query(`
    INSERT INTO erp.persona (
      tipo_identificacion,
      identificacion,
      nombres,
      apellidos,
      fecha_nacimiento,
      genero,
      correo,
      telefono,
      direccion,
      estado,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
    RETURNING ${PERSONA_COLUMNS}
  `, [
    data.tipoIdentificacion,
    data.identificacion,
    data.nombres,
    data.apellidos,
    data.fechaNacimiento,
    data.genero,
    data.correo,
    data.telefono,
    data.direccion,
    data.estado,
    JSON.stringify(data.metadata)
  ]);

  return result.rows[0];
}

async function update(id, data) {
  const result = await query(`
    UPDATE erp.persona
    SET
      nombres = COALESCE($2, nombres),
      apellidos = COALESCE($3, apellidos),
      fecha_nacimiento = COALESCE($4, fecha_nacimiento),
      genero = COALESCE($5, genero),
      correo = COALESCE($6, correo),
      telefono = COALESCE($7, telefono),
      direccion = COALESCE($8, direccion),
      estado = COALESCE($9, estado),
      metadata = COALESCE($10::jsonb, metadata)
    WHERE id = $1
    RETURNING ${PERSONA_COLUMNS}
  `, [
    id,
    data.nombres,
    data.apellidos,
    data.fechaNacimiento,
    data.genero,
    data.correo,
    data.telefono,
    data.direccion,
    data.estado,
    data.metadata === undefined ? null : JSON.stringify(data.metadata)
  ]);

  return result.rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  create,
  update
};
