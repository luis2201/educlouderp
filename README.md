# EduCloudERP

ERP educativo en construcción para gestionar instituciones, sedes, personas, catálogos, usuarios, roles, permisos y configuración operativa.

## Stack

- Backend: Node.js + Express
- Base de datos: PostgreSQL
- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS + componentes estilo shadcn/ui
- Datos API: TanStack Query
- Formularios: React Hook Form + Zod
- Contenedores: Docker Compose

## Inicio local

1. Crear el archivo `.env` a partir de `.env.example`.
2. Levantar servicios:

```bash
docker compose up -d
```

3. Abrir:

- Frontend: http://localhost:5173
- Backend health: http://localhost:4005/health

## Base de datos

Los scripts de inicialización se encuentran en `database/` y se ejecutan al crear por primera vez el volumen de PostgreSQL:

- `001_fase_1_nucleo.sql`
- `002_catalogos_tipos_y_base.sql`
- `003_security_hardening.sql`
- `004_permisos_modulos_fase1.sql`

## Usuario inicial

El backend incluye un script para crear o actualizar el usuario superadmin:

```bash
docker compose exec -T backend npm run bootstrap:superadmin
```

Revisar la documentación en `docs/bootstrap-superadmin.md`.

## Verificaciones

```bash
npm run backend:test
npm run frontend:lint
npm run frontend:build
```
