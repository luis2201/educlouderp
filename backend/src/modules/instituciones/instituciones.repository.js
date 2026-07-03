const { query } = require('../../db/query');

const INSTITUCION_COLUMNS = `
  id,
  codigo,
  nombre,
  razon_social,
  tipo_identificacion,
  identificacion,
  direccion,
  telefono,
  correo,
  sitio_web,
  logo_url,
  color_primario,
  estado,
  metadata,
  created_at,
  updated_at
`;

async function findAll({ estado } = {}) {
  const params = [];
  const filters = [];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(`
    SELECT ${INSTITUCION_COLUMNS}
    FROM erp.institucion
    ${where}
    ORDER BY nombre ASC, codigo ASC
  `, params);

  return result.rows;
}

async function findByCodigo(codigo) {
  const result = await query(`
    SELECT ${INSTITUCION_COLUMNS}
    FROM erp.institucion
    WHERE codigo = $1
    LIMIT 1
  `, [codigo]);

  return result.rows[0] || null;
}

async function create(data) {
  const result = await query(`
    INSERT INTO erp.institucion (
      codigo,
      nombre,
      razon_social,
      tipo_identificacion,
      identificacion,
      direccion,
      telefono,
      correo,
      sitio_web,
      logo_url,
      color_primario,
      estado,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
    RETURNING ${INSTITUCION_COLUMNS}
  `, [
    data.codigo,
    data.nombre,
    data.razonSocial,
    data.tipoIdentificacion,
    data.identificacion,
    data.direccion,
    data.telefono,
    data.correo,
    data.sitioWeb,
    data.logoUrl,
    data.colorPrimario,
    data.estado,
    JSON.stringify(data.metadata)
  ]);

  return result.rows[0];
}

async function update(id, data) {
  const result = await query(`
    UPDATE erp.institucion
    SET
      nombre = COALESCE($2, nombre),
      razon_social = COALESCE($3, razon_social),
      tipo_identificacion = COALESCE($4, tipo_identificacion),
      identificacion = COALESCE($5, identificacion),
      direccion = COALESCE($6, direccion),
      telefono = COALESCE($7, telefono),
      correo = COALESCE($8, correo),
      sitio_web = COALESCE($9, sitio_web),
      logo_url = COALESCE($10, logo_url),
      color_primario = COALESCE($11, color_primario),
      estado = COALESCE($12, estado),
      metadata = COALESCE($13::jsonb, metadata)
    WHERE id = $1
    RETURNING ${INSTITUCION_COLUMNS}
  `, [
    id,
    data.nombre,
    data.razonSocial,
    data.tipoIdentificacion,
    data.identificacion,
    data.direccion,
    data.telefono,
    data.correo,
    data.sitioWeb,
    data.logoUrl,
    data.colorPrimario,
    data.estado,
    data.metadata === undefined ? null : JSON.stringify(data.metadata)
  ]);

  return result.rows[0] || null;
}

module.exports = {
  findAll,
  findByCodigo,
  create,
  update
};
