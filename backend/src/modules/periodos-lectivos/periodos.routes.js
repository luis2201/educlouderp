const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const periodosController = require('./periodos.controller');

const router = Router({ mergeParams: true });

router.get('/', authorize('periodo.ver'), asyncHandler(periodosController.listarPeriodos));
router.post('/', authorize('periodo.administrar'), asyncHandler(periodosController.crearPeriodo));
router.get('/:periodoCodigo', authorize('periodo.ver'), asyncHandler(periodosController.obtenerPeriodo));
router.patch('/:periodoCodigo', authorize('periodo.administrar'), asyncHandler(periodosController.actualizarPeriodo));

module.exports = router;
