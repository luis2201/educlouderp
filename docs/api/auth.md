# API Autenticación

Base URL:

```text
/api/auth
```

## Reglas

- El login usa `username` o `email_acceso`.
- La contraseña se valida contra `password_hash` guardado con `scrypt`.
- La API nunca devuelve `password_hash`.
- La sesión usa token opaco tipo Bearer.
- El token solo se muestra una vez, al iniciar sesión.
- En base se guarda `token_hash`, no el token original.
- Las sesiones viven en `erp.sesion_usuario`.
- Las acciones `LOGIN`, `LOGOUT` y cambio de contraseña propia registran auditoría.

## Login

```http
POST /api/auth/login
```

Payload:

```json
{
  "usuario": "admin",
  "password": "Temporal123"
}
```

También se acepta:

```json
{
  "username": "admin",
  "password": "Temporal123"
}
```

o:

```json
{
  "email": "admin@example.com",
  "password": "Temporal123"
}
```

Respuesta:

```json
{
  "data": {
    "token": "TOKEN_OPACO",
    "token_tipo": "Bearer",
    "expira_en_segundos": 7200,
    "sesion": {
      "id": "uuid",
      "usuario_id": "1",
      "estado": "ACTIVA",
      "fecha_expira": "2026-07-03T18:45:58.481Z"
    },
    "usuario": {
      "id": "1",
      "username": "admin",
      "estado": "ACTIVO"
    }
  }
}
```

## Sesión Actual

```http
GET /api/auth/me
Authorization: Bearer TOKEN_OPACO
```

## Cambiar Contraseña Propia

```http
PATCH /api/auth/password
Authorization: Bearer TOKEN_OPACO
```

Payload:

```json
{
  "password_actual": "Temporal123",
  "password": "NuevaClave123",
  "confirmar_password": "NuevaClave123"
}
```

Reglas:

- Valida la contraseña actual antes de guardar.
- La nueva contraseña debe tener al menos 8 caracteres.
- La nueva contraseña debe ser diferente a la actual.
- Al guardar, `debe_cambiar_clave` queda en `false`.

## Logout

```http
POST /api/auth/logout
Authorization: Bearer TOKEN_OPACO
```

Marca la sesión como `CERRADA` y registra `fecha_cierre`.

## Administración De Sesiones

Estas rutas están protegidas por permisos de usuario:

```http
GET   /api/usuarios/:id/sesiones
GET   /api/usuarios/:id/sesiones?estado=ACTIVA
GET   /api/usuarios/:id/sesiones/:sessionId
PATCH /api/usuarios/:id/sesiones/:sessionId/cerrar
PATCH /api/usuarios/:id/sesiones/cerrar-activas
```

Permisos requeridos:

```text
usuario.ver     para listar/consultar sesiones
usuario.editar  para cerrar sesiones
```

## Errores Comunes

```text
400 El campo usuario es requerido
400 El campo password es requerido
400 La nueva contraseña debe tener al menos 8 caracteres
400 La confirmación de contraseña no coincide
400 La nueva contraseña debe ser diferente a la actual
401 Credenciales inválidas
401 La contraseña actual no es correcta
401 Token de sesión requerido
401 Sesión inválida o expirada
401 Sesión inválida o ya cerrada
403 Usuario no habilitado para iniciar sesión
403 Usuario bloqueado temporalmente
404 Sesión no encontrada
409 La sesión no está activa o ya fue cerrada
```
