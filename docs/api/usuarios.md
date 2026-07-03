# API Usuarios

Base URL:

```text
/api/usuarios
```

## Reglas

- Un usuario siempre pertenece a una persona existente.
- Una persona puede tener como máximo un usuario.
- `username` se guarda en minúsculas.
- `username` acepta letras, números, punto, guion y guion bajo, de 3 a 80 caracteres.
- `email_acceso` se guarda en minúsculas y valida formato básico.
- `estado` acepta `ACTIVO`, `INACTIVO`, `BLOQUEADO` o `PENDIENTE`.
- La contraseña nunca se devuelve por API.
- `password_hash` se guarda con hash `scrypt` de Node.js.
- No existe eliminación física por API.
- El usuario se inactiva con `estado = INACTIVO`.
- Las escrituras registran auditoría en `erp.auditoria`.

## Listar Usuarios

```http
GET /api/usuarios
GET /api/usuarios?estado=ACTIVO
GET /api/usuarios?persona_id=1
GET /api/usuarios?username=admin
GET /api/usuarios?email_acceso=admin@example.com
```

## Obtener Usuario

```http
GET /api/usuarios/:id
```

La respuesta incluye un resumen de la persona asociada en `persona`.

## Crear Usuario

```http
POST /api/usuarios
```

Payload:

```json
{
  "persona_id": 1,
  "username": "maria.perez",
  "email_acceso": "maria.perez@example.com",
  "password": "Temporal123",
  "estado": "PENDIENTE",
  "debe_cambiar_clave": true,
  "metadata": {
    "origen": "registro_manual"
  }
}
```

## Actualizar Usuario

```http
PATCH /api/usuarios/:id
```

Payload:

```json
{
  "email_acceso": "maria.perez@example.com",
  "estado": "ACTIVO",
  "debe_cambiar_clave": false,
  "intentos_fallidos": 0,
  "bloqueado_hasta": null,
  "metadata": {
    "origen": "registro_manual"
  }
}
```

## Cambiar Clave

```http
PATCH /api/usuarios/:id/clave
```

Payload:

```json
{
  "password": "NuevaClave123",
  "debe_cambiar_clave": false
}
```

## Sesiones Del Usuario

```http
GET   /api/usuarios/:id/sesiones
GET   /api/usuarios/:id/sesiones?estado=ACTIVA
GET   /api/usuarios/:id/sesiones/:sessionId
PATCH /api/usuarios/:id/sesiones/:sessionId/cerrar
PATCH /api/usuarios/:id/sesiones/cerrar-activas
```

Estas rutas permiten auditar y cerrar sesiones del usuario. No exponen `token_hash`.

## Errores Comunes

```text
400 El campo persona_id debe ser un identificador válido
400 El campo username es requerido
400 El username debe tener 3 a 80 caracteres y usar letras, números, punto, guion o guion bajo
400 El email de acceso no tiene un formato válido
400 Estado de usuario no válido
400 La contraseña debe tener al menos 8 caracteres
400 El campo metadata debe ser un objeto JSON
404 Persona no encontrada
404 Usuario no encontrado
409 Ya existe un usuario con la misma persona, username o email de acceso
```
