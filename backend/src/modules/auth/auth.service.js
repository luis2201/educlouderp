const env = require('../../config/env');
const authRepository = require('./auth.repository');
const usuariosRepository = require('../usuarios/usuarios.repository');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');
const { verifyPassword } = require('../../shared/security/passwords');
const { generateSessionToken, hashSessionToken } = require('../../shared/security/tokens');

function getDurationMinutes() {
  return Number(process.env.SESSION_DURATION_MINUTES || 120);
}

function normalizeCredential(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw httpError(400, 'El campo usuario es requerido');
  }

  return normalized.toLowerCase();
}

function normalizePassword(value) {
  const password = String(value || '');

  if (!password) {
    throw httpError(400, 'El campo password es requerido');
  }

  return password;
}

function sanitizeUsuario(usuario) {
  if (!usuario) {
    return usuario;
  }

  const { password_hash: passwordHash, ...safeUsuario } = usuario;
  return safeUsuario;
}

function getBearerToken(req) {
  const header = req.get('authorization') || '';

  if (!header.toLowerCase().startsWith('bearer ')) {
    throw httpError(401, 'Token de sesión requerido');
  }

  const token = header.slice(7).trim();

  if (!token) {
    throw httpError(401, 'Token de sesión requerido');
  }

  return token;
}

function normalizeEstadoSesion(value) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim().toUpperCase();

  if (!['ACTIVA', 'CERRADA', 'EXPIRADA', 'REVOCADA'].includes(normalized)) {
    throw httpError(400, 'Estado de sesión no válido');
  }

  return normalized;
}

function normalizeUuid(value, fieldName) {
  const normalized = String(value || '').trim();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    throw httpError(400, `El campo ${fieldName} debe ser un UUID válido`);
  }

  return normalized;
}

function getRequestContext(req) {
  return {
    ip: req.ip || null,
    userAgent: req.get('user-agent') || null
  };
}

async function login(payload = {}, context = {}) {
  const credential = normalizeCredential(payload.usuario ?? payload.username ?? payload.email);
  const password = normalizePassword(payload.password);
  const usuario = await usuariosRepository.findByCredential(credential);

  if (!usuario) {
    throw httpError(401, 'Credenciales inválidas');
  }

  if (usuario.estado !== 'ACTIVO' && usuario.estado !== 'PENDIENTE') {
    throw httpError(403, 'Usuario no habilitado para iniciar sesión');
  }

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    throw httpError(403, 'Usuario bloqueado temporalmente');
  }

  const passwordOk = verifyPassword(password, usuario.password_hash);

  if (!passwordOk) {
    await usuariosRepository.registrarLoginFallido(usuario.id, Number(usuario.intentos_fallidos || 0) + 1);
    throw httpError(401, 'Credenciales inválidas');
  }

  await usuariosRepository.registrarLoginExitoso(usuario.id);

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const durationMinutes = getDurationMinutes();
  const fechaExpira = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  const requestContext = getRequestContext(context.req || {});
  const session = await authRepository.createSession({
    usuarioId: usuario.id,
    tokenHash,
    ip: requestContext.ip,
    userAgent: requestContext.userAgent,
    fechaExpira,
    metadata: {
      node_env: env.nodeEnv
    }
  });

  await registrarAuditoria({
    req: context.req,
    modulo: 'seguridad',
    entidad: 'sesion_usuario',
    entidadId: session.id,
    accion: 'LOGIN',
    valorNuevo: session,
    personaId: usuario.persona_id
  });

  return {
    token,
    token_tipo: 'Bearer',
    expira_en_segundos: durationMinutes * 60,
    sesion: session,
    usuario: sanitizeUsuario(usuario)
  };
}

async function obtenerSesionActual(req) {
  const token = getBearerToken(req);
  const session = await authRepository.findActiveSessionByTokenHash(hashSessionToken(token));

  if (!session) {
    throw httpError(401, 'Sesión inválida o expirada');
  }

  return session;
}

async function logout(req) {
  const token = getBearerToken(req);
  const tokenHash = hashSessionToken(token);
  const activeSession = await authRepository.findActiveSessionByTokenHash(tokenHash);
  const session = await authRepository.closeSessionByTokenHash(tokenHash);

  if (!session) {
    throw httpError(401, 'Sesión inválida o ya cerrada');
  }

  await registrarAuditoria({
    req,
    modulo: 'seguridad',
    entidad: 'sesion_usuario',
    entidadId: session.id,
    accion: 'LOGOUT',
    valorNuevo: session,
    personaId: activeSession?.usuario?.persona_id
  });

  return session;
}

async function listarSesionesUsuario(usuarioId, filters = {}) {
  const estado = normalizeEstadoSesion(filters.estado);
  return authRepository.findSessionsByUser(usuarioId, { estado });
}

async function obtenerSesionUsuario(usuarioId, sessionId) {
  const id = normalizeUuid(sessionId, 'session_id');
  const session = await authRepository.findSessionById(usuarioId, id);

  if (!session) {
    throw httpError(404, 'Sesión no encontrada');
  }

  return session;
}

async function cerrarSesionUsuario(usuarioId, sessionId, context = {}) {
  const session = await obtenerSesionUsuario(usuarioId, sessionId);
  const closedSession = await authRepository.closeSessionById(usuarioId, session.id);

  if (!closedSession) {
    throw httpError(409, 'La sesión no está activa o ya fue cerrada');
  }

  await registrarAuditoria({
    req: context.req,
    modulo: 'seguridad',
    entidad: 'sesion_usuario',
    entidadId: closedSession.id,
    accion: 'CERRAR_SESION_USUARIO',
    valorAnterior: session,
    valorNuevo: closedSession,
    personaId: session.usuario?.persona_id
  });

  return closedSession;
}

async function cerrarSesionesActivasUsuario(usuarioId, context = {}) {
  const closedSessions = await authRepository.closeActiveSessionsByUser(usuarioId);

  await registrarAuditoria({
    req: context.req,
    modulo: 'seguridad',
    entidad: 'sesion_usuario',
    entidadId: usuarioId,
    accion: 'CERRAR_SESIONES_USUARIO',
    valorNuevo: {
      usuario_id: usuarioId,
      sesiones_cerradas: closedSessions.map((session) => session.id)
    }
  });

  return closedSessions;
}

module.exports = {
  login,
  obtenerSesionActual,
  logout,
  listarSesionesUsuario,
  obtenerSesionUsuario,
  cerrarSesionUsuario,
  cerrarSesionesActivasUsuario
};
