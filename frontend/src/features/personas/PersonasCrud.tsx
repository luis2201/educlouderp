import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, PlusCircle, RefreshCw, Save, Search, UserRound } from 'lucide-react';
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
  tipo_identificacion: 'CEDULA' | 'RUC' | 'PASAPORTE' | 'EXTRANJERO' | 'OTRO';
  identificacion: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  genero: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Ingrese un correo válido')
  .optional();

const optionalDate = z
  .string()
  .trim()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use formato YYYY-MM-DD')
  .optional();

const personaSchema = z.object({
  tipo_identificacion: z.enum(['CEDULA', 'RUC', 'PASAPORTE', 'EXTRANJERO', 'OTRO']),
  identificacion: z.string().trim().min(3, 'Ingrese la identificación').max(30, 'Máximo 30 caracteres'),
  nombres: z.string().trim().min(2, 'Ingrese los nombres').max(120, 'Máximo 120 caracteres'),
  apellidos: z.string().trim().min(2, 'Ingrese los apellidos').max(120, 'Máximo 120 caracteres'),
  fecha_nacimiento: optionalDate,
  genero: z.enum(['', 'MASCULINO', 'FEMENINO']),
  correo: optionalEmail,
  telefono: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'ELIMINADO'])
});

type PersonaValues = z.infer<typeof personaSchema>;

const defaultValues: PersonaValues = {
  tipo_identificacion: 'CEDULA',
  identificacion: '',
  nombres: '',
  apellidos: '',
  fecha_nacimiento: '',
  genero: '',
  correo: '',
  telefono: '',
  direccion: '',
  estado: 'ACTIVO'
};

function toFormValues(persona: Persona): PersonaValues {
  return {
    tipo_identificacion: persona.tipo_identificacion,
    identificacion: persona.identificacion,
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    fecha_nacimiento: persona.fecha_nacimiento || '',
    genero: (persona.genero || '') as PersonaValues['genero'],
    correo: persona.correo || '',
    telefono: persona.telefono || '',
    direccion: persona.direccion || '',
    estado: persona.estado
  };
}

function cleanPayload(values: PersonaValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])
  );
}

function buildQuery({ estado, q }: { estado: string; q: string }) {
  const params = new URLSearchParams();

  if (estado) params.set('estado', estado);
  if (q.trim()) params.set('q', q.trim());

  const queryString = params.toString();
  return `/api/personas${queryString ? `?${queryString}` : ''}`;
}

export function PersonasCrud() {
  const queryClient = useQueryClient();
  const [estadoFilter, setEstadoFilter] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<Persona | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<PersonaValues>({
    resolver: zodResolver(personaSchema),
    defaultValues
  });

  const personasQuery = useQuery({
    queryKey: ['personas', estadoFilter, searchTerm],
    queryFn: () => apiRequest<ListResponse<Persona>>(buildQuery({ estado: estadoFilter, q: searchTerm }))
  });

  const personas = personasQuery.data?.data ?? [];
  const activas = useMemo(() => personas.filter((persona) => persona.estado === 'ACTIVO').length, [personas]);
  const conCorreo = useMemo(() => personas.filter((persona) => Boolean(persona.correo)).length, [personas]);

  const saveMutation = useMutation({
    mutationFn: (values: PersonaValues) => {
      const payload = cleanPayload(values);

      if (editing) {
        const {
          tipo_identificacion: _tipoIdentificacion,
          identificacion: _identificacion,
          ...patchPayload
        } = payload;

        return apiRequest(`/api/personas/${editing.id}`, {
          method: 'PATCH',
          body: patchPayload
        });
      }

      return apiRequest('/api/personas', {
        method: 'POST',
        body: payload
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      form.reset(defaultValues);
      setEditing(null);
      setIsFormOpen(false);
    }
  });

  const error = saveMutation.error as ApiError | null;

  function startCreate() {
    setEditing(null);
    form.reset(defaultValues);
    setIsFormOpen(true);
  }

  function startEdit(persona: Persona) {
    setEditing(persona);
    form.reset(toFormValues(persona));
    setIsFormOpen(true);
  }

  function closeForm(open: boolean) {
    if (saveMutation.isPending) return;

    setIsFormOpen(open);

    if (!open) {
      setEditing(null);
      form.reset(defaultValues);
      saveMutation.reset();
    }
  }

  function applySearch() {
    setSearchTerm(searchDraft);
  }

  function clearSearch() {
    setSearchDraft('');
    setSearchTerm('');
  }

  return (
    <section className="space-y-4">
      <div className="elevated-panel rounded-lg border bg-primary p-5 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="border-white/25 bg-white/12 text-white">CRUD</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Personas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
              Registro central de identidad para usuarios, perfiles administrativos y operación académica.
            </p>
          </div>
          <Button className="bg-white text-primary hover:bg-white/90" onClick={startCreate}>
            <PlusCircle className="h-4 w-4" />
            Nueva
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Personas" value={personas.length} />
        <SummaryCard label="Activas" tone="green" value={activas} />
        <SummaryCard label="Con correo" tone="sky" value={conCorreo} />
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Listado</h3>
            <p className="text-sm text-muted-foreground">Búsqueda, edición y control de estado</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[260px] items-center gap-2">
              <Input
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applySearch();
                }}
                placeholder="Nombre, identificación o correo"
                value={searchDraft}
              />
              <Button onClick={applySearch} size="icon" title="Buscar" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchTerm ? (
              <Button onClick={clearSearch} size="sm" variant="ghost">
                Limpiar
              </Button>
            ) : null}
            <select
              className="h-10 rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              onChange={(event) => setEstadoFilter(event.target.value)}
              value={estadoFilter}
            >
              <option value="">Todos</option>
              <option value="ACTIVO">Activos</option>
              <option value="INACTIVO">Inactivos</option>
              <option value="ELIMINADO">Eliminados</option>
            </select>
            <Button onClick={() => personasQuery.refetch()} size="icon" title="Actualizar" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[960px] table-fixed text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase">Identificación</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Persona</th>
                <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase">Contacto</th>
                <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((persona, index) => (
                <tr
                  className={cn(
                    'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                    index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
                  )}
                  key={persona.id}
                >
                  <td className="erp-table-edge truncate px-4 py-3">
                    <span className="block font-semibold text-primary">{persona.identificacion}</span>
                    <span className="text-xs text-muted-foreground">{persona.tipo_identificacion}</span>
                  </td>
                  <td className="truncate px-4 py-3">
                    <span className="font-medium">
                      {persona.apellidos} {persona.nombres}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {persona.fecha_nacimiento || 'Sin fecha de nacimiento'}
                    </span>
                  </td>
                  <td className="truncate px-4 py-3">
                    <span className="block truncate">{persona.correo || '-'}</span>
                    <span className="block truncate text-xs text-muted-foreground">{persona.telefono || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={persona.estado === 'ACTIVO' ? 'green' : 'warning'}>{persona.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button onClick={() => startEdit(persona)} size="sm" variant="outline">
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {personasQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    Cargando personas...
                  </td>
                </tr>
              ) : null}
              {!personasQuery.isLoading && !personas.length ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    No hay personas para mostrar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog onOpenChange={closeForm} open={isFormOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar persona' : 'Nueva persona'}</DialogTitle>
            <DialogDescription>
              {editing
                ? `${editing.tipo_identificacion} ${editing.identificacion}`
                : 'Complete los datos de identidad y contacto'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[68vh] overflow-y-auto px-6 py-4">
            {error ? (
              <Alert className="mb-4" variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}

            <form
              className="space-y-4"
              id="persona-form"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo ID" error={form.formState.errors.tipo_identificacion?.message}>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
                    disabled={Boolean(editing)}
                    {...form.register('tipo_identificacion')}
                  >
                    <option value="CEDULA">Cédula</option>
                    <option value="RUC">RUC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="EXTRANJERO">Extranjero</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </Field>
                <Field label="Identificación" error={form.formState.errors.identificacion?.message}>
                  <Input disabled={Boolean(editing)} {...form.register('identificacion')} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombres" error={form.formState.errors.nombres?.message}>
                  <Input {...form.register('nombres')} />
                </Field>
                <Field label="Apellidos" error={form.formState.errors.apellidos?.message}>
                  <Input {...form.register('apellidos')} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Fecha de nacimiento" error={form.formState.errors.fecha_nacimiento?.message}>
                  <Input type="date" {...form.register('fecha_nacimiento')} />
                </Field>
                <Field label="Género" error={form.formState.errors.genero?.message}>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    {...form.register('genero')}
                  >
                    <option value="">Sin especificar</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMENINO">Femenino</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Correo" error={form.formState.errors.correo?.message}>
                  <Input autoComplete="email" {...form.register('correo')} />
                </Field>
                <Field label="Teléfono" error={form.formState.errors.telefono?.message}>
                  <Input {...form.register('telefono')} />
                </Field>
              </div>

              <Field label="Dirección" error={form.formState.errors.direccion?.message}>
                <Input {...form.register('direccion')} />
              </Field>

              <Field label="Estado" error={form.formState.errors.estado?.message}>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  {...form.register('estado')}
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                  <option value="ELIMINADO">Eliminado</option>
                </select>
              </Field>
            </form>
          </div>

          <DialogFooter>
            <Button disabled={saveMutation.isPending} onClick={() => closeForm(false)} variant="outline">
              Cancelar
            </Button>
            <Button disabled={saveMutation.isPending} form="persona-form" type="submit">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar persona'}
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
      <UserRound className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}
