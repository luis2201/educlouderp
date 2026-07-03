# API Parámetros De Configuración

Base URL:

```text
/api/parametros-configuracion
```

## Reglas

- `codigo` se normaliza a minúsculas.
- `estado` acepta `ACTIVO`, `INACTIVO` o `ELIMINADO`.
- `ambito` acepta `GLOBAL`, `INSTITUCION`, `SEDE`, `PERIODO`, `MODULO` o `USUARIO`.
- `tipo_dato` acepta `TEXTO`, `NUMERO`, `DECIMAL`, `BOOLEANO`, `FECHA`, `HORA`, `JSON`, `LISTA`, `ARCHIVO` o `COLOR`.
- El valor se valida según `tipo_dato`.
- `fecha_inicio` y `fecha_fin` usan formato `YYYY-MM-DD`.
- `fecha_fin` debe ser mayor o igual a `fecha_inicio`.
- No existe eliminación física por API.
- Las escrituras registran auditoría en `erp.auditoria`.

## Contexto Por Ámbito

```text
GLOBAL       sin contexto
INSTITUCION  requiere institucion_id
SEDE         requiere institucion_id y sede_id
PERIODO      requiere institucion_id y periodo_id
MODULO       requiere institucion_id y modulo
USUARIO      requiere usuario_id
```

## Listar Parámetros

```http
GET /api/parametros-configuracion
GET /api/parametros-configuracion?ambito=GLOBAL
GET /api/parametros-configuracion?estado=ACTIVO
GET /api/parametros-configuracion?codigo=sistema.nombre
```

## Obtener Parámetro

```http
GET /api/parametros-configuracion/:id
```

## Crear Parámetro

```http
POST /api/parametros-configuracion
```

Payload:

```json
{
  "codigo": "seguridad.intentos_login",
  "nombre": "Intentos fallidos permitidos",
  "descripcion": "Número de intentos fallidos antes de bloqueo.",
  "tipo_dato": "NUMERO",
  "valor": 5,
  "ambito": "GLOBAL",
  "editable": true,
  "version": 1,
  "fecha_inicio": "2026-01-01",
  "fecha_fin": "2026-12-31"
}
```

## Actualizar Parámetro

```http
PATCH /api/parametros-configuracion/:id
```

Payload:

```json
{
  "valor": 6,
  "version": 2,
  "estado": "ACTIVO"
}
```

El `ambito`, `tipo_dato`, `codigo` y contexto no se cambian por `PATCH`; si cambia la naturaleza del parámetro, debe crearse otro o manejarse por migración controlada.

## Errores Comunes

```text
400 El código del parámetro es requerido
400 El campo nombre es requerido
400 Tipo de dato no válido
400 Ámbito no válido
400 El campo valor es requerido
400 El valor debe coincidir con tipo_dato
400 El contexto asociado no existe
400 La fecha de fin debe ser mayor o igual a la fecha de inicio
403 El parámetro no es editable
404 Parámetro de configuración no encontrado
409 Ya existe un parámetro con el mismo código y contexto
```
