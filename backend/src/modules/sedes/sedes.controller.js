const sedesService = require('./sedes.service');

async function listarSedes(req, res) {
  const result = await sedesService.listarSedes(req.params.institucionCodigo, req.query);

  res.json({
    data: result.sedes,
    meta: {
      institucion: result.institucion
    }
  });
}

async function obtenerSede(req, res) {
  const result = await sedesService.obtenerSede(req.params.institucionCodigo, req.params.sedeCodigo);

  res.json({
    data: result.sede,
    meta: {
      institucion: result.institucion
    }
  });
}

async function crearSede(req, res) {
  const result = await sedesService.crearSede(req.params.institucionCodigo, req.body, { req });

  res.status(201).json({
    data: result.sede,
    meta: {
      institucion: result.institucion
    }
  });
}

async function actualizarSede(req, res) {
  const result = await sedesService.actualizarSede(
    req.params.institucionCodigo,
    req.params.sedeCodigo,
    req.body,
    { req }
  );

  res.json({
    data: result.sede,
    meta: {
      institucion: result.institucion
    }
  });
}

module.exports = {
  listarSedes,
  obtenerSede,
  crearSede,
  actualizarSede
};
