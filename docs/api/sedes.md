# API Sedes

Base URL:

```text
/api/instituciones/:institucionCodigo/sedes
```

## Reglas

- Las sedes siempre se gestionan dentro del contexto de una institución.
- `institucionCodigo` se normaliza a mayúsculas.
- `codigo` de sede se normaliza a mayúsculas.
- El código de sede es único dentro de cada institución.
- `estado` acepta `ACTIVO`, `INACTIVO` o `ELIMINADO`.
- No existe eliminación física por API.
- Las escrituras registran auditoría en `erp.auditoria`.

## Listar Sedes

```http
GET /api/instituciones/:institucionCodigo/sedes
GET /api/instituciones/:institucionCodigo/sedes?estado=ACTIVO
```

La respuesta incluye la institución en `meta.institucion`.

## Obtener Sede

```http
GET /api/instituciones/:institucionCodigo/sedes/:sedeCodigo
```

## Crear Sede

```http
POST /api/instituciones/:institucionCodigo/sedes
```

Payload:

```json
{
  "codigo": "MATRIZ",
  "nombre": "Sede Matriz",
  "direccion": "Av. Principal 123",
  "telefono": "0999999999",
  "correo": "matriz@uecentral.edu.ec",
  "metadata": {
    "principal": true
  }
}
```

## Actualizar Sede

```http
PATCH /api/instituciones/:institucionCodigo/sedes/:sedeCodigo
```

Payload:

```json
{
  "nombre": "Sede Matriz",
  "direccion": "Av. Principal 123",
  "estado": "ACTIVO",
  "metadata": {
    "principal": true
  }
}
```

## Errores Comunes

```text
400 El código de la sede es requerido
400 El campo nombre es requerido
400 Estado de sede no válido
400 El campo metadata debe ser un objeto JSON
404 Institución no encontrada
404 Sede no encontrada
409 Ya existe una sede con el mismo código para la institución
```
