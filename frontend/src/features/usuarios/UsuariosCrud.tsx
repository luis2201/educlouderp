import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit3,
  KeyRound,
  MonitorCheck,
  PlusCircle,
  RefreshCw,
  Save,
  ShieldAlert,
  UserCog,
  XCircle
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, type ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

type ListResponse<T> = {
  data: T[];
};

type Persona = {
  id: string;
  tipo_identificacion: string;
  identificacion: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

type Usuario = {
  id: string;
  persona_id: string;
  username: string;
  email_acceso: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO' | 'PENDIENTE';
  ultimo_acceso: string | null;
  debe_cambiar_clave: boolean;
  intentos_fallidos: number;
  bloqueado_hasta: string | null;
  persona?: Persona;
};

type SesionUsuario = {
  id: string;
  usuario_id: string;
  ip: string | null;
  user_agent: string | null;
  fecha_inicio: string;
  fecha_expira: string;
  fecha_cierre: string | null;
  estado: 'ACTIVA' | 'CERRADA' | 'EXPIRADA' | 'REVOCADA';
};

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Ingrese un correo válido')
  .optional();

const usuarioSchema = z.object({
  persona_id: z.string().min(1, 'Seleccione la persona'),
  username: z
    .string()
    .trim()
    .min(3, 'Mínimo 3 caracteres')
    .max(80, 'Máximo 80 caracteres')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Use letras, números, punto, guion o guion bajo'),
  email_acceso: optionalEmail,
  password: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'PENDIENTE']),
  debe_cambiar_clave: z.boolean()
});

const createUsuarioSchema = usuarioSchema.refine((values) => String(values.password || '').length >= 8, {
  message: 'La contraseña debe tener al menos 8 caracteres',
  path: ['password']
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  debe_cambiar_clave: z.boolean()
});

type UsuarioValues = z.infer<typeof usuarioSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const defaultValues: UsuarioValues = {
  persona_id: '',
  username: '',
  email_acceso: '',
  password: '',
  estado: 'PENDIENTE',
  debe_cambiar_clave: true
};

const defaultResetValues: ResetPasswordValues = {
  password: '',
  debe_cambiar_clave: true
};

function personaLabel(persona: Persona) {
  return `${persona.apellidos} ${persona.nombres} - ${persona.identificacion}`;
}

function usuarioPersonaLabel(usuario: Usuario) {
  if (!usuario.persona) return `Persona ${usuario.persona_id}`;
  return `${usuario.persona.apellidos} ${usuario.persona.nombres}`;
}

function cleanPayload(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])
  );
}

function toFormValues(usuario: Usuario): UsuarioValues {
  return {
    persona_id: String(usuario.persona_id),
    username: usuario.username,
    email_acceso: usuario.email_acceso || '',
    password: '',
    estado: usuario.estado,
    debe_cambiar_clave: usuario.debe_cambiar_clave
  };
}

export function UsuariosCrud() {
  const queryClient = useQueryClient();
  const [estadoFilter, setEstadoFilter] = useState('');
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [sessionsUsuario, setSessionsUsuario] = useState<Usuario | null>(null);
  const [personaSearch, setPersonaSearch] = useState('');
  const [isPersonaOptionsOpen, setIsPersonaOptionsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const form = useForm<UsuarioValues>({
    resolver: zodResolver(editing ? usuarioSchema : createUsuarioSchema),
    defaultValues
  });
  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: defaultResetValues
  });

  const usuariosQuery = useQuery({
    queryKey: ['usuarios', estadoFilter],
    queryFn: () =>
      apiRequest<ListResponse<Usuario>>(`/api/usuarios${estadoFilter ? `?estado=${estadoFilter}` : ''}`)
  });

  const personasQuery = useQuery({
    queryKey: ['personas', 'selector', 'ACTIVO'],
    queryFn: () => apiRequest<ListResponse<Persona>>('/api/personas?estado=ACTIVO')
  });

  const sesionesQuery = useQuery({
    queryKey: ['usuarios', sessionsUsuario?.id, 'sesiones'],
    queryFn: () => apiRequest<ListResponse<SesionUsuario>>(`/api/usuarios/${sessionsUsuario?.id}/sesiones`),
    enabled: Boolean(sessionsUsuario?.id)
  });

  const usuarios = usuariosQuery.data?.data ?? [];
  const personas = personasQuery.data?.data ?? [];
  const sesiones = sesionesQuery.data?.data ?? [];
  const selectedPersonaId = form.watch('persona_id');
  const selectedPersona = personas.find((persona) => String(persona.id) === selectedPersonaId) || null;
  const filteredPersonas = useMemo(() => {
    const term = personaSearch.trim().toLowerCase();

    if (!term) {
      return personas.slice(0, 8);
    }

    return personas
      .filter((persona) =>
        `${persona.apellidos} ${persona.nombres} ${persona.identificacion} ${persona.correo || ''}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 8);
  }, [personaSearch, personas]);
  const usuariosActivos = useMemo(() => usuarios.filter((usuario) => usuario.estado === 'ACTIVO').length, [usuarios]);
  const usuariosPendientes = useMemo(
    () => usuarios.filter((usuario) => usuario.debe_cambiar_clave).length,
    [usuarios]
  );
  const sesionesActivas = useMemo(
    () => sesiones.filter((sesion) => sesion.estado === 'ACTIVA').length,
    [sesiones]
  );

  const saveMutation = useMutation({
    mutationFn: (values: UsuarioValues) => {
      const payload = cleanPayload({
        ...values,
        persona_id: Number(values.persona_id)
      });

      if (editing) {
        const {
          persona_id: _personaId,
          username: _username,
          password: _password,
          ...patchPayload
        } = payload;

        return apiRequest(`/api/usuarios/${editing.id}`, {
          method: 'PATCH',
          body: patchPayload
        });
      }

      return apiRequest('/api/usuarios', {
        method: 'POST',
        body: payload
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      form.reset(defaultValues);
      setEditing(null);
      setIsFormOpen(false);
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (values: ResetPasswordValues) =>
      apiRequest(`/api/usuarios/${selectedUsuario?.id}/clave`, {
        method: 'PATCH',
        body: {
          password: values.password,
          debe_cambiar_clave: values.debe_cambiar_clave
        }
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      resetForm.reset(defaultResetValues);
      setSelectedUsuario(null);
      setIsPasswordOpen(false);
    }
  });

  const closeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      apiRequest(`/api/usuarios/${sessionsUsuario?.id}/sesiones/${sessionId}/cerrar`, {
        method: 'PATCH'
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['usuarios', sessionsUsuario?.id, 'sesiones'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    }
  });

  const closeAllSessionsMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/usuarios/${sessionsUsuario?.id}/sesiones/cerrar-activas`, {
        method: 'PATCH'
      }),
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['usuarios', sessionsUsuario?.id, 'sesiones'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    }
  });

  const formError = saveMutation.error as ApiError | null;
  const passwordError = resetPasswordMutation.error as ApiError | null;
  const sessionError = (closeSessionMutation.error || closeAllSessionsMutation.error) as ApiError | null;

  function startCreate() {
    setEditing(null);
    setPersonaSearch('');
    setIsPersonaOptionsOpen(false);
    form.reset(defaultValues);
    setIsFormOpen(true);
  }

  function startEdit(usuario: Usuario) {
    setEditing(usuario);
    setPersonaSearch(usuario.persona ? personaLabel(usuario.persona) : '');
    setIsPersonaOptionsOpen(false);
    form.reset(toFormValues(usuario));
    setIsFormOpen(true);
  }

  function startResetPassword(usuario: Usuario) {
    setSelectedUsuario(usuario);
    resetForm.reset(defaultResetValues);
    setIsPasswordOpen(true);
  }

  function closeForm(open: boolean) {
    if (saveMutation.isPending) return;

    setIsFormOpen(open);

    if (!open) {
      setEditing(null);
      setPersonaSearch('');
      setIsPersonaOptionsOpen(false);
      form.reset(defaultValues);
      saveMutation.reset();
    }
  }

  function selectPersona(persona: Persona) {
    form.setValue('persona_id', String(persona.id), {
      shouldDirty: true,
      shouldValidate: true
    });
    setPersonaSearch(personaLabel(persona));
    setIsPersonaOptionsOpen(false);
  }

  function closePasswordDialog(open: boolean) {
    if (resetPasswordMutation.isPending) return;

    setIsPasswordOpen(open);

    if (!open) {
      setSelectedUsuario(null);
      resetForm.reset(defaultResetValues);
      resetPasswordMutation.reset();
    }
  }

  function closeSessionsDialog(open: boolean) {
    if (closeSessionMutation.isPending || closeAllSessionsMutation.isPending) return;

    if (!open) {
      setSessionsUsuario(null);
      closeSessionMutation.reset();
      closeAllSessionsMutation.reset();
    }
  }

  return (
    <section className="space-y-4">
      <div className="elevated-panel rounded-lg border bg-primary p-5 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="border-white/25 bg-white/12 text-white">CRUD</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Usuarios</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
              Gestión de accesos, estados, claves temporales y sesiones activas.
            </p>
          </div>
          <Button className="bg-white text-primary hover:bg-white/90" onClick={startCreate}>
            <PlusCircle className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Usuarios" value={usuarios.length} />
        <SummaryCard label="Activos" tone="green" value={usuariosActivos} />
        <SummaryCard label="Clave pendiente" tone="warning" value={usuariosPendientes} />
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Listado</h3>
            <p className="text-sm text-muted-foreground">Usuarios, credenciales y control de sesión</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              onChange={(event) => setEstadoFilter(event.target.value)}
              value={estadoFilter}
            >
              <option value="">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="BLOQUEADO">Bloqueados</option>
              <option value="INACTIVO">Inactivos</option>
            </select>
            <Button onClick={() => usuariosQuery.refetch()} size="icon" title="Actualizar" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[980px] table-fixed text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Persona</th>
                <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase">Clave</th>
                <th className="w-72 px-4 py-3 text-right text-xs font-semibold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario, index) => (
                <tr
                  className={cn(
                    'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                    index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
                  )}
                  key={usuario.id}
                >
                  <td className="erp-table-edge truncate px-4 py-3">
                    <span className="block font-semibold text-primary">{usuario.username}</span>
                    <span className="block truncate text-xs text-muted-foreground">{usuario.email_acceso || '-'}</span>
                  </td>
                  <td className="truncate px-4 py-3">
                    <span className="font-medium">{usuarioPersonaLabel(usuario)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {usuario.persona?.identificacion || `ID ${usuario.persona_id}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={usuario.estado === 'ACTIVO' ? 'green' : 'warning'}>{usuario.estado}</Badge>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Intentos: {usuario.intentos_fallidos || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={usuario.debe_cambiar_clave ? 'warning' : 'green'}>
                      {usuario.debe_cambiar_clave ? 'Pendiente' : 'Vigente'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => startEdit(usuario)} size="sm" variant="outline">
                        <Edit3 className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button onClick={() => startResetPassword(usuario)} size="sm" variant="outline">
                        <KeyRound className="h-4 w-4" />
                        Clave
                      </Button>
                      <Button onClick={() => setSessionsUsuario(usuario)} size="sm" variant="outline">
                        <MonitorCheck className="h-4 w-4" />
                        Sesiones
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuariosQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    Cargando usuarios...
                  </td>
                </tr>
              ) : null}
              {!usuariosQuery.isLoading && !usuarios.length ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog onOpenChange={closeForm} open={isFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.username : 'Seleccione una persona activa y defina credenciales temporales'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto px-6 py-4">
            {formError ? (
              <Alert className="mb-4" variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError.message}</AlertDescription>
              </Alert>
            ) : null}

            <form
              className="space-y-4"
              id="usuario-form"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <Field label="Persona activa" error={form.formState.errors.persona_id?.message}>
                <input type="hidden" {...form.register('persona_id')} />
                <div className="relative">
                  <Input
                    disabled={Boolean(editing)}
                    onBlur={() => {
                      window.setTimeout(() => setIsPersonaOptionsOpen(false), 120);
                    }}
                    onChange={(event) => {
                      setPersonaSearch(event.target.value);
                      form.setValue('persona_id', '', { shouldDirty: true, shouldValidate: true });
                      setIsPersonaOptionsOpen(true);
                    }}
                    onFocus={() => setIsPersonaOptionsOpen(!editing)}
                    placeholder="Escriba nombre, apellido o identificación"
                    value={editing && selectedPersona ? personaLabel(selectedPersona) : personaSearch}
                  />
                  {isPersonaOptionsOpen && !editing ? (
                    <div className="absolute left-0 right-0 top-11 z-40 max-h-64 overflow-y-auto rounded-md border bg-card shadow-lg">
                      {filteredPersonas.map((persona) => (
                        <button
                          className="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          key={persona.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPersona(persona)}
                          type="button"
                        >
                          <span className="font-medium text-primary">{personaLabel(persona)}</span>
                          <span className="text-xs text-muted-foreground">{persona.correo || 'Sin correo'}</span>
                        </button>
                      ))}
                      {!filteredPersonas.length ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground">
                          No hay personas activas coincidentes.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Username" error={form.formState.errors.username?.message}>
                  <Input disabled={Boolean(editing)} {...form.register('username')} />
                </Field>
                <Field label="Correo de acceso" error={form.formState.errors.email_acceso?.message}>
                  <Input autoComplete="email" {...form.register('email_acceso')} />
                </Field>
              </div>

              {!editing ? (
                <Field label="Contraseña temporal" error={form.formState.errors.password?.message}>
                  <Input autoComplete="new-password" type="password" {...form.register('password')} />
                </Field>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Estado" error={form.formState.errors.estado?.message}>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    {...form.register('estado')}
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="BLOQUEADO">Bloqueado</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </Field>
                <label className="mt-7 flex h-10 items-center gap-3 rounded-md border bg-card px-3 text-sm">
                  <input className="h-4 w-4" type="checkbox" {...form.register('debe_cambiar_clave')} />
                  Exigir cambio de clave
                </label>
              </div>
            </form>
          </div>

          <DialogFooter>
            <Button disabled={saveMutation.isPending} onClick={() => closeForm(false)} variant="outline">
              Cancelar
            </Button>
            <Button disabled={saveMutation.isPending} form="usuario-form" type="submit">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={closePasswordDialog} open={isPasswordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reset administrativo de contraseña</DialogTitle>
            <DialogDescription>{selectedUsuario?.username || 'Usuario seleccionado'}</DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4">
            {passwordError ? (
              <Alert className="mb-4" variant="destructive">
                <AlertTitle>No se pudo actualizar</AlertTitle>
                <AlertDescription>{passwordError.message}</AlertDescription>
              </Alert>
            ) : null}
            <form
              className="space-y-4"
              id="usuario-password-form"
              onSubmit={resetForm.handleSubmit((values) => resetPasswordMutation.mutate(values))}
            >
              <Field label="Nueva contraseña temporal" error={resetForm.formState.errors.password?.message}>
                <Input autoComplete="new-password" type="password" {...resetForm.register('password')} />
              </Field>
              <label className="flex h-10 items-center gap-3 rounded-md border bg-card px-3 text-sm">
                <input className="h-4 w-4" type="checkbox" {...resetForm.register('debe_cambiar_clave')} />
                Exigir cambio al iniciar sesión
              </label>
            </form>
          </div>

          <DialogFooter>
            <Button disabled={resetPasswordMutation.isPending} onClick={() => closePasswordDialog(false)} variant="outline">
              Cancelar
            </Button>
            <Button disabled={resetPasswordMutation.isPending} form="usuario-password-form" type="submit">
              <KeyRound className="h-4 w-4" />
              {resetPasswordMutation.isPending ? 'Actualizando...' : 'Actualizar clave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={closeSessionsDialog} open={Boolean(sessionsUsuario)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sesiones de usuario</DialogTitle>
            <DialogDescription>
              {sessionsUsuario ? `${sessionsUsuario.username} - ${sesionesActivas} activa(s)` : 'Sesiones'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto px-6 py-4">
            {sessionError ? (
              <Alert className="mb-4" variant="destructive">
                <AlertTitle>No se pudo cerrar la sesión</AlertTitle>
                <AlertDescription>{sessionError.message}</AlertDescription>
              </Alert>
            ) : null}
            <div className="overflow-x-auto rounded-md border">
              <table className="erp-table min-w-[760px] table-fixed text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Dispositivo</th>
                    <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase">Inicio</th>
                    <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase">Expira</th>
                    <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((sesion, index) => (
                    <tr
                      className={cn(
                        'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                        index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
                      )}
                      key={sesion.id}
                    >
                      <td className="erp-table-edge px-4 py-3">
                        <Badge variant={sesion.estado === 'ACTIVA' ? 'green' : 'muted'}>{sesion.estado}</Badge>
                      </td>
                      <td className="truncate px-4 py-3">
                        <span className="block truncate">{sesion.user_agent || 'Sin agente'}</span>
                        <span className="block text-xs text-muted-foreground">{sesion.ip || '-'}</span>
                      </td>
                      <td className="truncate px-4 py-3">{new Date(sesion.fecha_inicio).toLocaleString()}</td>
                      <td className="truncate px-4 py-3">{new Date(sesion.fecha_expira).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          disabled={sesion.estado !== 'ACTIVA' || closeSessionMutation.isPending}
                          onClick={() => closeSessionMutation.mutate(sesion.id)}
                          size="sm"
                          variant="outline"
                        >
                          <XCircle className="h-4 w-4" />
                          Cerrar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {sesionesQuery.isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        Cargando sesiones...
                      </td>
                    </tr>
                  ) : null}
                  {!sesionesQuery.isLoading && !sesiones.length ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        No hay sesiones para mostrar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => closeSessionsDialog(false)} variant="outline">
              Cerrar
            </Button>
            <Button
              disabled={!sesionesActivas || closeAllSessionsMutation.isPending}
              onClick={() => closeAllSessionsMutation.mutate()}
              variant="default"
            >
              <ShieldAlert className="h-4 w-4" />
              Cerrar activas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type FieldProps = {
  children: ReactNode;
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
  tone?: 'green' | 'warning';
  value: number;
};

function SummaryCard({ label, tone, value }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'dashboard-panel p-4',
        tone === 'green'
          ? 'border-[hsl(var(--brand-green)/0.24)] bg-[hsl(var(--brand-green)/0.1)]'
          : tone === 'warning'
            ? 'border-amber-300/70 bg-amber-50'
            : ''
      )}
    >
      <UserCog className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}
