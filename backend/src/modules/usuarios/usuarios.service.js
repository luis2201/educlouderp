const usuariosRepository = require('./usuarios.repository');
const personasService = require('../personas/personas.service');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');
const { hashPassword } = require('../../shared/security/passwords');

const ESTADOS_USUARIO_VALIDOS = new Set(['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'PENDIENTE']);

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

function normalizeUsername(value) {
  const normalized = normalizeTextoRequerido(value, 'username').toLowerCase();

  if (!/^[a-z0-9._-]{3,80}$/.test(normalized)) {
    throw httpError(400, 'El username debe tener 3 a 80 caracteres y usar letras, números, punto, guion o guion bajo');
  }

  return normalized;
}

function normalizeEmail(value) {
  const normalized = normalizeTextoOpcional(value);

  if (!normalized) {
    return normalized;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw httpError(400, 'El email de acceso no tiene un formato válido');
  }

  return normalized.toLowerCase();
}

function normalizeEstado(estado) {
  if (!estado) {
    return undefined;
  }

  const normalized = String(estado).trim().toUpperCase();

  if (!ESTADOS_USUARIO_VALIDOS.has(normalized)) {
    throw httpError(400, 'Estado de usuario no válido');
  }

  return normalized;
}

function normalizeBoolean(value, fieldName, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw httpError(400, `El campo ${fieldName} debe ser booleano`);
  }

  return value;
}

function normalizeInteger(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw httpError(400, `El campo ${fieldName} debe ser un entero no negativo`);
  }

  return numberValue;
}

function normalizeTimestamp(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, `El campo ${fieldName} debe ser una fecha/hora válida`);
  }

  return date.toISOString();
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

function normalizePassword(value) {
  const password = String(value || '');

  if (password.length < 8) {
    throw httpError(400, 'La contraseña debe tener al menos 8 caracteres');
  }

  return password;
}

function handleRepositoryError(error) {
  if (error.code === '23505') {
    throw httpError(409, 'Ya existe un usuario con la misma persona, username o email de acceso');
  }

  if (error.code === '23503') {
    throw httpError(400, 'La persona asociada no existe');
  }

  throw error;
}

async function listarUsuarios(filters = {}) {
  return usuariosRepository.findAll({
    estado: normalizeEstado(filters.estado),
    personaId: filters.persona_id || filters.personaId ? normalizeId(filters.persona_id ?? filters.personaId, 'persona_id') : undefined,
    username: filters.username ? String(filters.username).trim().toLowerCase() : undefined,
    emailAcceso: filters.email_acceso || filters.emailAcceso ? normalizeEmail(filters.email_acceso ?? filters.emailAcceso) : undefined
  });
}

async function obtenerUsuario(id) {
  const usuarioId = normalizeId(id, 'id');
  const usuario = await usuariosRepository.findById(usuarioId);

  if (!usuario) {
    throw httpError(404, 'Usuario no encontrado');
  }

  return usuario;
}

async function crearUsuario(payload = {}, context = {}) {
  const personaId = normalizeId(payload.persona_id ?? payload.personaId, 'persona_id');
  await personasService.obtenerPersona(personaId);

  const data = {
    personaId,
    username: normalizeUsername(payload.username),
    emailAcceso: normalizeEmail(payload.email_acceso ?? payload.emailAcceso),
    passwordHash: hashPassword(normalizePassword(payload.password)),
    estado: normalizeEstado(payload.estado) || 'PENDIENTE',
    debeCambiarClave: normalizeBoolean(payload.debe_cambiar_clave ?? payload.debeCambiarClave, 'debe_cambiar_clave', true),
    metadata: normalizeMetadata(payload.metadata)
  };

  try {
    const usuario = await usuariosRepository.create(data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'seguridad',
      entidad: 'usuario',
      entidadId: usuario.id,
      accion: 'CREAR',
      valorNuevo: usuario
    });

    return usuario;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarUsuario(id, payload = {}, context = {}) {
  const usuario = await obtenerUsuario(id);
  const data = {
    emailAcceso: normalizeEmail(payload.email_acceso ?? payload.emailAcceso),
    estado: normalizeEstado(payload.estado),
    debeCambiarClave: normalizeBoolean(payload.debe_cambiar_clave ?? payload.debeCambiarClave, 'debe_cambiar_clave'),
    intentosFallidos: normalizeInteger(payload.intentos_fallidos ?? payload.intentosFallidos, 'intentos_fallidos'),
    bloqueadoHasta: normalizeTimestamp(payload.bloqueado_hasta ?? payload.bloqueadoHasta, 'bloqueado_hasta'),
    metadata: normalizeMetadataPatch(payload.metadata)
  };

  try {
    const usuarioActualizado = await usuariosRepository.update(usuario.id, data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'seguridad',
      entidad: 'usuario',
      entidadId: usuarioActualizado.id,
      accion: 'ACTUALIZAR',
      valorAnterior: usuario,
      valorNuevo: usuarioActualizado
    });

    return usuarioActualizado;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function cambiarClave(id, payload = {}, context = {}) {
  const usuario = await obtenerUsuario(id);
  const data = {
    passwordHash: hashPassword(normalizePassword(payload.password)),
    debeCambiarClave: normalizeBoolean(payload.debe_cambiar_clave ?? payload.debeCambiarClave, 'debe_cambiar_clave', false)
  };

  const usuarioActualizado = await usuariosRepository.updatePassword(usuario.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'seguridad',
    entidad: 'usuario',
    entidadId: usuarioActualizado.id,
    accion: 'CAMBIAR_CLAVE',
    valorAnterior: {
      id: usuario.id,
      debe_cambiar_clave: usuario.debe_cambiar_clave
    },
    valorNuevo: {
      id: usuarioActualizado.id,
      debe_cambiar_clave: usuarioActualizado.debe_cambiar_clave
    }
  });

  return usuarioActualizado;
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarClave
};
