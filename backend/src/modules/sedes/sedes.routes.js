const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const sedesController = require('./sedes.controller');

const router = Router({ mergeParams: true });

router.get('/', authorize('sede.ver'), asyncHandler(sedesController.listarSedes));
router.post('/', authorize('sede.crear'), asyncHandler(sedesController.crearSede));
router.get('/:sedeCodigo', authorize('sede.ver'), asyncHandler(sedesController.obtenerSede));
router.patch('/:sedeCodigo', authorize('sede.editar'), asyncHandler(sedesController.actualizarSede));

module.exports = router;
