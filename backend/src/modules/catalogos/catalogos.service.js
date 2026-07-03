const catalogosRepository = require('./catalogos.repository');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_VALIDOS = new Set(['ACTIVO', 'INACTIVO', 'ELIMINADO']);
const TIPOS_CATALOGO_VALIDOS = new Set(['SISTEMA', 'INSTITUCIONAL', 'OPERATIVO']);

function normalizeCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase();
}

function normalizeEstado(estado) {
  if (!estado) {
    return undefined;
  }

  const normalized = String(estado).trim().toUpperCase();

  if (!ESTADOS_VALIDOS.has(normalized)) {
    throw httpError(400, 'Estado de catálogo no válido');
  }

  return normalized;
}

function normalizeTipoCatalogo(tipo) {
  if (!tipo) {
    return 'OPERATIVO';
  }

  const normalized = String(tipo).trim().toUpperCase();

  if (!TIPOS_CATALOGO_VALIDOS.has(normalized)) {
    throw httpError(400, 'Tipo de catálogo no válido');
  }

  return normalized;
}

function normalizeId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw httpError(400, `El campo ${fieldName} debe ser un identificador válido`);
  }

  return numberValue;
}

function normalizeBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw httpError(400, 'El campo editable debe ser booleano');
  }

  return value;
}

function normalizeTextoRequerido(value, fieldName) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw httpError(400, `El campo ${fieldName} es requerido`);
  }

  return normalized;
}

function normalizeTextoOpcional(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeOrden(value) {
  if (value === undefined) {
    return 0;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue)) {
    throw httpError(400, 'El campo orden debe ser un número entero');
  }

  return numberValue;
}

function normalizeValor(value) {
  if (value === undefined) {
    return {};
  }

  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw httpError(400, 'El campo valor debe ser un objeto JSON');
  }

  return value;
}

function ensureCatalogoEditable(catalogo) {
  if (catalogo.tipo === 'SISTEMA') {
    throw httpError(403, 'Los catálogos del sistema no se modifican desde la API general');
  }

  if (!catalogo.editable) {
    throw httpError(403, 'El catálogo no es editable');
  }
}

function ensureCatalogoCreateAllowed(data) {
  if (data.tipo === 'SISTEMA') {
    throw httpError(403, 'Los catálogos del sistema se crean mediante migraciones controladas');
  }

  if (data.tipo === 'INSTITUCIONAL' && !data.institucionId) {
    throw httpError(400, 'Los catálogos institucionales requieren institucion_id');
  }

  if (data.tipo !== 'INSTITUCIONAL' && data.institucionId) {
    throw httpError(400, 'Solo los catálogos institucionales deben tener institucion_id');
  }
}

function ensureItemBaseProtegido(item, data) {
  if (!item.es_base) {
    return;
  }

  const cambiaSignificado = data.nombre !== undefined || data.descripcion !== undefined || data.valor !== undefined;
  const eliminaItem = data.estado === 'ELIMINADO';

  if (cambiaSignificado || eliminaItem) {
    throw httpError(403, 'Los ítems base no permiten cambiar significado ni eliminarse');
  }
}

function handleRepositoryError(error) {
  if (error.code === '23505') {
    throw httpError(409, 'Ya existe un registro con el mismo código');
  }

  throw error;
}

async function listarCatalogos(filters = {}) {
  const estado = normalizeEstado(filters.estado);
  return catalogosRepository.findAllCatalogos({ estado });
}

async function obtenerCatalogo(codigo) {
  const codigoNormalizado = normalizeCodigo(codigo);

  if (!codigoNormalizado) {
    throw httpError(400, 'El código del catálogo es requerido');
  }

  const catalogo = await catalogosRepository.findCatalogoByCodigo(codigoNormalizado);

  if (!catalogo) {
    throw httpError(404, 'Catálogo no encontrado');
  }

  return catalogo;
}

async function crearCatalogo(payload = {}, context = {}) {
  const data = {
    institucionId: normalizeId(payload.institucion_id ?? payload.institucionId, 'institucion_id'),
    codigo: normalizeCodigo(payload.codigo),
    nombre: normalizeTextoRequerido(payload.nombre, 'nombre'),
    descripcion: normalizeTextoOpcional(payload.descripcion),
    tipo: normalizeTipoCatalogo(payload.tipo),
    editable: normalizeBoolean(payload.editable, true),
    estado: normalizeEstado(payload.estado) || 'ACTIVO'
  };

  if (!data.codigo) {
    throw httpError(400, 'El código del catálogo es requerido');
  }

  ensureCatalogoCreateAllowed(data);

  try {
    const catalogo = await catalogosRepository.createCatalogo(data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'nucleo',
      entidad: 'catalogo',
      entidadId: catalogo.id,
      accion: 'CREAR',
      valorNuevo: catalogo,
      institucionId: catalogo.institucion_id
    });

    return catalogo;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarCatalogo(codigo, payload = {}, context = {}) {
  const catalogo = await obtenerCatalogo(codigo);
  ensureCatalogoEditable(catalogo);

  const data = {
    nombre: payload.nombre === undefined ? undefined : normalizeTextoRequerido(payload.nombre, 'nombre'),
    descripcion: normalizeTextoOpcional(payload.descripcion),
    editable: payload.editable === undefined ? undefined : normalizeBoolean(payload.editable),
    estado: normalizeEstado(payload.estado)
  };

  const catalogoActualizado = await catalogosRepository.updateCatalogo(catalogo.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'nucleo',
    entidad: 'catalogo',
    entidadId: catalogoActualizado.id,
    accion: 'ACTUALIZAR',
    valorAnterior: catalogo,
    valorNuevo: catalogoActualizado,
    institucionId: catalogoActualizado.institucion_id
  });

  return catalogoActualizado;
}

async function listarItems(codigo, filters = {}) {
  const catalogo = await obtenerCatalogo(codigo);
  const estado = normalizeEstado(filters.estado);
  const items = await catalogosRepository.findItemsByCatalogoCodigo(catalogo.codigo, { estado });

  return {
    catalogo,
    items
  };
}

async function crearItem(codigo, payload = {}, context = {}) {
  const catalogo = await obtenerCatalogo(codigo);
  ensureCatalogoEditable(catalogo);

  const data = {
    codigo: normalizeCodigo(payload.codigo),
    nombre: normalizeTextoRequerido(payload.nombre, 'nombre'),
    descripcion: normalizeTextoOpcional(payload.descripcion),
    valor: normalizeValor(payload.valor),
    esBase: false,
    orden: normalizeOrden(payload.orden),
    estado: normalizeEstado(payload.estado) || 'ACTIVO'
  };

  if (!data.codigo) {
    throw httpError(400, 'El código del ítem es requerido');
  }

  try {
    const item = await catalogosRepository.createItem(catalogo.id, data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'nucleo',
      entidad: 'catalogo_item',
      entidadId: item.id,
      accion: 'CREAR',
      valorNuevo: item,
      institucionId: catalogo.institucion_id,
      metadata: {
        catalogo_codigo: catalogo.codigo
      }
    });

    return item;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarItem(codigo, itemCodigo, payload = {}, context = {}) {
  const catalogo = await obtenerCatalogo(codigo);
  ensureCatalogoEditable(catalogo);

  const codigoItemNormalizado = normalizeCodigo(itemCodigo);

  if (!codigoItemNormalizado) {
    throw httpError(400, 'El código del ítem es requerido');
  }

  const item = await catalogosRepository.findItemByCodigo(catalogo.id, codigoItemNormalizado);

  if (!item) {
    throw httpError(404, 'Ítem de catálogo no encontrado');
  }

  const data = {
    nombre: payload.nombre === undefined ? undefined : normalizeTextoRequerido(payload.nombre, 'nombre'),
    descripcion: normalizeTextoOpcional(payload.descripcion),
    valor: payload.valor === undefined ? undefined : normalizeValor(payload.valor),
    orden: payload.orden === undefined ? undefined : normalizeOrden(payload.orden),
    estado: normalizeEstado(payload.estado)
  };

  ensureItemBaseProtegido(item, data);

  const itemActualizado = await catalogosRepository.updateItem(item.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'nucleo',
    entidad: 'catalogo_item',
    entidadId: itemActualizado.id,
    accion: 'ACTUALIZAR',
    valorAnterior: item,
    valorNuevo: itemActualizado,
    institucionId: catalogo.institucion_id,
    metadata: {
      catalogo_codigo: catalogo.codigo
    }
  });

  return itemActualizado;
}

module.exports = {
  listarCatalogos,
  obtenerCatalogo,
  crearCatalogo,
  actualizarCatalogo,
  listarItems,
  crearItem,
  actualizarItem
};
