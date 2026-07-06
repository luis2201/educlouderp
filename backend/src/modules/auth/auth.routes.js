const { Router } = require('express');
const asyncHandler = require('../../shared/asyncHandler');
const authController = require('./auth.controller');

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.get('/me', asyncHandler(authController.me));
router.patch('/password', asyncHandler(authController.cambiarClaveActual));
router.post('/logout', asyncHandler(authController.logout));

module.exports = router;
