# Pruebas De Seguridad Backend

Las pruebas usan `node:test` nativo de Node 20 y corren contra la API levantada.

## Ejecutar

Desde la raíz del proyecto:

```bash
docker compose exec -T backend npm run test:security
```

Se requiere contraseña del superadmin:

```bash
docker compose exec -T \
  -e TEST_ADMIN_PASSWORD='CONTRASENA_SUPERADMIN' \
  backend npm run test:security
```

Variables disponibles:

```text
TEST_API_BASE_URL=http://localhost:4005
TEST_ADMIN_USER=superadmin
TEST_ADMIN_PASSWORD=...
```

## Cobertura Inicial

- Ruta protegida sin token devuelve `401`.
- Errores no exponen stack trace por defecto.
- Cabeceras de seguridad activas.
- Superadmin puede acceder a rutas protegidas.
- Usuario autenticado sin permisos recibe `403`.
- Sesiones activas se listan sin exponer `token_hash`.
- Cierre administrativo de sesiones invalida tokens activos.
