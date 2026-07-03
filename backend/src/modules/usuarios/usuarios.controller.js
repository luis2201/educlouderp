const usuariosService = require('./usuarios.service');

async function listarUsuarios(req, res) {
  const usuarios = await usuariosService.listarUsuarios(req.query);

  res.json({
    data: usuarios
  });
}

async function obtenerUsuario(req, res) {
  const usuario = await usuariosService.obtenerUsuario(req.params.id);

  res.json({
    data: usuario
  });
}

async function crearUsuario(req, res) {
  const usuario = await usuariosService.crearUsuario(req.body, { req });

  res.status(201).json({
    data: usuario
  });
}

async function actualizarUsuario(req, res) {
  const usuario = await usuariosService.actualizarUsuario(req.params.id, req.body, { req });

  res.json({
    data: usuario
  });
}

async function cambiarClave(req, res) {
  const usuario = await usuariosService.cambiarClave(req.params.id, req.body, { req });

  res.json({
    data: usuario
  });
}

module.exports = {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarClave
};
