const crypto = require('crypto');
const { pool } = require('../src/db/query');
const { hashPassword } = require('../src/shared/security/passwords');

function getConfig() {
  return {
    username: process.env.BOOTSTRAP_SUPERADMIN_USERNAME || 'superadmin',
    email: process.env.BOOTSTRAP_SUPERADMIN_EMAIL || 'admin@educlouderp.local',
    identificacion: process.env.BOOTSTRAP_SUPERADMIN_IDENTIFICACION || 'ADMIN-ROOT-001',
    nombres: process.env.BOOTSTRAP_SUPERADMIN_NOMBRES || 'Super',
    apellidos: process.env.BOOTSTRAP_SUPERADMIN_APELLIDOS || 'Administrador',
    password: process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url'),
    resetPassword: process.env.BOOTSTRAP_SUPERADMIN_RESET_PASSWORD === 'true'
  };
}

async function existingUser(client, username) {
  const result = await client.query(`
    SELECT id, username, estado
    FROM erp.usuario
    WHERE username = $1
    LIMIT 1
  `, [username]);

  return result.rows[0] || null;
}

async function bootstrap() {
  const config = getConfig();
  const client = await pool.connect();
  const existing = await existingUser(client, config.username);
  const shouldSetPassword = !existing || config.resetPassword;
  const passwordHash = shouldSetPassword ? hashPassword(config.password) : null;

  try {
    await client.query('BEGIN');

    const personaResult = await client.query(`
      INSERT INTO erp.persona (
        tipo_identificacion,
        identificacion,
        nombres,
        apellidos,
        correo,
        estado,
        metadata
      )
      VALUES (
        'OTRO',
        $1,
        $2,
        $3,
        $4,
        'ACTIVO',
        '{"bootstrap": true, "perfil": "superadmin"}'::jsonb
      )
      ON CONFLICT (tipo_identificacion, identificacion)
      DO UPDATE SET
        nombres = EXCLUDED.nombres,
        apellidos = EXCLUDED.apellidos,
        correo = EXCLUDED.correo,
        estado = 'ACTIVO',
        metadata = EXCLUDED.metadata
      RETURNING id
    `, [
      config.identificacion,
      config.nombres,
      config.apellidos,
      config.email
    ]);

    const personaId = personaResult.rows[0].id;

    const usuarioResult = await client.query(`
      INSERT INTO erp.usuario (
        persona_id,
        username,
        email_acceso,
        password_hash,
        estado,
        debe_cambiar_clave,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'ACTIVO',
        TRUE,
        '{"bootstrap": true}'::jsonb
      )
      ON CONFLICT (username)
      DO UPDATE SET
        email_acceso = EXCLUDED.email_acceso,
        password_hash = COALESCE($5, erp.usuario.password_hash),
        estado = 'ACTIVO',
        debe_cambiar_clave = TRUE,
        metadata = EXCLUDED.metadata
      RETURNING id
    `, [
      personaId,
      config.username,
      config.email,
      passwordHash || hashPassword(crypto.randomBytes(18).toString('base64url')),
      passwordHash
    ]);

    const usuarioId = usuarioResult.rows[0].id;

    await client.query(`
      INSERT INTO erp.usuario_rol (usuario_id, rol_id, estado)
      SELECT $1, r.id, 'ACTIVO'
      FROM erp.rol r
      WHERE r.codigo = 'SUPERADMIN'
      ON CONFLICT DO NOTHING
    `, [usuarioId]);

    await client.query('COMMIT');

    console.log('Superadmin bootstrap completado');
    console.log(`usuario_id=${usuarioId}`);
    console.log(`username=${config.username}`);
    console.log(`email=${config.email}`);
    console.log(`password_${shouldSetPassword ? 'temporal' : 'sin_cambios'}=${shouldSetPassword ? config.password : 'NO_ROTADA'}`);
    console.log('debe_cambiar_clave=true');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

bootstrap().catch((error) => {
  console.error('No se pudo crear superadmin:', error.message);
  process.exitCode = 1;
});
