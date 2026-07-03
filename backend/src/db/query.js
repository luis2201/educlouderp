const pool = require('./pool');

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

module.exports = {
  query,
  pool
};
