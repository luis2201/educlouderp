const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const institucionesController = require('./instituciones.controller');
const sedesRoutes = require('../sedes/sedes.routes');
const periodosRoutes = require('../periodos-lectivos/periodos.routes');

const router = Router();

router.get('/', authorize('institucion.ver'), asyncHandler(institucionesController.listarInstituciones));
router.post('/', authorize('institucion.crear'), asyncHandler(institucionesController.crearInstitucion));
router.use('/:institucionCodigo/sedes', sedesRoutes);
router.use('/:institucionCodigo/periodos-lectivos', periodosRoutes);
router.get('/:codigo', authorize('institucion.ver'), asyncHandler(institucionesController.obtenerInstitucion));
router.patch('/:codigo', authorize('institucion.editar'), asyncHandler(institucionesController.actualizarInstitucion));

module.exports = router;
