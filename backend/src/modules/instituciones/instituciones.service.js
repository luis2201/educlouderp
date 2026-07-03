const institucionesRepository = require('./instituciones.repository');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_VALIDOS = new Set(['ACTIVO', 'INACTIVO', 'ELIMINADO']);
const TIPOS_IDENTIFICACION_VALIDOS = new Set(['CEDULA', 'RUC', 'PASAPORTE', 'EXTRANJERO', 'OTRO']);

function normalizeCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase();
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

function normalizeEstado(estado) {
  if (!estado) {
    return undefined;
  }

  const normalized = String(estado).trim().toUpperCase();

  if (!ESTADOS_VALIDOS.has(normalized)) {
    throw httpError(400, 'Estado de institución no válido');
  }

  return normalized;
}

function normalizeTipoIdentificacion(tipo) {
  if (!tipo) {
    return undefined;
  }

  const normalized = String(tipo).trim().toUpperCase();

  if (!TIPOS_IDENTIFICACION_VALIDOS.has(normalized)) {
    throw httpError(400, 'Tipo de identificación no válido');
  }

  return normalized;
}

function normalizeMetadata(value) {
  if (value === undefined) {
    return {};
  }

  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw httpError(400, 'El campo metadata debe ser un objeto JSON');
  }

  return value;
}

function normalizeMetadataPatch(value) {
  if (value === undefined) {
    return undefined;
  }

  return normalizeMetadata(value);
}

function handleRepositoryError(error) {
  if (error.code === '23505') {
    throw httpError(409, 'Ya existe una institución con el mismo código');
  }

  throw error;
}

async function listarInstituciones(filters = {}) {
  const estado = normalizeEstado(filters.estado);
  return institucionesRepository.findAll({ estado });
}

async function obtenerInstitucion(codigo) {
  const codigoNormalizado = normalizeCodigo(codigo);

  if (!codigoNormalizado) {
    throw httpError(400, 'El código de la institución es requerido');
  }

  const institucion = await institucionesRepository.findByCodigo(codigoNormalizado);

  if (!institucion) {
    throw httpError(404, 'Institución no encontrada');
  }

  return institucion;
}

async function crearInstitucion(payload = {}, context = {}) {
  const data = {
    codigo: normalizeCodigo(payload.codigo),
    nombre: normalizeTextoRequerido(payload.nombre, 'nombre'),
    razonSocial: normalizeTextoOpcional(payload.razon_social ?? payload.razonSocial),
    tipoIdentificacion: normalizeTipoIdentificacion(payload.tipo_identificacion ?? payload.tipoIdentificacion),
    identificacion: normalizeTextoOpcional(payload.identificacion),
    direccion: normalizeTextoOpcional(payload.direccion),
    telefono: normalizeTextoOpcional(payload.telefono),
    correo: normalizeTextoOpcional(payload.correo),
    sitioWeb: normalizeTextoOpcional(payload.sitio_web ?? payload.sitioWeb),
    logoUrl: normalizeTextoOpcional(payload.logo_url ?? payload.logoUrl),
    colorPrimario: normalizeTextoOpcional(payload.color_primario ?? payload.colorPrimario),
    estado: normalizeEstado(payload.estado) || 'ACTIVO',
    metadata: normalizeMetadata(payload.metadata)
  };

  if (!data.codigo) {
    throw httpError(400, 'El código de la institución es requerido');
  }

  try {
    const institucion = await institucionesRepository.create(data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'nucleo',
      entidad: 'institucion',
      entidadId: institucion.id,
      accion: 'CREAR',
      valorNuevo: institucion,
      institucionId: institucion.id
    });

    return institucion;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarInstitucion(codigo, payload = {}, context = {}) {
  const institucion = await obtenerInstitucion(codigo);

  const data = {
    nombre: payload.nombre === undefined ? undefined : normalizeTextoRequerido(payload.nombre, 'nombre'),
    razonSocial: normalizeTextoOpcional(payload.razon_social ?? payload.razonSocial),
    tipoIdentificacion: normalizeTipoIdentificacion(payload.tipo_identificacion ?? payload.tipoIdentificacion),
    identificacion: normalizeTextoOpcional(payload.identificacion),
    direccion: normalizeTextoOpcional(payload.direccion),
    telefono: normalizeTextoOpcional(payload.telefono),
    correo: normalizeTextoOpcional(payload.correo),
    sitioWeb: normalizeTextoOpcional(payload.sitio_web ?? payload.sitioWeb),
    logoUrl: normalizeTextoOpcional(payload.logo_url ?? payload.logoUrl),
    colorPrimario: normalizeTextoOpcional(payload.color_primario ?? payload.colorPrimario),
    estado: normalizeEstado(payload.estado),
    metadata: normalizeMetadataPatch(payload.metadata)
  };

  const institucionActualizada = await institucionesRepository.update(institucion.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'nucleo',
    entidad: 'institucion',
    entidadId: institucionActualizada.id,
    accion: 'ACTUALIZAR',
    valorAnterior: institucion,
    valorNuevo: institucionActualizada,
    institucionId: institucionActualizada.id
  });

  return institucionActualizada;
}

module.exports = {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  actualizarInstitucion
};
