const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authorize = require('../../middlewares/authorize');
const seguridadController = require('./seguridad.controller');

const router = Router();

router.use(authorize('rol.administrar'));

router.get('/roles', asyncHandler(seguridadController.listarRoles));
router.get('/roles/:codigo', asyncHandler(seguridadController.obtenerRol));
router.get('/roles/:rolCodigo/permisos', asyncHandler(seguridadController.listarPermisosRol));
router.post('/roles/:rolCodigo/permisos', asyncHandler(seguridadController.asignarPermisoRol));

router.get('/permisos', asyncHandler(seguridadController.listarPermisos));
router.get('/permisos/:codigo', asyncHandler(seguridadController.obtenerPermiso));

router.get('/usuarios/:id/roles', asyncHandler(seguridadController.listarRolesUsuario));
router.post('/usuarios/:id/roles', asyncHandler(seguridadController.asignarRolUsuario));
router.patch('/usuarios/:id/roles/:asignacionId', asyncHandler(seguridadController.actualizarRolUsuario));

module.exports = router;
