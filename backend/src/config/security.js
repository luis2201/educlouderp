const env = require('./env');

function corsOptions() {
  return {
    origin(origin, callback) {
      if (!origin || env.nodeEnv === 'development') {
        callback(null, true);
        return;
      }

      if (env.security.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origen CORS no permitido'));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    credentials: false,
    maxAge: 600
  };
}

module.exports = {
  corsOptions
};
