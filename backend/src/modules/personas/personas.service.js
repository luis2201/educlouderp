const personasRepository = require('./personas.repository');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_VALIDOS = new Set(['ACTIVO', 'INACTIVO', 'ELIMINADO']);
const TIPOS_IDENTIFICACION_VALIDOS = new Set(['CEDULA', 'RUC', 'PASAPORTE', 'EXTRANJERO', 'OTRO']);

function normalizeId(value, fieldName) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw httpError(400, `El campo ${fieldName} debe ser un identificador válido`);
  }

  return numberValue;
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
    throw httpError(400, 'Estado de persona no válido');
  }

  return normalized;
}

function normalizeTipoIdentificacion(tipo, required = false) {
  if (!tipo) {
    if (required) {
      throw httpError(400, 'El campo tipo_identificacion es requerido');
    }

    return undefined;
  }

  const normalized = String(tipo).trim().toUpperCase();

  if (!TIPOS_IDENTIFICACION_VALIDOS.has(normalized)) {
    throw httpError(400, 'Tipo de identificación no válido');
  }

  return normalized;
}

function normalizeIdentificacion(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw httpError(400, 'El campo identificacion es requerido');
  }

  if (normalized.length > 30) {
    throw httpError(400, 'El campo identificacion no debe superar 30 caracteres');
  }

  return normalized;
}

function normalizeCorreo(value) {
  const normalized = normalizeTextoOpcional(value);

  if (!normalized) {
    return normalized;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw httpError(400, 'El campo correo no tiene un formato válido');
  }

  return normalized.toLowerCase();
}

function normalizeFecha(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw httpError(400, `El campo ${fieldName} debe tener formato YYYY-MM-DD`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw httpError(400, `El campo ${fieldName} no es una fecha válida`);
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
    throw httpError(409, 'Ya existe una persona con el mismo tipo de identificación e identificación');
  }

  throw error;
}

async function listarPersonas(filters = {}) {
  return personasRepository.findAll({
    estado: normalizeEstado(filters.estado),
    tipoIdentificacion: normalizeTipoIdentificacion(filters.tipo_identificacion ?? filters.tipoIdentificacion),
    identificacion: filters.identificacion ? String(filters.identificacion).trim() : undefined,
    correo: filters.correo ? String(filters.correo).trim().toLowerCase() : undefined,
    q: filters.q ? String(filters.q).trim() : undefined
  });
}

async function obtenerPersona(id) {
  const personaId = normalizeId(id, 'id');
  const persona = await personasRepository.findById(personaId);

  if (!persona) {
    throw httpError(404, 'Persona no encontrada');
  }

  return persona;
}

async function crearPersona(payload = {}, context = {}) {
  const data = {
    tipoIdentificacion: normalizeTipoIdentificacion(payload.tipo_identificacion ?? payload.tipoIdentificacion, true),
    identificacion: normalizeIdentificacion(payload.identificacion),
    nombres: normalizeTextoRequerido(payload.nombres, 'nombres'),
    apellidos: normalizeTextoRequerido(payload.apellidos, 'apellidos'),
    fechaNacimiento: normalizeFecha(payload.fecha_nacimiento ?? payload.fechaNacimiento, 'fecha_nacimiento'),
    genero: normalizeTextoOpcional(payload.genero),
    correo: normalizeCorreo(payload.correo),
    telefono: normalizeTextoOpcional(payload.telefono),
    direccion: normalizeTextoOpcional(payload.direccion),
    estado: normalizeEstado(payload.estado) || 'ACTIVO',
    metadata: normalizeMetadata(payload.metadata)
  };

  try {
    const persona = await personasRepository.create(data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'identidad',
      entidad: 'persona',
      entidadId: persona.id,
      accion: 'CREAR',
      valorNuevo: persona
    });

    return persona;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarPersona(id, payload = {}, context = {}) {
  const persona = await obtenerPersona(id);
  const data = {
    nombres: payload.nombres === undefined ? undefined : normalizeTextoRequerido(payload.nombres, 'nombres'),
    apellidos: payload.apellidos === undefined ? undefined : normalizeTextoRequerido(payload.apellidos, 'apellidos'),
    fechaNacimiento: normalizeFecha(payload.fecha_nacimiento ?? payload.fechaNacimiento, 'fecha_nacimiento'),
    genero: normalizeTextoOpcional(payload.genero),
    correo: normalizeCorreo(payload.correo),
    telefono: normalizeTextoOpcional(payload.telefono),
    direccion: normalizeTextoOpcional(payload.direccion),
    estado: normalizeEstado(payload.estado),
    metadata: normalizeMetadataPatch(payload.metadata)
  };

  const personaActualizada = await personasRepository.update(persona.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'identidad',
    entidad: 'persona',
    entidadId: personaActualizada.id,
    accion: 'ACTUALIZAR',
    valorAnterior: persona,
    valorNuevo: personaActualizada
  });

  return personaActualizada;
}

module.exports = {
  listarPersonas,
  obtenerPersona,
  crearPersona,
  actualizarPersona
};
