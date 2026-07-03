const { Router } = require('express');
const { query } = require('../db/query');
const env = require('../config/env');

const router = Router();

router.get('/health', async (req, res, next) => {
  try {
    const dbResult = await query(`
      SELECT
        NOW() AS fecha_servidor,
        CURRENT_DATABASE() AS base_datos,
        CURRENT_SCHEMA() AS schema_actual,
        TO_REGNAMESPACE($1) IS NOT NULL AS schema_erp_disponible
    `, [env.database.schema]);

    res.json({
      status: 'ok',
      app: 'EduCloudERP API',
      environment: env.nodeEnv,
      database: 'connected',
      ...dbResult.rows[0]
    });
  } catch (error) {
    res.status(500);
    next(error);
  }
});

module.exports = router;
