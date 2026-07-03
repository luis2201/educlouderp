const { Pool } = require('pg');
const databaseConfig = require('../config/database');

const pool = new Pool(databaseConfig);

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

module.exports = pool;
