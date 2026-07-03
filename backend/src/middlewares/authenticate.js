const authService = require('../modules/auth/auth.service');

async function authenticate(req, res, next) {
  try {
    const session = await authService.obtenerSesionActual(req);
    req.session = session;
    req.user = session.usuario;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;
