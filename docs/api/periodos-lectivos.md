# API Periodos Lectivos

Base URL:

```text
/api/instituciones/:institucionCodigo/periodos-lectivos
```

## Reglas

- Los periodos lectivos siempre se gestionan dentro del contexto de una institución.
- `codigo` se normaliza a mayúsculas.
- El código del periodo es único dentro de cada institución.
- `estado` acepta `PLANIFICADO`, `ACTIVO`, `CERRADO` o `ANULADO`.
- `fecha_inicio` y `fecha_fin` usan formato `YYYY-MM-DD`.
- `fecha_fin` debe ser mayor o igual a `fecha_inicio`.
- Solo puede existir un periodo con `es_actual = true` por institución.
- Cuando se marca un periodo como actual, los demás periodos de la institución quedan con `es_actual = false`.
- No existe eliminación física por API.
- Las escrituras registran auditoría en `erp.auditoria`.

## Listar Periodos

```http
GET /api/instituciones/:institucionCodigo/periodos-lectivos
GET /api/instituciones/:institucionCodigo/periodos-lectivos?estado=ACTIVO
GET /api/instituciones/:institucionCodigo/periodos-lectivos?es_actual=true
```

La respuesta incluye la institución en `meta.institucion`.

## Obtener Periodo

```http
GET /api/instituciones/:institucionCodigo/periodos-lectivos/:periodoCodigo
```

## Crear Periodo

```http
POST /api/instituciones/:institucionCodigo/periodos-lectivos
```

Payload:

```json
{
  "codigo": "2026",
  "nombre": "Periodo Lectivo 2026",
  "fecha_inicio": "2026-04-01",
  "fecha_fin": "2027-01-31",
  "estado": "PLANIFICADO",
  "es_actual": false,
  "metadata": {
    "regimen": "COSTA"
  }
}
```

## Actualizar Periodo

```http
PATCH /api/instituciones/:institucionCodigo/periodos-lectivos/:periodoCodigo
```

Payload:

```json
{
  "nombre": "Periodo Lectivo 2026",
  "estado": "ACTIVO",
  "es_actual": true,
  "metadata": {
    "regimen": "COSTA"
  }
}
```

## Errores Comunes

```text
400 El código del periodo lectivo es requerido
400 El campo nombre es requerido
400 Estado de periodo lectivo no válido
400 El campo es_actual debe ser booleano
400 El campo fecha_inicio debe tener formato YYYY-MM-DD
400 El campo fecha_fin debe tener formato YYYY-MM-DD
400 La fecha de fin debe ser mayor o igual a la fecha de inicio
400 El campo metadata debe ser un objeto JSON
404 Institución no encontrada
404 Periodo lectivo no encontrado
409 Ya existe un periodo lectivo con el mismo código para la institución
```
