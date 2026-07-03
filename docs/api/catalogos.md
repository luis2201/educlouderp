# API Catálogos

Base URL:

```text
/api/catalogos
```

## Reglas

- Los códigos se normalizan a mayúsculas.
- `estado` acepta `ACTIVO`, `INACTIVO` o `ELIMINADO`.
- `tipo` acepta `SISTEMA`, `INSTITUCIONAL` u `OPERATIVO`.
- Los catálogos `SISTEMA` se crean y modifican solo mediante migraciones controladas.
- Los catálogos `INSTITUCIONAL` requieren `institucion_id`.
- Los catálogos `OPERATIVO` no deben tener `institucion_id`.
- No existe eliminación física por API.
- Los ítems base (`es_base = true`) no pueden cambiar significado ni pasar a `ELIMINADO`.

## Listar Catálogos

```http
GET /api/catalogos
GET /api/catalogos?estado=ACTIVO
```

Respuesta:

```json
{
  "data": [
    {
      "id": "1",
      "institucion_id": null,
      "codigo": "TIPO_IDENTIFICACION",
      "nombre": "Tipos de identificación",
      "descripcion": "Catálogo de tipos de identificación usados por personas e instituciones.",
      "tipo": "SISTEMA",
      "editable": false,
      "estado": "ACTIVO",
      "created_at": "2026-07-02T21:08:22.052Z",
      "updated_at": "2026-07-03T15:41:36.372Z"
    }
  ]
}
```

## Obtener Catálogo

```http
GET /api/catalogos/:codigo
```

## Crear Catálogo

```http
POST /api/catalogos
```

Payload operativo:

```json
{
  "codigo": "ESTADO_DOCUMENTO",
  "nombre": "Estado de documento",
  "descripcion": "Estados usados en gestión documental.",
  "tipo": "OPERATIVO",
  "editable": true
}
```

Payload institucional:

```json
{
  "institucion_id": 1,
  "codigo": "TIPO_BECA",
  "nombre": "Tipo de beca",
  "tipo": "INSTITUCIONAL",
  "editable": true
}
```

## Actualizar Catálogo

```http
PATCH /api/catalogos/:codigo
```

Payload:

```json
{
  "nombre": "Estado de documento",
  "descripcion": "Estados institucionales del documento.",
  "editable": true,
  "estado": "ACTIVO"
}
```

## Listar Ítems

```http
GET /api/catalogos/:codigo/items
GET /api/catalogos/:codigo/items?estado=ACTIVO
```

## Crear Ítem

```http
POST /api/catalogos/:codigo/items
```

Payload:

```json
{
  "codigo": "APROBADO",
  "nombre": "Aprobado",
  "descripcion": "Documento aprobado.",
  "valor": {
    "color": "green"
  },
  "orden": 1
}
```

Los ítems creados desde API quedan con `es_base = false`.

## Actualizar Ítem

```http
PATCH /api/catalogos/:codigo/items/:itemCodigo
```

Payload:

```json
{
  "nombre": "Aprobado",
  "descripcion": "Documento aprobado y vigente.",
  "valor": {
    "color": "green"
  },
  "orden": 1,
  "estado": "ACTIVO"
}
```

## Errores Comunes

```text
400 Estado de catálogo no válido
400 Tipo de catálogo no válido
400 Los catálogos institucionales requieren institucion_id
403 Los catálogos del sistema no se modifican desde la API general
403 Los catálogos del sistema se crean mediante migraciones controladas
403 Los ítems base no permiten cambiar significado ni eliminarse
404 Catálogo no encontrado
404 Ítem de catálogo no encontrado
409 Ya existe un registro con el mismo código
```
