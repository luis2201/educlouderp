const sedesRepository = require('./sedes.repository');
const institucionesService = require('../instituciones/instituciones.service');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_VALIDOS = new Set(['ACTIVO', 'INACTIVO', 'ELIMINADO']);

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
    throw httpError(400, 'Estado de sede no válido');
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
    throw httpError(409, 'Ya existe una sede con el mismo código para la institución');
  }

  throw error;
}

async function obtenerInstitucionContexto(institucionCodigo) {
  return institucionesService.obtenerInstitucion(institucionCodigo);
}

async function listarSedes(institucionCodigo, filters = {}) {
  const institucion = await obtenerInstitucionContexto(institucionCodigo);
  const estado = normalizeEstado(filters.estado);
  const sedes = await sedesRepository.findAllByInstitucion(institucion.id, { estado });

  return {
    institucion,
    sedes
  };
}

async function obtenerSede(institucionCodigo, sedeCodigo) {
  const institucion = await obtenerInstitucionContexto(institucionCodigo);
  const codigoNormalizado = normalizeCodigo(sedeCodigo);

  if (!codigoNormalizado) {
    throw httpError(400, 'El código de la sede es requerido');
  }

  const sede = await sedesRepository.findByCodigo(institucion.id, codigoNormalizado);

  if (!sede) {
    throw httpError(404, 'Sede no encontrada');
  }

  return {
    institucion,
    sede
  };
}

async function crearSede(institucionCodigo, payload = {}, context = {}) {
  const institucion = await obtenerInstitucionContexto(institucionCodigo);
  const data = {
    codigo: normalizeCodigo(payload.codigo),
    nombre: normalizeTextoRequerido(payload.nombre, 'nombre'),
    direccion: normalizeTextoOpcional(payload.direccion),
    telefono: normalizeTextoOpcional(payload.telefono),
    correo: normalizeTextoOpcional(payload.correo),
    estado: normalizeEstado(payload.estado) || 'ACTIVO',
    metadata: normalizeMetadata(payload.metadata)
  };

  if (!data.codigo) {
    throw httpError(400, 'El código de la sede es requerido');
  }

  try {
    const sede = await sedesRepository.create(institucion.id, data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'nucleo',
      entidad: 'sede',
      entidadId: sede.id,
      accion: 'CREAR',
      valorNuevo: sede,
      institucionId: institucion.id,
      metadata: {
        institucion_codigo: institucion.codigo
      }
    });

    return {
      institucion,
      sede
    };
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarSede(institucionCodigo, sedeCodigo, payload = {}, context = {}) {
  const { institucion, sede } = await obtenerSede(institucionCodigo, sedeCodigo);
  const data = {
    nombre: payload.nombre === undefined ? undefined : normalizeTextoRequerido(payload.nombre, 'nombre'),
    direccion: normalizeTextoOpcional(payload.direccion),
    telefono: normalizeTextoOpcional(payload.telefono),
    correo: normalizeTextoOpcional(payload.correo),
    estado: normalizeEstado(payload.estado),
    metadata: normalizeMetadataPatch(payload.metadata)
  };

  const sedeActualizada = await sedesRepository.update(sede.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'nucleo',
    entidad: 'sede',
    entidadId: sedeActualizada.id,
    accion: 'ACTUALIZAR',
    valorAnterior: sede,
    valorNuevo: sedeActualizada,
    institucionId: institucion.id,
    metadata: {
      institucion_codigo: institucion.codigo
    }
  });

  return {
    institucion,
    sede: sedeActualizada
  };
}

module.exports = {
  listarSedes,
  obtenerSede,
  crearSede,
  actualizarSede
};
