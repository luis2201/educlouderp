const authService = require('./auth.service');

async function login(req, res) {
  const result = await authService.login(req.body, { req });

  res.json({
    data: result
  });
}

async function me(req, res) {
  const session = await authService.obtenerSesionActual(req);

  res.json({
    data: session
  });
}

async function logout(req, res) {
  const session = await authService.logout(req);

  res.json({
    data: session
  });
}

async function cambiarClaveActual(req, res) {
  const usuario = await authService.cambiarClaveActual(req.body, { req });

  res.json({
    data: usuario
  });
}

async function listarSesionesUsuario(req, res) {
  const sessions = await authService.listarSesionesUsuario(req.params.id, req.query);

  res.json({
    data: sessions
  });
}

async function obtenerSesionUsuario(req, res) {
  const session = await authService.obtenerSesionUsuario(req.params.id, req.params.sessionId);

  res.json({
    data: session
  });
}

async function cerrarSesionUsuario(req, res) {
  const session = await authService.cerrarSesionUsuario(req.params.id, req.params.sessionId, { req });

  res.json({
    data: session
  });
}

async function cerrarSesionesActivasUsuario(req, res) {
  const sessions = await authService.cerrarSesionesActivasUsuario(req.params.id, { req });

  res.json({
    data: sessions,
    meta: {
      cerradas: sessions.length
    }
  });
}

module.exports = {
  login,
  me,
  logout,
  cambiarClaveActual,
  listarSesionesUsuario,
  obtenerSesionUsuario,
  cerrarSesionUsuario,
  cerrarSesionesActivasUsuario
};
