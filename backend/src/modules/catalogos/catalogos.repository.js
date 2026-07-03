const { query } = require('../../db/query');

const CATALOGO_COLUMNS = `
  id,
  institucion_id,
  codigo,
  nombre,
  descripcion,
  tipo,
  editable,
  estado,
  created_at,
  updated_at
`;

const CATALOGO_ITEM_COLUMNS = `
  id,
  catalogo_id,
  codigo,
  nombre,
  descripcion,
  valor,
  es_base,
  orden,
  estado,
  created_at,
  updated_at
`;

async function findAllCatalogos({ estado } = {}) {
  const params = [];
  const filters = [];

  if (estado) {
    params.push(estado);
    filters.push(`estado = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query(`
    SELECT ${CATALOGO_COLUMNS}
    FROM erp.catalogo
    ${where}
    ORDER BY nombre ASC, codigo ASC
  `, params);

  return result.rows;
}

async function findCatalogoByCodigo(codigo) {
  const result = await query(`
    SELECT ${CATALOGO_COLUMNS}
    FROM erp.catalogo
    WHERE codigo = $1
    LIMIT 1
  `, [codigo]);

  return result.rows[0] || null;
}

async function createCatalogo(data) {
  const result = await query(`
    INSERT INTO erp.catalogo (
      institucion_id,
      codigo,
      nombre,
      descripcion,
      tipo,
      editable,
      estado
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${CATALOGO_COLUMNS}
  `, [
    data.institucionId,
    data.codigo,
    data.nombre,
    data.descripcion,
    data.tipo,
    data.editable,
    data.estado
  ]);

  return result.rows[0];
}

async function updateCatalogo(id, data) {
  const result = await query(`
    UPDATE erp.catalogo
    SET
      nombre = COALESCE($2, nombre),
      descripcion = COALESCE($3, descripcion),
      editable = COALESCE($4, editable),
      estado = COALESCE($5, estado)
    WHERE id = $1
    RETURNING ${CATALOGO_COLUMNS}
  `, [
    id,
    data.nombre,
    data.descripcion,
    data.editable,
    data.estado
  ]);

  return result.rows[0] || null;
}

async function findItemsByCatalogoCodigo(codigo, { estado } = {}) {
  const params = [codigo];
  const filters = ['c.codigo = $1'];

  if (estado) {
    params.push(estado);
    filters.push(`ci.estado = $${params.length}`);
  }

  const result = await query(`
    SELECT
      ${CATALOGO_ITEM_COLUMNS
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((column) => `ci.${column}`)
        .join('\n      ')}
    FROM erp.catalogo_item ci
    INNER JOIN erp.catalogo c ON c.id = ci.catalogo_id
    WHERE ${filters.join(' AND ')}
    ORDER BY ci.orden ASC, ci.nombre ASC, ci.codigo ASC
  `, params);

  return result.rows;
}

async function findItemByCodigo(catalogoId, codigo) {
  const result = await query(`
    SELECT ${CATALOGO_ITEM_COLUMNS}
    FROM erp.catalogo_item
    WHERE catalogo_id = $1
      AND codigo = $2
    LIMIT 1
  `, [catalogoId, codigo]);

  return result.rows[0] || null;
}

async function createItem(catalogoId, data) {
  const result = await query(`
    INSERT INTO erp.catalogo_item (
      catalogo_id,
      codigo,
      nombre,
      descripcion,
      valor,
      es_base,
      orden,
      estado
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
    RETURNING ${CATALOGO_ITEM_COLUMNS}
  `, [
    catalogoId,
    data.codigo,
    data.nombre,
    data.descripcion,
    JSON.stringify(data.valor),
    data.esBase,
    data.orden,
    data.estado
  ]);

  return result.rows[0];
}

async function updateItem(id, data) {
  const result = await query(`
    UPDATE erp.catalogo_item
    SET
      nombre = COALESCE($2, nombre),
      descripcion = COALESCE($3, descripcion),
      valor = COALESCE($4::jsonb, valor),
      orden = COALESCE($5, orden),
      estado = COALESCE($6, estado)
    WHERE id = $1
    RETURNING ${CATALOGO_ITEM_COLUMNS}
  `, [
    id,
    data.nombre,
    data.descripcion,
    data.valor === undefined ? null : JSON.stringify(data.valor),
    data.orden,
    data.estado
  ]);

  return result.rows[0] || null;
}

module.exports = {
  findAllCatalogos,
  findCatalogoByCodigo,
  createCatalogo,
  updateCatalogo,
  findItemsByCatalogoCodigo,
  findItemByCodigo,
  createItem,
  updateItem
};
