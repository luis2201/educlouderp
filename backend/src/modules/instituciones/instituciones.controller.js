const institucionesService = require('./instituciones.service');

async function listarInstituciones(req, res) {
  const instituciones = await institucionesService.listarInstituciones(req.query);

  res.json({
    data: instituciones
  });
}

async function obtenerInstitucion(req, res) {
  const institucion = await institucionesService.obtenerInstitucion(req.params.codigo);

  res.json({
    data: institucion
  });
}

async function crearInstitucion(req, res) {
  const institucion = await institucionesService.crearInstitucion(req.body, { req });

  res.status(201).json({
    data: institucion
  });
}

async function actualizarInstitucion(req, res) {
  const institucion = await institucionesService.actualizarInstitucion(req.params.codigo, req.body, { req });

  res.json({
    data: institucion
  });
}

module.exports = {
  listarInstituciones,
  obtenerInstitucion,
  crearInstitucion,
  actualizarInstitucion
};
