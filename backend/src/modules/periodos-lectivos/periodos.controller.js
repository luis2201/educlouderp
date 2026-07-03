const periodosService = require('./periodos.service');

async function listarPeriodos(req, res) {
  const result = await periodosService.listarPeriodos(req.params.institucionCodigo, req.query);

  res.json({
    data: result.periodos,
    meta: {
      institucion: result.institucion
    }
  });
}

async function obtenerPeriodo(req, res) {
  const result = await periodosService.obtenerPeriodo(req.params.institucionCodigo, req.params.periodoCodigo);

  res.json({
    data: result.periodo,
    meta: {
      institucion: result.institucion
    }
  });
}

async function crearPeriodo(req, res) {
  const result = await periodosService.crearPeriodo(req.params.institucionCodigo, req.body, { req });

  res.status(201).json({
    data: result.periodo,
    meta: {
      institucion: result.institucion
    }
  });
}

async function actualizarPeriodo(req, res) {
  const result = await periodosService.actualizarPeriodo(
    req.params.institucionCodigo,
    req.params.periodoCodigo,
    req.body,
    { req }
  );

  res.json({
    data: result.periodo,
    meta: {
      institucion: result.institucion
    }
  });
}

module.exports = {
  listarPeriodos,
  obtenerPeriodo,
  crearPeriodo,
  actualizarPeriodo
};
