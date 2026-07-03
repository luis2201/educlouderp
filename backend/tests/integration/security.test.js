const test = require('node:test');
const assert = require('node:assert/strict');

const API_BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:4005';
const ADMIN_USER = process.env.TEST_ADMIN_USER || 'superadmin';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

function requireAdminPassword() {
  assert.ok(
    ADMIN_PASSWORD,
    'Defina TEST_ADMIN_PASSWORD para ejecutar pruebas de seguridad'
  );
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    headers: response.headers,
    body
  };
}

async function login(usuario, password) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: { usuario, password }
  });

  assert.equal(response.status, 200);
  assert.ok(response.body.data.token);
  return response.body.data;
}

async function logout(token) {
  return request('/api/auth/logout', {
    method: 'POST',
    token
  });
}

test('bloquea rutas protegidas sin token y no expone stack trace', async () => {
  const response = await request('/api/personas');

  assert.equal(response.status, 401);
  assert.equal(response.body.status, 'error');
  assert.equal(response.body.message, 'Token de sesión requerido');
  assert.ok(response.body.request_id);
  assert.equal(response.body.stack, undefined);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('superadmin inicia sesión y accede a rutas protegidas por permisos', async () => {
  requireAdminPassword();

  const auth = await login(ADMIN_USER, ADMIN_PASSWORD);

  assert.equal(auth.usuario.username, ADMIN_USER);
  assert.equal(JSON.stringify(auth).includes('password_hash'), false);

  const roles = await request('/api/roles', { token: auth.token });
  assert.equal(roles.status, 200);
  assert.ok(Array.isArray(roles.body.data));

  const personas = await request('/api/personas', { token: auth.token });
  assert.equal(personas.status, 200);

  const logoutResponse = await logout(auth.token);
  assert.equal(logoutResponse.status, 200);
});

test('usuario autenticado sin permisos recibe 403', async () => {
  requireAdminPassword();

  const suffix = Date.now();
  const admin = await login(ADMIN_USER, ADMIN_PASSWORD);

  const persona = await request('/api/personas', {
    method: 'POST',
    token: admin.token,
    body: {
      tipo_identificacion: 'OTRO',
      identificacion: `TEST-NOPERM-${suffix}`,
      nombres: 'NoPerm',
      apellidos: 'Security Test',
      correo: `noperm.${suffix}@example.com`
    }
  });
  assert.equal(persona.status, 201);

  const username = `noperm.${suffix}`;
  const password = 'Temporal123';
  const usuario = await request('/api/usuarios', {
    method: 'POST',
    token: admin.token,
    body: {
      persona_id: persona.body.data.id,
      username,
      password,
      estado: 'ACTIVO',
      debe_cambiar_clave: false
    }
  });
  assert.equal(usuario.status, 201);

  const noPermAuth = await login(username, password);
  const forbidden = await request('/api/personas', { token: noPermAuth.token });
  assert.equal(forbidden.status, 403);

  await logout(noPermAuth.token);
  await request(`/api/usuarios/${usuario.body.data.id}`, {
    method: 'PATCH',
    token: admin.token,
    body: { estado: 'INACTIVO' }
  });
  await request(`/api/personas/${persona.body.data.id}`, {
    method: 'PATCH',
    token: admin.token,
    body: { estado: 'ELIMINADO' }
  });
  await logout(admin.token);
});

test('administra sesiones de usuario y revoca tokens activos', async () => {
  requireAdminPassword();

  const suffix = Date.now();
  const admin = await login(ADMIN_USER, ADMIN_PASSWORD);

  const persona = await request('/api/personas', {
    method: 'POST',
    token: admin.token,
    body: {
      tipo_identificacion: 'OTRO',
      identificacion: `TEST-SESSION-${suffix}`,
      nombres: 'Session',
      apellidos: 'Security Test'
    }
  });
  assert.equal(persona.status, 201);

  const username = `session.${suffix}`;
  const password = 'Temporal123';
  const usuario = await request('/api/usuarios', {
    method: 'POST',
    token: admin.token,
    body: {
      persona_id: persona.body.data.id,
      username,
      password,
      estado: 'ACTIVO',
      debe_cambiar_clave: false
    }
  });
  assert.equal(usuario.status, 201);

  const sessionA = await login(username, password);
  const sessionB = await login(username, password);

  const activeSessions = await request(`/api/usuarios/${usuario.body.data.id}/sesiones?estado=ACTIVA`, {
    token: admin.token
  });
  assert.equal(activeSessions.status, 200);
  assert.ok(activeSessions.body.data.length >= 2);
  assert.equal(JSON.stringify(activeSessions.body).includes('token_hash'), false);

  const closeAll = await request(`/api/usuarios/${usuario.body.data.id}/sesiones/cerrar-activas`, {
    method: 'PATCH',
    token: admin.token
  });
  assert.equal(closeAll.status, 200);
  assert.ok(closeAll.body.meta.cerradas >= 2);

  const meAfterClose = await request('/api/auth/me', { token: sessionA.token });
  assert.equal(meAfterClose.status, 401);

  const meAfterCloseB = await request('/api/auth/me', { token: sessionB.token });
  assert.equal(meAfterCloseB.status, 401);

  await request(`/api/usuarios/${usuario.body.data.id}`, {
    method: 'PATCH',
    token: admin.token,
    body: { estado: 'INACTIVO' }
  });
  await request(`/api/personas/${persona.body.data.id}`, {
    method: 'PATCH',
    token: admin.token,
    body: { estado: 'ELIMINADO' }
  });
  await logout(admin.token);
});
