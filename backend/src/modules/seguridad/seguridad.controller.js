const seguridadService = require('./seguridad.service');

async function listarRoles(req, res) {
  const roles = await seguridadService.listarRoles(req.query);

  res.json({ data: roles });
}

async function obtenerRol(req, res) {
  const rol = await seguridadService.obtenerRol(req.params.codigo);

  res.json({ data: rol });
}

async function listarPermisos(req, res) {
  const permisos = await seguridadService.listarPermisos(req.query);

  res.json({ data: permisos });
}

async function obtenerPermiso(req, res) {
  const permiso = await seguridadService.obtenerPermiso(req.params.codigo);

  res.json({ data: permiso });
}

async function listarPermisosRol(req, res) {
  const result = await seguridadService.listarPermisosRol(req.params.rolCodigo);

  res.json({
    data: result.permisos,
    meta: {
      rol: result.rol
    }
  });
}

async function asignarPermisoRol(req, res) {
  const result = await seguridadService.asignarPermisoRol(req.params.rolCodigo, req.body, { req });

  res.status(201).json({
    data: result.asignacion,
    meta: {
      rol: result.rol,
      permiso: result.permiso
    }
  });
}

async function listarRolesUsuario(req, res) {
  const result = await seguridadService.listarRolesUsuario(req.params.id);

  res.json({
    data: result.roles,
    meta: {
      usuario: result.usuario
    }
  });
}

async function asignarRolUsuario(req, res) {
  const result = await seguridadService.asignarRolUsuario(req.params.id, req.body, { req });

  res.status(201).json({
    data: result.asignacion,
    meta: {
      usuario: result.usuario,
      rol: result.rol
    }
  });
}

async function actualizarRolUsuario(req, res) {
  const result = await seguridadService.actualizarRolUsuario(req.params.id, req.params.asignacionId, req.body, { req });

  res.json({
    data: result.asignacion,
    meta: {
      usuario: result.usuario
    }
  });
}

module.exports = {
  listarRoles,
  obtenerRol,
  listarPermisos,
  obtenerPermiso,
  listarPermisosRol,
  asignarPermisoRol,
  listarRolesUsuario,
  asignarRolUsuario,
  actualizarRolUsuario
};
