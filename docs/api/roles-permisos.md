# API Roles Y Permisos

Base URL:

```text
/api
```

## Reglas

- Los roles y permisos base se cargan por SQL semilla.
- `estado` acepta `ACTIVO`, `INACTIVO` o `ELIMINADO`.
- Las relaciones `rol_permiso` y `usuario_rol` no se eliminan físicamente.
- Una asignación activa equivalente de rol a usuario no puede duplicarse.
- Las asignaciones de rol pueden ser globales o contextualizadas por institución, sede y periodo.
- Si se asigna por `sede_id` o `periodo_id`, debe existir `institucion_id`.
- Las escrituras registran auditoría en `erp.auditoria`.
- La auditoría registra `usuario_id` automáticamente cuando la petición está autenticada.

## Roles

```http
GET /api/roles
GET /api/roles?estado=ACTIVO
GET /api/roles/:codigo
```

## Permisos

```http
GET /api/permisos
GET /api/permisos?estado=ACTIVO
GET /api/permisos?modulo=nucleo
GET /api/permisos/:codigo
```

## Permisos Por Rol

```http
GET /api/roles/:rolCodigo/permisos
POST /api/roles/:rolCodigo/permisos
```

Payload:

```json
{
  "permiso_codigo": "persona.ver",
  "estado": "ACTIVO"
}
```

Para quitar lógicamente un permiso del rol:

```json
{
  "permiso_codigo": "persona.ver",
  "estado": "INACTIVO"
}
```

## Roles Por Usuario

```http
GET /api/usuarios/:id/roles
POST /api/usuarios/:id/roles
PATCH /api/usuarios/:id/roles/:asignacionId
```

Payload global:

```json
{
  "rol_codigo": "DOCENTE",
  "fecha_inicio": "2026-07-01",
  "fecha_fin": null,
  "estado": "ACTIVO"
}
```

Payload institucional:

```json
{
  "rol_codigo": "SECRETARIA",
  "institucion_id": 1,
  "fecha_inicio": "2026-07-01",
  "estado": "ACTIVO"
}
```

Payload por sede:

```json
{
  "rol_codigo": "INSPECTOR",
  "institucion_id": 1,
  "sede_id": 1,
  "fecha_inicio": "2026-07-01",
  "estado": "ACTIVO"
}
```

Payload por periodo:

```json
{
  "rol_codigo": "DOCENTE",
  "institucion_id": 1,
  "periodo_id": 1,
  "fecha_inicio": "2026-07-01",
  "estado": "ACTIVO"
}
```

Para inactivar una asignación:

```json
{
  "estado": "INACTIVO",
  "fecha_fin": "2026-12-31"
}
```

## Errores Comunes

```text
400 Estado no válido
400 El campo rol_codigo es requerido
400 El código del permiso es requerido
400 El campo usuario_id debe ser un identificador válido
400 Asignar rol por sede requiere institucion_id
400 Asignar rol por periodo requiere institucion_id
400 La fecha de fin debe ser mayor o igual a la fecha de inicio
400 El contexto asociado no existe
404 Rol no encontrado
404 Permiso no encontrado
404 Usuario no encontrado
404 Asignación de rol no encontrada
409 Ya existe una asignación activa equivalente
```
