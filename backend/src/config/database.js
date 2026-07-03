const env = require('./env');

const databaseConfig = {
  host: env.database.host,
  port: env.database.port,
  database: env.database.name,
  user: env.database.user,
  password: env.database.password,
  application_name: 'educlouderp-backend',
  options: `-c search_path=${env.database.schema},public`
};

module.exports = databaseConfig;
