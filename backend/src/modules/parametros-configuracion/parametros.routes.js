const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const parametrosController = require('./parametros.controller');

const router = Router();

router.get('/', authorize('parametro.ver'), asyncHandler(parametrosController.listarParametros));
router.post('/', authorize('parametro.crear'), asyncHandler(parametrosController.crearParametro));
router.get('/:id', authorize('parametro.ver'), asyncHandler(parametrosController.obtenerParametro));
router.patch('/:id', authorize('parametro.editar'), asyncHandler(parametrosController.actualizarParametro));

module.exports = router;
