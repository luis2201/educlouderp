import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Link2, RefreshCw, Save, ShieldCheck, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, type ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type ListResponse<T> = {
  data: T[];
};

type Rol = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

type Permiso = {
  id: string;
  codigo: string;
  modulo: string;
  recurso: string;
  accion: string;
  descripcion: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  asignacion_estado?: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

type Usuario = {
  id: string;
  username: string;
  estado: string;
  persona?: {
    nombres: string;
    apellidos: string;
    identificacion: string;
  };
};

type UsuarioRol = {
  id: string;
  rol_id: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  rol: Rol;
};

const permisoRolSchema = z.object({
  permiso_codigo: z.string().min(1, 'Seleccione un permiso'),
  estado: z.enum(['ACTIVO', 'INACTIVO'])
});

const usuarioRolSchema = z.object({
  usuario_id: z.string().min(1, 'Seleccione un usuario'),
  rol_codigo: z.string().min(1, 'Seleccione un rol'),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO'])
});

type PermisoRolValues = z.infer<typeof permisoRolSchema>;
type UsuarioRolValues = z.infer<typeof usuarioRolSchema>;

function usuarioLabel(usuario: Usuario) {
  if (!usuario.persona) return usuario.username;
  return `${usuario.username} - ${usuario.persona.apellidos} ${usuario.persona.nombres}`;
}

function cleanPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])
  );
}

export function RolesPermisosCrud() {
  const queryClient = useQueryClient();
  const [selectedRolCodigo, setSelectedRolCodigo] = useState('');
  const [selectedUsuarioId, setSelectedUsuarioId] = useState('');
  const [moduloFilter, setModuloFilter] = useState('');

  const permisoForm = useForm<PermisoRolValues>({
    resolver: zodResolver(permisoRolSchema),
    defaultValues: {
      permiso_codigo: '',
      estado: 'ACTIVO'
    }
  });
  const usuarioRolForm = useForm<UsuarioRolValues>({
    resolver: zodResolver(usuarioRolSchema),
    defaultValues: {
      usuario_id: '',
      rol_codigo: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: 'ACTIVO'
    }
  });

  const rolesQuery = useQuery({
    queryKey: ['seguridad', 'roles'],
    queryFn: () => apiRequest<ListResponse<Rol>>('/api/roles')
  });
  const permisosQuery = useQuery({
    queryKey: ['seguridad', 'permisos', moduloFilter],
    queryFn: () =>
      apiRequest<ListResponse<Permiso>>(`/api/permisos${moduloFilter ? `?modulo=${moduloFilter}` : ''}`)
  });
  const usuariosQuery = useQuery({
    queryKey: ['usuarios', 'selector', 'ACTIVO'],
    queryFn: () => apiRequest<ListResponse<Usuario>>('/api/usuarios?estado=ACTIVO')
  });
  const permisosRolQuery = useQuery({
    queryKey: ['seguridad', 'roles', selectedRolCodigo, 'permisos'],
    queryFn: () => apiRequest<ListResponse<Permiso>>(`/api/roles/${selectedRolCodigo}/permisos`),
    enabled: Boolean(selectedRolCodigo)
  });
  const rolesUsuarioQuery = useQuery({
    queryKey: ['seguridad', 'usuarios', selectedUsuarioId, 'roles'],
    queryFn: () => apiRequest<ListResponse<UsuarioRol>>(`/api/usuarios/${selectedUsuarioId}/roles`),
    enabled: Boolean(selectedUsuarioId)
  });

  const roles = rolesQuery.data?.data ?? [];
  const permisos = permisosQuery.data?.data ?? [];
  const usuarios = usuariosQuery.data?.data ?? [];
  const permisosRol = permisosRolQuery.data?.data ?? [];
  const rolesUsuario = rolesUsuarioQuery.data?.data ?? [];
  const modulos = useMemo(
    () => Array.from(new Set(permisos.map((permiso) => permiso.modulo))).sort(),
    [permisos]
  );

  useEffect(() => {
    if (!selectedRolCodigo && roles[0]?.codigo) {
      setSelectedRolCodigo(roles[0].codigo);
      usuarioRolForm.setValue('rol_codigo', roles[0].codigo);
    }
  }, [roles, selectedRolCodigo, usuarioRolForm]);

  useEffect(() => {
    if (!selectedUsuarioId && usuarios[0]?.id) {
      setSelectedUsuarioId(String(usuarios[0].id));
      usuarioRolForm.setValue('usuario_id', String(usuarios[0].id));
    }
  }, [selectedUsuarioId, usuarioRolForm, usuarios]);

  const assignPermissionMutation = useMutation({
    mutationFn: (values: PermisoRolValues) =>
      apiRequest(`/api/roles/${selectedRolCodigo}/permisos`, {
        method: 'POST',
        body: values
      }),
    onSuccess() {
      permisoForm.reset({ permiso_codigo: '', estado: 'ACTIVO' });
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'roles', selectedRolCodigo, 'permisos'] });
    }
  });

  const assignUserRoleMutation = useMutation({
    mutationFn: (values: UsuarioRolValues) =>
      apiRequest(`/api/usuarios/${values.usuario_id}/roles`, {
        method: 'POST',
        body: cleanPayload({
          rol_codigo: values.rol_codigo,
          fecha_inicio: values.fecha_inicio,
          fecha_fin: values.fecha_fin,
          estado: values.estado
        })
      }),
    onSuccess(_, values) {
      setSelectedUsuarioId(values.usuario_id);
      usuarioRolForm.reset({
        usuario_id: values.usuario_id,
        rol_codigo: values.rol_codigo,
        fecha_inicio: '',
        fecha_fin: '',
        estado: 'ACTIVO'
      });
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'usuarios', values.usuario_id, 'roles'] });
    }
  });

  const permisoError = assignPermissionMutation.error as ApiError | null;
  const usuarioRolError = assignUserRoleMutation.error as ApiError | null;

  return (
    <section className="space-y-4">
      <div className="elevated-panel rounded-lg border bg-primary p-5 text-primary-foreground">
        <Badge className="border-white/25 bg-white/12 text-white">Seguridad</Badge>
        <h2 className="mt-4 text-2xl font-semibold">Roles y permisos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
          Administración de permisos por rol y asignaciones de rol por usuario.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Roles" value={roles.length} />
        <SummaryCard label="Permisos" tone="sky" value={permisos.length} />
        <SummaryCard label="Asignados al rol" tone="green" value={permisosRol.length} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="dashboard-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <h3 className="text-lg font-semibold text-primary">Roles</h3>
              <p className="text-sm text-muted-foreground">Seleccione un rol para revisar permisos</p>
            </div>
            <Button onClick={() => rolesQuery.refetch()} size="icon" title="Actualizar roles" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="erp-table min-w-[620px] table-fixed text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Rol</th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((rol, index) => (
                  <tr
                    className={cn(
                      'cursor-pointer border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                      selectedRolCodigo === rol.codigo ? 'bg-[hsl(var(--brand-sky)/0.14)]' : index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
                    )}
                    key={rol.id}
                    onClick={() => {
                      setSelectedRolCodigo(rol.codigo);
                      usuarioRolForm.setValue('rol_codigo', rol.codigo, { shouldDirty: true, shouldValidate: true });
                    }}
                  >
                    <td className="erp-table-edge truncate px-4 py-3 font-semibold text-primary">{rol.codigo}</td>
                    <td className="truncate px-4 py-3">
                      <span className="font-medium">{rol.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {rol.es_sistema ? 'Sistema' : 'Operativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={rol.estado === 'ACTIVO' ? 'green' : 'warning'}>{rol.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold text-primary">Permisos del rol</h3>
            <p className="text-sm text-muted-foreground">{selectedRolCodigo || 'Seleccione un rol'}</p>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="overflow-x-auto rounded-md border">
              <table className="erp-table min-w-[600px] table-fixed text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Permiso</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Módulo</th>
                    <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {permisosRol.map((permiso, index) => (
                    <tr className={index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'} key={permiso.codigo}>
                      <td className="erp-table-edge truncate px-4 py-3 font-semibold text-primary">
                        {permiso.codigo}
                      </td>
                      <td className="truncate px-4 py-3">{permiso.modulo}</td>
                      <td className="px-4 py-3">
                        <Badge variant={permiso.asignacion_estado === 'ACTIVO' ? 'green' : 'warning'}>
                          {permiso.asignacion_estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {!permisosRolQuery.isLoading && !permisosRol.length ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                        No hay permisos asignados.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <form
              className="space-y-3"
              onSubmit={permisoForm.handleSubmit((values) => assignPermissionMutation.mutate(values))}
            >
              {permisoError ? (
                <Alert variant="destructive">
                  <AlertTitle>No se pudo asignar</AlertTitle>
                  <AlertDescription>{permisoError.message}</AlertDescription>
                </Alert>
              ) : null}
              <Field label="Módulo">
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  onChange={(event) => setModuloFilter(event.target.value)}
                  value={moduloFilter}
                >
                  <option value="">Todos</option>
                  {modulos.map((modulo) => (
                    <option key={modulo} value={modulo}>
                      {modulo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Permiso" error={permisoForm.formState.errors.permiso_codigo?.message}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  {...permisoForm.register('permiso_codigo')}
                >
                  <option value="">Seleccione</option>
                  {permisos.map((permiso) => (
                    <option key={permiso.codigo} value={permiso.codigo}>
                      {permiso.codigo}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  {...permisoForm.register('estado')}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </Field>
              <Button className="w-full" disabled={!selectedRolCodigo || assignPermissionMutation.isPending} type="submit">
                <Link2 className="h-4 w-4" />
                Asignar permiso
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="border-b p-4">
          <h3 className="text-lg font-semibold text-primary">Roles por usuario</h3>
          <p className="text-sm text-muted-foreground">Asignación global de roles activos</p>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <form
            className="space-y-3"
            onSubmit={usuarioRolForm.handleSubmit((values) => assignUserRoleMutation.mutate(values))}
          >
            {usuarioRolError ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudo asignar</AlertTitle>
                <AlertDescription>{usuarioRolError.message}</AlertDescription>
              </Alert>
            ) : null}
            <Field label="Usuario" error={usuarioRolForm.formState.errors.usuario_id?.message}>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                {...usuarioRolForm.register('usuario_id')}
                onChange={(event) => {
                  usuarioRolForm.setValue('usuario_id', event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                  setSelectedUsuarioId(event.target.value);
                }}
              >
                <option value="">Seleccione</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuarioLabel(usuario)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Rol" error={usuarioRolForm.formState.errors.rol_codigo?.message}>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                {...usuarioRolForm.register('rol_codigo')}
              >
                <option value="">Seleccione</option>
                {roles.map((rol) => (
                  <option key={rol.codigo} value={rol.codigo}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Inicio">
                <Input type="date" {...usuarioRolForm.register('fecha_inicio')} />
              </Field>
              <Field label="Fin">
                <Input type="date" {...usuarioRolForm.register('fecha_fin')} />
              </Field>
            </div>
            <Field label="Estado">
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                {...usuarioRolForm.register('estado')}
              >
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </Field>
            <Button className="w-full" disabled={assignUserRoleMutation.isPending} type="submit">
              <UserCheck className="h-4 w-4" />
              Asignar rol
            </Button>
          </form>

          <div className="overflow-x-auto rounded-md border">
            <table className="erp-table min-w-[680px] table-fixed text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Rol</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Inicio</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Fin</th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rolesUsuario.map((asignacion, index) => (
                  <tr className={index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'} key={asignacion.id}>
                    <td className="erp-table-edge truncate px-4 py-3 font-semibold text-primary">
                      {asignacion.rol?.nombre || asignacion.rol_id}
                    </td>
                    <td className="px-4 py-3">{asignacion.fecha_inicio || '-'}</td>
                    <td className="px-4 py-3">{asignacion.fecha_fin || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={asignacion.estado === 'ACTIVO' ? 'green' : 'warning'}>{asignacion.estado}</Badge>
                    </td>
                  </tr>
                ))}
                {!rolesUsuarioQuery.isLoading && !rolesUsuario.length ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      No hay roles asignados para el usuario seleccionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

type FieldProps = {
  children: React.ReactNode;
  error?: string;
  label: string;
};

function Field({ children, error, label }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  tone?: 'green' | 'sky';
  value: number;
};

function SummaryCard({ label, tone, value }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'dashboard-panel p-4',
        tone === 'green'
          ? 'border-[hsl(var(--brand-green)/0.24)] bg-[hsl(var(--brand-green)/0.1)]'
          : tone === 'sky'
            ? 'border-[hsl(var(--brand-sky)/0.24)] bg-[hsl(var(--brand-sky)/0.1)]'
            : ''
      )}
    >
      <ShieldCheck className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}
