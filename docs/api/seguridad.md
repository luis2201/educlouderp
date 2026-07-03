# Seguridad Backend

## Medidas Aplicadas

- `helmet` para cabeceras HTTP seguras.
- `X-Powered-By` deshabilitado.
- CORS configurable por `CORS_ORIGINS`.
- Límite de JSON configurable por `JSON_LIMIT`.
- Rate limit general para `/api`.
- Rate limit específico para `/api/auth`.
- Tokens opacos tipo Bearer.
- En base solo se guarda `token_hash`, no el token.
- Contraseñas con hash `scrypt`.
- Stack traces ocultos por defecto.
- `request_id` en respuestas de error.
- Saneamiento básico contra prototype pollution en `body`, `query` y `params`.
- Autenticación obligatoria en rutas `/api`, salvo `/api/auth/login`.
- Autorización por permisos efectivos de usuario.
- `SUPERADMIN` funciona como bypass administrativo.
- Escrituras relevantes auditadas en `erp.auditoria`.

## Variables

```text
DEBUG_ERRORS=false
CORS_ORIGINS=http://localhost:5173
JSON_LIMIT=100kb
SESSION_DURATION_MINUTES=120
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=300
```

## Rutas Públicas

```text
GET  /
GET  /health
POST /api/auth/login
```

## Rutas Protegidas

Todas las demás rutas bajo `/api` requieren:

```http
Authorization: Bearer TOKEN_OPACO
```

## Permisos Iniciales

```text
sistema.configurar
catalogo.ver
catalogo.crear
catalogo.editar
institucion.ver
institucion.crear
institucion.editar
sede.ver
sede.crear
sede.editar
parametro.ver
parametro.crear
parametro.editar
persona.ver
persona.crear
persona.editar
usuario.ver
usuario.crear
usuario.editar
rol.administrar
periodo.ver
periodo.administrar
```

## Nota Operativa

Al estar protegida la API, el primer usuario administrador debe crearse mediante un proceso controlado de bootstrap o por script SQL administrativo. No debe exponerse un endpoint público permanente para crear superadministradores.
