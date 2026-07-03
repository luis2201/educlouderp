const env = require('../config/env');

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  const safeMessage = statusCode >= 500 ? 'Error interno del servidor' : error.message;

  if (statusCode >= 500) {
    console.error('Unhandled request error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      error
    });
  }

  res.status(statusCode).json({
    status: 'error',
    message: safeMessage || 'Error interno del servidor',
    request_id: req.id,
    ...(env.debugErrors ? { stack: error.stack } : {})
  });
}

module.exports = errorHandler;
