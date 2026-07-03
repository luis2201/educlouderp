const parametrosService = require('./parametros.service');

async function listarParametros(req, res) {
  const parametros = await parametrosService.listarParametros(req.query);

  res.json({
    data: parametros
  });
}

async function obtenerParametro(req, res) {
  const parametro = await parametrosService.obtenerParametro(req.params.id);

  res.json({
    data: parametro
  });
}

async function crearParametro(req, res) {
  const parametro = await parametrosService.crearParametro(req.body, { req });

  res.status(201).json({
    data: parametro
  });
}

async function actualizarParametro(req, res) {
  const parametro = await parametrosService.actualizarParametro(req.params.id, req.body, { req });

  res.json({
    data: parametro
  });
}

module.exports = {
  listarParametros,
  obtenerParametro,
  crearParametro,
  actualizarParametro
};
