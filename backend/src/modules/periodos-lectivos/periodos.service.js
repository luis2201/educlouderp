const periodosRepository = require('./periodos.repository');
const institucionesService = require('../instituciones/instituciones.service');
const { httpError } = require('../../shared/httpErrors');
const { registrarAuditoria } = require('../../shared/audit/audit.service');

const ESTADOS_PERIODO_VALIDOS = new Set(['PLANIFICADO', 'ACTIVO', 'CERRADO', 'ANULADO']);

function normalizeCodigo(codigo) {
  return String(codigo || '').trim().toUpperCase();
}

function normalizeTextoRequerido(value, fieldName) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    throw httpError(400, `El campo ${fieldName} es requerido`);
  }

  return normalized;
}

function normalizeEstado(estado) {
  if (!estado) {
    return undefined;
  }

  const normalized = String(estado).trim().toUpperCase();

  if (!ESTADOS_PERIODO_VALIDOS.has(normalized)) {
    throw httpError(400, 'Estado de periodo lectivo no válido');
  }

  return normalized;
}

function normalizeBoolean(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw httpError(400, `El campo ${fieldName} debe ser booleano`);
  }

  return value;
}

function normalizeMetadata(value) {
  if (value === undefined) {
    return {};
  }

  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw httpError(400, 'El campo metadata debe ser un objeto JSON');
  }

  return value;
}

function normalizeMetadataPatch(value) {
  if (value === undefined) {
    return undefined;
  }

  return normalizeMetadata(value);
}

function normalizeFecha(value, fieldName, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw httpError(400, `El campo ${fieldName} es requerido`);
    }

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

function ensureRangoFechas(fechaInicio, fechaFin) {
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    throw httpError(400, 'La fecha de fin debe ser mayor o igual a la fecha de inicio');
  }
}

function normalizeEsActualQuery(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  throw httpError(400, 'El filtro es_actual debe ser true o false');
}

function handleRepositoryError(error) {
  if (error.code === '23505') {
    throw httpError(409, 'Ya existe un periodo lectivo con el mismo código para la institución');
  }

  if (error.code === '23514') {
    throw httpError(400, 'La fecha de fin debe ser mayor o igual a la fecha de inicio');
  }

  throw error;
}

async function obtenerInstitucionContexto(institucionCodigo) {
  return institucionesService.obtenerInstitucion(institucionCodigo);
}

async function listarPeriodos(institucionCodigo, filters = {}) {
  const institucion = await obtenerInstitucionContexto(institucionCodigo);
  const estado = normalizeEstado(filters.estado);
  const esActual = normalizeEsActualQuery(filters.es_actual ?? filters.esActual);
  const periodos = await periodosRepository.findAllByInstitucion(institucion.id, { estado, esActual });

  return {
    institucion,
    periodos
  };
}

async function obtenerPeriodo(institucionCodigo, periodoCodigo) {
  const institucion = await obtenerInstitucionContexto(institucionCodigo);
  const codigoNormalizado = normalizeCodigo(periodoCodigo);

  if (!codigoNormalizado) {
    throw httpError(400, 'El código del periodo lectivo es requerido');
  }

  const periodo = await periodosRepository.findByCodigo(institucion.id, codigoNormalizado);

  if (!periodo) {
    throw httpError(404, 'Periodo lectivo no encontrado');
  }

  return {
    institucion,
    periodo
  };
}

async function crearPeriodo(institucionCodigo, payload = {}, context = {}) {
  const institucion = await obtenerInstitucionContexto(institucionCodigo);
  const data = {
    codigo: normalizeCodigo(payload.codigo),
    nombre: normalizeTextoRequerido(payload.nombre, 'nombre'),
    fechaInicio: normalizeFecha(payload.fecha_inicio ?? payload.fechaInicio, 'fecha_inicio', true),
    fechaFin: normalizeFecha(payload.fecha_fin ?? payload.fechaFin, 'fecha_fin', true),
    estado: normalizeEstado(payload.estado) || 'PLANIFICADO',
    esActual: normalizeBoolean(payload.es_actual ?? payload.esActual, 'es_actual') || false,
    metadata: normalizeMetadata(payload.metadata)
  };

  if (!data.codigo) {
    throw httpError(400, 'El código del periodo lectivo es requerido');
  }

  ensureRangoFechas(data.fechaInicio, data.fechaFin);

  try {
    const periodo = await periodosRepository.create(institucion.id, data);

    await registrarAuditoria({
      req: context.req,
      modulo: 'nucleo',
      entidad: 'periodo_lectivo',
      entidadId: periodo.id,
      accion: 'CREAR',
      valorNuevo: periodo,
      institucionId: institucion.id,
      metadata: {
        institucion_codigo: institucion.codigo
      }
    });

    return {
      institucion,
      periodo
    };
  } catch (error) {
    handleRepositoryError(error);
  }
}

async function actualizarPeriodo(institucionCodigo, periodoCodigo, payload = {}, context = {}) {
  const { institucion, periodo } = await obtenerPeriodo(institucionCodigo, periodoCodigo);
  const data = {
    nombre: payload.nombre === undefined ? undefined : normalizeTextoRequerido(payload.nombre, 'nombre'),
    fechaInicio: normalizeFecha(payload.fecha_inicio ?? payload.fechaInicio, 'fecha_inicio'),
    fechaFin: normalizeFecha(payload.fecha_fin ?? payload.fechaFin, 'fecha_fin'),
    estado: normalizeEstado(payload.estado),
    esActual: normalizeBoolean(payload.es_actual ?? payload.esActual, 'es_actual'),
    metadata: normalizeMetadataPatch(payload.metadata)
  };

  ensureRangoFechas(data.fechaInicio || periodo.fecha_inicio, data.fechaFin || periodo.fecha_fin);

  const periodoActualizado = await periodosRepository.update(periodo.id, institucion.id, data);

  await registrarAuditoria({
    req: context.req,
    modulo: 'nucleo',
    entidad: 'periodo_lectivo',
    entidadId: periodoActualizado.id,
    accion: 'ACTUALIZAR',
    valorAnterior: periodo,
    valorNuevo: periodoActualizado,
    institucionId: institucion.id,
    metadata: {
      institucion_codigo: institucion.codigo
    }
  });

  return {
    institucion,
    periodo: periodoActualizado
  };
}

module.exports = {
  listarPeriodos,
  obtenerPeriodo,
  crearPeriodo,
  actualizarPeriodo
};
