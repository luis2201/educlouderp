# Bootstrap Superadmin

El backend incluye un script idempotente para crear o reactivar el usuario `SUPERADMIN`.

## Ejecutar

```bash
docker compose exec -T backend npm run bootstrap:superadmin
```

Si el usuario ya existe, no rota la contraseña.

## Crear Con Contraseña Definida

```bash
docker compose exec -T \
  -e BOOTSTRAP_SUPERADMIN_PASSWORD='Temporal123' \
  backend npm run bootstrap:superadmin
```

## Rotar Contraseña

```bash
docker compose exec -T \
  -e BOOTSTRAP_SUPERADMIN_RESET_PASSWORD=true \
  -e BOOTSTRAP_SUPERADMIN_PASSWORD='NuevaTemporal123' \
  backend npm run bootstrap:superadmin
```

## Variables

```text
BOOTSTRAP_SUPERADMIN_USERNAME=superadmin
BOOTSTRAP_SUPERADMIN_EMAIL=admin@educlouderp.local
BOOTSTRAP_SUPERADMIN_IDENTIFICACION=ADMIN-ROOT-001
BOOTSTRAP_SUPERADMIN_NOMBRES=Super
BOOTSTRAP_SUPERADMIN_APELLIDOS=Administrador
BOOTSTRAP_SUPERADMIN_PASSWORD=<generada si no se define>
BOOTSTRAP_SUPERADMIN_RESET_PASSWORD=false
```

El usuario queda con:

```text
estado=ACTIVO
rol=SUPERADMIN
debe_cambiar_clave=true
```
