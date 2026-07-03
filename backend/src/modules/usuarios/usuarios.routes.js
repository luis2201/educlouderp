const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const usuariosController = require('./usuarios.controller');
const authController = require('../auth/auth.controller');

const router = Router();

router.get('/', authorize('usuario.ver'), asyncHandler(usuariosController.listarUsuarios));
router.post('/', authorize('usuario.crear'), asyncHandler(usuariosController.crearUsuario));
router.get('/:id', authorize('usuario.ver'), asyncHandler(usuariosController.obtenerUsuario));
router.patch('/:id', authorize('usuario.editar'), asyncHandler(usuariosController.actualizarUsuario));
router.patch('/:id/clave', authorize('usuario.editar'), asyncHandler(usuariosController.cambiarClave));
router.get('/:id/sesiones', authorize('usuario.ver'), asyncHandler(authController.listarSesionesUsuario));
router.patch('/:id/sesiones/cerrar-activas', authorize('usuario.editar'), asyncHandler(authController.cerrarSesionesActivasUsuario));
router.get('/:id/sesiones/:sessionId', authorize('usuario.ver'), asyncHandler(authController.obtenerSesionUsuario));
router.patch('/:id/sesiones/:sessionId/cerrar', authorize('usuario.editar'), asyncHandler(authController.cerrarSesionUsuario));

module.exports = router;
