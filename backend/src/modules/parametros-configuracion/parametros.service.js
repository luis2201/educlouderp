const parametrosRepository = require('./parametros.repository');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_VALIDOS = new Set(['ACTIVO', 'INACTIVO', 'ELIMINADO']);
const AMBITOS_VALIDOS = new Set(['GLOBAL', 'INSTITUCION', 'SEDE', 'PERIODO', 'MODULO', 'USUARIO']);
const TIPOS_DATO_VALIDOS = new Set(['TEXTO', 'NUMERO', 'DECIMAL', 'BOOLEANO', 'FECHA', 'HORA', 'JSON', 'LISTA', 'ARCHIVO', 'COLOR']);

function normalizeCodigo(codigo) {
  return String(codigo || '').trim().toLowerCase();
}

function normalizeTextoRequerido(value, fieldName) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw httpError(400, `El campo ${fieldName} es requerido`);
  }

  return normalized;
}

function normalizeTextoOpcional(value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeEnum(value, validSet, fieldName, required = false) {
  if (!value) {
    if (required) {
      throw httpError(400, `El campo ${fieldName} es requerido`);
    }

    return undefined;
  }

  const normalized = String(value).trim().toUpperCase();

  if (!validSet.has(normalized)) {
    throw httpError(400, `${fieldName} no válido`);
  }

  return normalized;
}

function normalizeId(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw httpError(400, `El campo ${fieldName} debe ser un identificador válido`);
  }

  return numberValue;
}

function normalizeBoolean(value, fieldName, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'boolean') {
    throw httpError(400, `El campo ${fieldName} debe ser booleano`);
  }

  return value;
}

function normalizeInteger(value, fieldName, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw httpError(400, `El campo ${fieldName} debe ser un entero positivo`);
  }

  return numberValue;
}

function normalizeFecha(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw httpError(400, `El campo ${fieldName} debe tener formato YYYY-MM-DD`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw httpError(400, `El campo ${fieldName} no es una fecha válida`);
  }

  return normalized;
}

function ensureVigencia(fechaInicio, fechaFin) {
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    throw httpError(400, 'La fecha de fin debe ser mayor o igual a la fecha de inicio');
  }
}

function normalizeValorPorTipo(tipoDato, valor) {
  if (valor === undefined) {
    throw httpError(400, 'El campo valor es requerido');
  }

  if (tipoDato === 'TEXTO' && typeof valor !== 'string') {
    throw httpError(400, 'El valor debe ser texto');
  }

  if (tipoDato === 'NUMERO' && !Number.isInteger(valor)) {
    throw httpError(400, 'El valor debe ser un número entero');
  }

  if (tipoDato === 'DECIMAL' && typeof valor !== 'number') {
    throw httpError(400, 'El valor debe ser decimal');
  }

  if (tipoDato === 'BOOLEANO' && typeof valor !== 'boolean') {
    throw httpError(400, 'El valor debe ser booleano');
  }

  if (tipoDato === 'FECHA') {
    normalizeFecha(valor, 'valor');
  }

  if (tipoDato === 'HORA' && !/^\d{2}:\d{2}(:\d{2})?$/.test(String(valor))) {
    throw httpError(400, 'El valor debe tener formato HH:mm o HH:mm:ss');
  }

  if (tipoDato === 'JSON' && (valor === null || Array.isArray(valor) || typeof valor !== 'object')) {
    throw httpError(400, 'El valor debe ser un objeto JSON');
  }

  if (tipoDato === 'LISTA' && !Array.isArray(valor)) {
    throw httpError(400, 'El valor debe ser una lista');
  }

  if (tipoDato === 'ARCHIVO' && !(typeof valor === 'string' || (valor && typeof valor === 'object' && !Array.isArray(valor)))) {
    throw httpError(400, 'El valor debe ser texto u objeto JSON');
  }

  if (tipoDato === 'COLOR' && (typeof valor !== 'string' || !/^#?[0-9a-fA-F]{6}$/.test(valor))) {
    throw httpError(400, 'El valor debe ser un color hexadecimal');
  }

  return valor;
}

function ensureContextoPorAmbito(data) {
  const hasInstitucion = Boolean(data.institucionId);
  const hasSede = Boolean(data.sedeId);
  const hasPeriodo = Boolean(data.periodoId);
  const hasModulo = Boolean(data.modulo);
  const hasUsuario = Boolean(data.usuarioId);

  if (data.ambito === 'GLOBAL' && (hasInstitucion || hasSede || hasPeriodo || hasModulo || hasUsuario)) {
    throw httpError(400, 'El ámbito GLOBAL no debe tener contexto asociado');
  }

  if (data.ambito === 'INSTITUCION' && (!hasInstitucion || hasSede || hasPeriodo || hasModulo || hasUsuario)) {
    throw httpError(400, 'El ámbito INSTITUCION requiere solo institucion_id');
  }

  if (data.ambito === 'SEDE' && (!hasInstitucion || !hasSede || hasPeriodo || hasModulo || hasUsuario)) {
    throw httpError(400, 'El ámbito SEDE requiere institucion_id y sede_id');
  }

  if (data.ambito === 'PERIODO' && (!hasInstitucion || hasSede || !hasPeriodo || hasModulo || hasUsuario)) {
    throw httpError(400, 'El ámbito PERIODO requiere institucion_id y periodo_id');
  }

  if (data.ambito === 'MODULO' && (!hasInstitucion || hasSede || hasPeriodo || !hasModulo || hasUsuario)) {
    throw httpError(400, 'El ámbito MODULO requiere institucion_id y modulo');
  }

  if (data.ambito === 'USUARIO' && hasInstitucion === false && !hasUsuario) {
    throw httpError(400, 'El ámbito USUARIO requiere usuario_id');
  }

  if (data.ambito === 'USUARIO' && !hasUsuario) {
    throw httpError(400, 'El ámbito USUARIO requiere usuario_id');
  }
}

function handleRepositoryError(error) {
  if (error.code === '23505') {
    throw httpError(409, 'Ya existe un parámetro con el mismo código y contexto');
  }

  if (error.code === '23503') {
    throw httpError(400, 'El contexto asociado no existe');
  }

  if (error.code === '23514') {
    throw httpError(400, 'La fecha de fin debe ser mayor o igual a la fecha de inicio');
  }

  throw error;
}

async function listarParametros(filters = {}) {
  return parametrosRepository.findAll({
    codigo: filters.codigo ? normalizeCodigo(filters.codigo) : undefined,
    estado: normalizeEnum(filters.estado, ESTADOS_VALIDOS, 'Estado'),
    ambito: normalizeEnum(filters.ambito, AMBITOS_VALIDOS, 'Ámbito'),
    institucion_id: normalizeId(filters.institucion_id ?? filters.institucionId, 'institucion_id'),
    sede_id: normalizeId(filters.sede_id ?? filters.sedeId, 'sede_id'),
    periodo_id: normalizeId(filters.periodo_id ?? filters.periodoId, 'periodo_id'),
    usuario_id: normalizeId(filters.usuario_id ?? filters.usuarioId, 'usuario_id')
  });
}

async function obtenerParametro(id) {
  const parametroId = normalizeId(id, 'id');

  if (!parametroId) {
    throw httpError(400, 'El id del parámetro es requerido');
  }

  const parametro = await parametrosRepository.findById(parametroId);

  if (!parametro) {
    throw httpError(404, 'Parámetro de configuración no encontrado');
  }

  return parametro;
}

async function crearParametro(payload = {}, context = {}) {
  const data = {
    codigo: normalizeCodigo(payload.codigo),
    nombre: normalizeTextoRequerido(payload.nombre, 'nombre'),
    descripcion: normalizeTextoOpcional(payload.descripcion),
    tipoDato: normalizeEnum(payload.tipo_dato ?? payload.tipoDato, TIPOS_DATO_VALIDOS, 'Tipo de dato', true),
    ambito: normalizeEnum(payload.ambito, AMBITOS_VALIDOS, 'Ámbito') || 'GLOBAL',
    institucionId: normalizeId(payload.institucion_id ?? payload.institucionId, 'institucion_id'),
    sedeId: normalizeId(payload.sede_id ?? payload.sedeId, 'sede_id'),
    periodoId: normalizeId(payload.periodo_id ?? payload.periodoId, 'periodo_id'),
    modulo: normalizeTextoOpcional(payload.modulo),
    usuarioId: normalizeId(payload.usuario_id ?? payload.usuarioId, 'usuario_id'),
    editable: normalizeBoolean(payload.editable, 'editable', true),
    version: normalizeInteger(payload.version, 'version', 1),
    fechaInicio: normalizeFecha(payload.fecha_inicio ?? payload.fechaInicio, 'fecha_inicio'),
    fechaFin: normalizeFecha(payload.fecha_fin ?? payload.fechaFin, 'fecha_fin'),
    estado: normalizeEnum(payload.estado, ESTADOS_VALIDOS, 'Estado') || 'ACTIVO'
  };

  if (!data.codigo) {
    throw httpError(400, 'El código del parámetro es requerido');
  }

  data.valor = normalizeValorPorTipo(data.tipoDato, payload.valor);
  ensureContextoPorAmbito(data);
  ensureVigencia(data.fechaInicio, data.fechaFin);

  try {
    const parametro = await parametrosRepository.create(data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'nucleo',
      entidad: 'parametro_configuracion',
      entidadId: parametro.id,
      accion: 'CREAR',
      valorNuevo: parametro,
      institucionId: parametro.institucion_id
    });

    return parametro;
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarParametro(id, payload = {}, context = {}) {
  const parametro = await obtenerParametro(id);

  if (!parametro.editable) {
    throw httpError(403, 'El parámetro no es editable');
  }

  const fechaInicio = normalizeFecha(payload.fecha_inicio ?? payload.fechaInicio, 'fecha_inicio');
  const fechaFin = normalizeFecha(payload.fecha_fin ?? payload.fechaFin, 'fecha_fin');
  ensureVigencia(fechaInicio || parametro.fecha_inicio, fechaFin || parametro.fecha_fin);

  const data = {
    nombre: payload.nombre === undefined ? undefined : normalizeTextoRequerido(payload.nombre, 'nombre'),
    descripcion: normalizeTextoOpcional(payload.descripcion),
    valor: payload.valor === undefined ? undefined : normalizeValorPorTipo(parametro.tipo_dato, payload.valor),
    editable: normalizeBoolean(payload.editable, 'editable'),
    version: normalizeInteger(payload.version, 'version'),
    fechaInicio,
    fechaFin,
    estado: normalizeEnum(payload.estado, ESTADOS_VALIDOS, 'Estado')
  };

  const parametroActualizado = await parametrosRepository.update(parametro.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'nucleo',
    entidad: 'parametro_configuracion',
    entidadId: parametroActualizado.id,
    accion: 'ACTUALIZAR',
    valorAnterior: parametro,
    valorNuevo: parametroActualizado,
    institucionId: parametroActualizado.institucion_id
  });

  return parametroActualizado;
}

module.exports = {
  listarParametros,
  obtenerParametro,
  crearParametro,
  actualizarParametro
};
