# API Instituciones

Base URL:

```text
/api/instituciones
```

## Reglas

- `codigo` se normaliza a mayúsculas.
- `estado` acepta `ACTIVO`, `INACTIVO` o `ELIMINADO`.
- `tipo_identificacion` acepta `CEDULA`, `RUC`, `PASAPORTE`, `EXTRANJERO` u `OTRO`.
- No existe eliminación física por API.
- Las escrituras registran auditoría en `erp.auditoria`.

## Listar Instituciones

```http
GET /api/instituciones
GET /api/instituciones?estado=ACTIVO
```

## Obtener Institución

```http
GET /api/instituciones/:codigo
```

## Crear Institución

```http
POST /api/instituciones
```

Payload:

```json
{
  "codigo": "UE_CENTRAL",
  "nombre": "Unidad Educativa Central",
  "razon_social": "Unidad Educativa Central S.A.",
  "tipo_identificacion": "RUC",
  "identificacion": "0999999999001",
  "direccion": "Av. Principal 123",
  "telefono": "0999999999",
  "correo": "info@uecentral.edu.ec",
  "sitio_web": "https://uecentral.edu.ec",
  "logo_url": "https://uecentral.edu.ec/logo.png",
  "color_primario": "#2563eb",
  "metadata": {
    "regimen": "COSTA"
  }
}
```

## Actualizar Institución

```http
PATCH /api/instituciones/:codigo
```

Payload:

```json
{
  "nombre": "Unidad Educativa Central",
  "direccion": "Av. Principal 123",
  "estado": "ACTIVO",
  "metadata": {
    "regimen": "COSTA"
  }
}
```

## Errores Comunes

```text
400 El código de la institución es requerido
400 El campo nombre es requerido
400 Estado de institución no válido
400 Tipo de identificación no válido
400 El campo metadata debe ser un objeto JSON
404 Institución no encontrada
409 Ya existe una institución con el mismo código
```
