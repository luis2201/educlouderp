const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const { corsOptions } = require('./config/security');
const healthRoutes = require('./routes/health.routes');
const catalogosRoutes = require('./modules/catalogos/catalogos.routes');
const institucionesRoutes = require('./modules/instituciones/instituciones.routes');
const parametrosRoutes = require('./modules/parametros-configuracion/parametros.routes');
const personasRoutes = require('./modules/personas/personas.routes');
const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
const seguridadRoutes = require('./modules/seguridad/seguridad.routes');
const authRoutes = require('./modules/auth/auth.routes');
const requestId = require('./middlewares/requestId');
const sanitizeInput = require('./middlewares/sanitizeInput');
const authenticate = require('./middlewares/authenticate');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

const apiLimiter = rateLimit({
  windowMs: env.security.apiRateLimitWindowMs,
  limit: env.security.apiRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes, intente nuevamente más tarde'
  }
});

const authLimiter = rateLimit({
  windowMs: env.security.authRateLimitWindowMs,
  limit: env.security.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    message: 'Demasiados intentos de autenticación, intente nuevamente más tarde'
  }
});

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(helmet());
app.use(cors(corsOptions()));
app.use(express.json({ limit: env.security.jsonLimit, strict: true }));
app.use(sanitizeInput);

app.get('/', (req, res) => {
  res.json({
    message: 'EduCloudERP Backend funcionando correctamente'
  });
});

app.use(healthRoutes);
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', authenticate);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/instituciones', institucionesRoutes);
app.use('/api/parametros-configuracion', parametrosRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api', seguridadRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
