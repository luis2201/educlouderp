# API Personas

Base URL:

```text
/api/personas
```

## Reglas

- La persona es la identidad central del ERP.
- `tipo_identificacion + identificacion` debe ser único.
- `tipo_identificacion` acepta `CEDULA`, `RUC`, `PASAPORTE`, `EXTRANJERO` u `OTRO`.
- `estado` acepta `ACTIVO`, `INACTIVO` o `ELIMINADO`.
- `fecha_nacimiento` usa formato `YYYY-MM-DD`.
- `correo` se guarda en minúsculas y valida formato básico.
- No existe eliminación física por API.
- `tipo_identificacion` e `identificacion` no se cambian por `PATCH`; si hay corrección de identidad, debe manejarse como proceso controlado.
- Las escrituras registran auditoría en `erp.auditoria`.

## Listar Personas

```http
GET /api/personas
GET /api/personas?estado=ACTIVO
GET /api/personas?tipo_identificacion=CEDULA&identificacion=0999999999
GET /api/personas?correo=persona@dominio.com
GET /api/personas?q=texto
```

## Obtener Persona

```http
GET /api/personas/:id
```

## Crear Persona

```http
POST /api/personas
```

Payload:

```json
{
  "tipo_identificacion": "CEDULA",
  "identificacion": "0999999999",
  "nombres": "María Fernanda",
  "apellidos": "Pérez Zambrano",
  "fecha_nacimiento": "1990-05-10",
  "genero": "FEMENINO",
  "correo": "maria.perez@example.com",
  "telefono": "0999999999",
  "direccion": "Av. Principal 123",
  "metadata": {
    "origen": "registro_manual"
  }
}
```

## Actualizar Persona

```http
PATCH /api/personas/:id
```

Payload:

```json
{
  "nombres": "María Fernanda",
  "apellidos": "Pérez Zambrano",
  "correo": "maria.perez@example.com",
  "telefono": "0999999999",
  "direccion": "Av. Principal 123",
  "estado": "ACTIVO",
  "metadata": {
    "origen": "registro_manual"
  }
}
```

## Errores Comunes

```text
400 El campo tipo_identificacion es requerido
400 Tipo de identificación no válido
400 El campo identificacion es requerido
400 El campo nombres es requerido
400 El campo apellidos es requerido
400 El campo correo no tiene un formato válido
400 El campo fecha_nacimiento debe tener formato YYYY-MM-DD
400 El campo metadata debe ser un objeto JSON
404 Persona no encontrada
409 Ya existe una persona con el mismo tipo de identificación e identificación
```
