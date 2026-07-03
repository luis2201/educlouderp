const personasService = require('./personas.service');

async function listarPersonas(req, res) {
  const personas = await personasService.listarPersonas(req.query);

  res.json({
    data: personas
  });
}

async function obtenerPersona(req, res) {
  const persona = await personasService.obtenerPersona(req.params.id);

  res.json({
    data: persona
  });
}

async function crearPersona(req, res) {
  const persona = await personasService.crearPersona(req.body, { req });

  res.status(201).json({
    data: persona
  });
}

async function actualizarPersona(req, res) {
  const persona = await personasService.actualizarPersona(req.params.id, req.body, { req });

  res.json({
    data: persona
  });
}

module.exports = {
  listarPersonas,
  obtenerPersona,
  crearPersona,
  actualizarPersona
};
