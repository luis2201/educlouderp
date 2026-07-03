const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || process.env.BACKEND_PORT || 4005),
  debugErrors: process.env.DEBUG_ERRORS === 'true',
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jsonLimit: process.env.JSON_LIMIT || '100kb',
    sessionDurationMinutes: Number(process.env.SESSION_DURATION_MINUTES || 120),
    authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
    apiRateLimitWindowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    apiRateLimitMax: Number(process.env.API_RATE_LIMIT_MAX || 300)
  },
  database: {
    host: process.env.DB_HOST || 'database',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || process.env.POSTGRES_DB,
    user: process.env.DB_USER || process.env.POSTGRES_USER,
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    schema: process.env.DB_SCHEMA || 'erp'
  }
};

module.exports = env;
