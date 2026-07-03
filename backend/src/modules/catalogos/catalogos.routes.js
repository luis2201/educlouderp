const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const catalogosController = require('./catalogos.controller');

const router = Router();

router.get('/', authorize('catalogo.ver'), asyncHandler(catalogosController.listarCatalogos));
router.post('/', authorize('catalogo.crear'), asyncHandler(catalogosController.crearCatalogo));
router.get('/:codigo/items', authorize('catalogo.ver'), asyncHandler(catalogosController.listarItems));
router.post('/:codigo/items', authorize('catalogo.crear'), asyncHandler(catalogosController.crearItem));
router.patch('/:codigo/items/:itemCodigo', authorize('catalogo.editar'), asyncHandler(catalogosController.actualizarItem));
router.get('/:codigo', authorize('catalogo.ver'), asyncHandler(catalogosController.obtenerCatalogo));
router.patch('/:codigo', authorize('catalogo.editar'), asyncHandler(catalogosController.actualizarCatalogo));

module.exports = router;
