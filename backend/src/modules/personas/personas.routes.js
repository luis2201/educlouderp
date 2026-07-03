const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const personasController = require('./personas.controller');

const router = Router();

router.get('/', authorize('persona.ver'), asyncHandler(personasController.listarPersonas));
router.post('/', authorize('persona.crear'), asyncHandler(personasController.crearPersona));
router.get('/:id', authorize('persona.ver'), asyncHandler(personasController.obtenerPersona));
router.patch('/:id', authorize('persona.editar'), asyncHandler(personasController.actualizarPersona));

module.exports = router;
