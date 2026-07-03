const catalogosService = require('./catalogos.service');

async function listarCatalogos(req, res) {
  const catalogos = await catalogosService.listarCatalogos(req.query);

  res.json({
    data: catalogos
  });
}

async function obtenerCatalogo(req, res) {
  const catalogo = await catalogosService.obtenerCatalogo(req.params.codigo);

  res.json({
    data: catalogo
  });
}

async function crearCatalogo(req, res) {
  const catalogo = await catalogosService.crearCatalogo(req.body, { req });

  res.status(201).json({
    data: catalogo
  });
}

async function actualizarCatalogo(req, res) {
  const catalogo = await catalogosService.actualizarCatalogo(req.params.codigo, req.body, { req });

  res.json({
    data: catalogo
  });
}

async function listarItems(req, res) {
  const result = await catalogosService.listarItems(req.params.codigo, req.query);

  res.json({
    data: result.items,
    meta: {
      catalogo: result.catalogo
    }
  });
}

async function crearItem(req, res) {
  const item = await catalogosService.crearItem(req.params.codigo, req.body, { req });

  res.status(201).json({
    data: item
  });
}

async function actualizarItem(req, res) {
  const item = await catalogosService.actualizarItem(req.params.codigo, req.params.itemCodigo, req.body, { req });

  res.json({
    data: item
  });
}

module.exports = {
  listarCatalogos,
  obtenerCatalogo,
  crearCatalogo,
  actualizarCatalogo,
  listarItems,
  crearItem,
  actualizarItem
};
