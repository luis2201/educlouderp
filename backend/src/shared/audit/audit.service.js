const { query } = require('../../db/query');

function getRequestContext(req) {
  if (!req) {
    return {};
  }

  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
    metadata: {
      method: req.method,
      path: req.originalUrl
    }
  };
}

async function registrarAuditoria({
  req,
  modulo,
  entidad,
  entidadId,
  accion,
  valorAnterior = null,
  valorNuevo = null,
  institucionId = null,
  personaId = null,
  usuarioId = null,
  motivo = null,
  metadata = {}
}) {
  const context = getRequestContext(req);
  const resolvedUsuarioId = usuarioId || req?.user?.id || null;
  const resolvedPersonaId = personaId || req?.user?.persona_id || null;

  await query(`
    INSERT INTO erp.auditoria (
      usuario_id,
      institucion_id,
      persona_id,
      modulo,
      entidad,
      entidad_id,
      accion,
      valor_anterior,
      valor_nuevo,
      ip,
      user_agent,
      motivo,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, $12, $13::jsonb)
  `, [
    resolvedUsuarioId,
    institucionId,
    resolvedPersonaId,
    modulo,
    entidad,
    entidadId === undefined || entidadId === null ? null : String(entidadId),
    accion,
    valorAnterior === null ? null : JSON.stringify(valorAnterior),
    valorNuevo === null ? null : JSON.stringify(valorNuevo),
    context.ip || null,
    context.userAgent || null,
    motivo,
    JSON.stringify({
      ...(context.metadata || {}),
      ...metadata
    })
  ]);
}

module.exports = {
  registrarAuditoria
};
