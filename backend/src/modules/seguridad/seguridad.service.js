const seguridadRepository = require('./seguridad.repository');
const usuariosService = require('../usuarios/usuarios.service');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_GENERALES = new Set(['ACTIVO', 'INACTIVO', 'ELIMINADO']);

function normalizeCodigo(value, fieldName) {
  const normalized = String(value || '').trim().toUpperCase();

  if (!normalized) {
    throw httpError(400, `El campo ${fieldName} es requerido`);
  }

  return normalized;
}

function normalizePermisoCodigo(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (!normalized) {
    throw httpError(400, 'El código del permiso es requerido');
  }

  return normalized;
}

function normalizeEstado(value, label = 'Estado') {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim().toUpperCase();

  if (!ESTADOS_GENERALES.has(normalized)) {
    throw httpError(400, `${label} no válido`);
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

function normalizeIdRequired(value, fieldName) {
  const id = normalizeId(value, fieldName);

  if (!id) {
    throw httpError(400, `El campo ${fieldName} es requerido`);
  }

  return id;
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

function ensureRangoFechas(fechaInicio, fechaFin) {
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    throw httpError(400, 'La fecha de fin debe ser mayor o igual a la fecha de inicio');
  }
}

function ensureContextoRol(data) {
  if (data.sedeId && !data.institucionId) {
    throw httpError(400, 'Asignar rol por sede requiere institucion_id');
  }

  if (data.periodoId && !data.institucionId) {
    throw httpError(400, 'Asignar rol por periodo requiere institucion_id');
  }
}

function handleRepositoryError(error) {
  if (error.code === '23505') {
    throw httpError(409, 'Ya existe una asignación activa equivalente');
  }

  if (error.code === '23503') {
    throw httpError(400, 'El contexto asociado no existe');
  }

  if (error.code === '23514') {
    throw httpError(400, 'La fecha de fin debe ser mayor o igual a la fecha de inicio');
  }

  throw error;
}

async function listarRoles(filters = {}) {
  return seguridadRepository.findRoles({
    estado: normalizeEstado(filters.estado)
  });
}

async function obtenerRol(codigo) {
  const rol = await seguridadRepository.findRolByCodigo(normalizeCodigo(codigo, 'codigo'));

  if (!rol) {
    throw httpError(404, 'Rol no encontrado');
  }

  return rol;
}

async function listarPermisos(filters = {}) {
  return seguridadRepository.findPermisos({
    estado: normalizeEstado(filters.estado),
    modulo: filters.modulo ? String(filters.modulo).trim().toLowerCase() : undefined
  });
}

async function obtenerPermiso(codigo) {
  const permiso = await seguridadRepository.findPermisoByCodigo(normalizePermisoCodigo(codigo));

  if (!permiso) {
    throw httpError(404, 'Permiso no encontrado');
  }

  return permiso;
}

async function listarPermisosRol(rolCodigo) {
  const rol = await obtenerRol(rolCodigo);
  const permisos = await seguridadRepository.findPermisosByRol(rol.id);

  return {
    rol,
    permisos
  };
}

async function asignarPermisoRol(rolCodigo, payload = {}, context = {}) {
  const rol = await obtenerRol(rolCodigo);
  const permiso = await obtenerPermiso(payload.permiso_codigo ?? payload.permisoCodigo);
  const estado = normalizeEstado(payload.estado) || 'ACTIVO';
  const asignacion = await seguridadRepository.upsertRolPermiso(rol.id, permiso.id, estado);

  await registrarAuditoria({
    req: context.req,
    modulo: 'seguridad',
    entidad: 'rol_permiso',
    entidadId: asignacion.id,
    accion: 'ASIGNAR_PERMISO',
    valorNuevo: {
      ...asignacion,
      rol_codigo: rol.codigo,
      permiso_codigo: permiso.codigo
    }
  });

  return {
    rol,
    permiso,
    asignacion
  };
}

async function listarRolesUsuario(usuarioId) {
  const usuario = await usuariosService.obtenerUsuario(usuarioId);
  const roles = await seguridadRepository.findUsuarioRoles(usuario.id);

  return {
    usuario,
    roles
  };
}

async function asignarRolUsuario(usuarioId, payload = {}, context = {}) {
  const usuario = await usuariosService.obtenerUsuario(usuarioId);
  const rol = await obtenerRol(payload.rol_codigo ?? payload.rolCodigo);
  const data = {
    usuarioId: usuario.id,
    rolId: rol.id,
    institucionId: normalizeId(payload.institucion_id ?? payload.institucionId, 'institucion_id'),
    sedeId: normalizeId(payload.sede_id ?? payload.sedeId, 'sede_id'),
    periodoId: normalizeId(payload.periodo_id ?? payload.periodoId, 'periodo_id'),
    fechaInicio: normalizeFecha(payload.fecha_inicio ?? payload.fechaInicio, 'fecha_inicio'),
    fechaFin: normalizeFecha(payload.fecha_fin ?? payload.fechaFin, 'fecha_fin'),
    estado: normalizeEstado(payload.estado) || 'ACTIVO'
  };

  ensureContextoRol(data);
  ensureRangoFechas(data.fechaInicio, data.fechaFin);

  try {
    const asignacion = await seguridadRepository.createUsuarioRol(data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'seguridad',
      entidad: 'usuario_rol',
      entidadId: asignacion.id,
      accion: 'ASIGNAR_ROL',
      valorNuevo: {
        ...asignacion,
        rol_codigo: rol.codigo,
        usuario_id: usuario.id
      },
      institucionId: asignacion.institucion_id
    });

    return {
      usuario,
      rol,
      asignacion
    };
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarRolUsuario(usuarioId, asignacionId, payload = {}, context = {}) {
  const usuario = await usuariosService.obtenerUsuario(usuarioId);
  const id = normalizeIdRequired(asignacionId, 'asignacion_id');
  const asignacion = await seguridadRepository.findUsuarioRolById(usuario.id, id);

  if (!asignacion) {
    throw httpError(404, 'Asignación de rol no encontrada');
  }

  const data = {
    fechaInicio: normalizeFecha(payload.fecha_inicio ?? payload.fechaInicio, 'fecha_inicio'),
    fechaFin: normalizeFecha(payload.fecha_fin ?? payload.fechaFin, 'fecha_fin'),
    estado: normalizeEstado(payload.estado)
  };

  ensureRangoFechas(data.fechaInicio || asignacion.fecha_inicio, data.fechaFin || asignacion.fecha_fin);

  try {
    const asignacionActualizada = await seguridadRepository.updateUsuarioRol(id, data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'seguridad',
      entidad: 'usuario_rol',
      entidadId: asignacionActualizada.id,
      accion: 'ACTUALIZAR_ROL_USUARIO',
      valorAnterior: asignacion,
      valorNuevo: asignacionActualizada,
      institucionId: asignacionActualizada.institucion_id
    });

    return {
      usuario,
      asignacion: asignacionActualizada
    };
  } catch (error) {
    handleRepositoryError(error);
  }
}

module.exports = {
  listarRoles,
  obtenerRol,
  listarPermisos,
  obtenerPermiso,
  listarPermisosRol,
  asignarPermisoRol,
  listarRolesUsuario,
  asignarRolUsuario,
  actualizarRolUsuario
};
