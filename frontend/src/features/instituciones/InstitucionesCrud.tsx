import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit3, PlusCircle, RefreshCw, Save } from 'lucide-react';
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

type Institucion = {
  id: string;
  codigo: string;
  nombre: string;
  razon_social: string | null;
  tipo_identificacion: string | null;
  identificacion: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  sitio_web: string | null;
  logo_url: string | null;
  color_primario: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || /^https?:\/\/.+/i.test(value), 'Ingrese una URL válida')
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Ingrese un correo válido')
  .optional();

const institucionSchema = z.object({
  codigo: z.string().trim().min(2, 'Ingrese el código').max(40, 'Máximo 40 caracteres'),
  nombre: z.string().trim().min(3, 'Ingrese el nombre').max(180, 'Máximo 180 caracteres'),
  razon_social: z.string().trim().optional(),
  tipo_identificacion: z.enum(['', 'CEDULA', 'RUC', 'PASAPORTE', 'EXTRANJERO', 'OTRO']),
  identificacion: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  correo: optionalEmail,
  sitio_web: optionalUrl,
  logo_url: optionalUrl,
  color_primario: z.string().trim().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'ELIMINADO'])
});

type InstitucionValues = z.infer<typeof institucionSchema>;

const defaultValues: InstitucionValues = {
  codigo: '',
  nombre: '',
  razon_social: '',
  tipo_identificacion: '',
  identificacion: '',
  direccion: '',
  telefono: '',
  correo: '',
  sitio_web: '',
  logo_url: '',
  color_primario: '#004080',
  estado: 'ACTIVO'
};

function toFormValues(institucion: Institucion): InstitucionValues {
  return {
    codigo: institucion.codigo,
    nombre: institucion.nombre,
    razon_social: institucion.razon_social || '',
    tipo_identificacion: (institucion.tipo_identificacion || '') as InstitucionValues['tipo_identificacion'],
    identificacion: institucion.identificacion || '',
    direccion: institucion.direccion || '',
    telefono: institucion.telefono || '',
    correo: institucion.correo || '',
    sitio_web: institucion.sitio_web || '',
    logo_url: institucion.logo_url || '',
    color_primario: institucion.color_primario || '#004080',
    estado: institucion.estado
  };
}

function cleanPayload(values: InstitucionValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])
  );
}

export function InstitucionesCrud() {
  const queryClient = useQueryClient();
  const [estadoFilter, setEstadoFilter] = useState('');
  const [editing, setEditing] = useState<Institucion | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<InstitucionValues>({
    resolver: zodResolver(institucionSchema),
    defaultValues
  });

  const institucionesQuery = useQuery({
    queryKey: ['instituciones', estadoFilter],
    queryFn: () =>
      apiRequest<ListResponse<Institucion>>(
        `/api/instituciones${estadoFilter ? `?estado=${estadoFilter}` : ''}`
      )
  });

  const instituciones = institucionesQuery.data?.data ?? [];
  const activas = useMemo(
    () => instituciones.filter((institucion) => institucion.estado === 'ACTIVO').length,
    [instituciones]
  );

  const saveMutation = useMutation({
    mutationFn: (values: InstitucionValues) => {
      const payload = cleanPayload(values);

      if (editing) {
        const { codigo: _codigo, ...patchPayload } = payload;
        return apiRequest(`/api/instituciones/${editing.codigo}`, {
          method: 'PATCH',
          body: patchPayload
        });
      }

      return apiRequest('/api/instituciones', {
        method: 'POST',
        body: payload
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['instituciones'] });
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

  function startEdit(institucion: Institucion) {
    setEditing(institucion);
    form.reset(toFormValues(institucion));
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

  return (
    <section className="space-y-4">
      <div className="space-y-4">
          <div className="elevated-panel rounded-lg border bg-primary p-5 text-primary-foreground">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="border-white/25 bg-white/12 text-white">CRUD</Badge>
                <h2 className="mt-4 text-2xl font-semibold">Instituciones</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
                  Administración de entidades institucionales raíz para sedes, periodos y gobierno
                  operativo.
                </p>
              </div>
              <Button className="bg-white text-primary hover:bg-white/90" onClick={startCreate}>
                <PlusCircle className="h-4 w-4" />
                Nueva
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Instituciones" value={instituciones.length} />
            <SummaryCard label="Activas" tone="green" value={activas} />
            <SummaryCard label="Filtradas" tone="sky" value={instituciones.length} />
          </div>

          <div className="dashboard-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">Listado</h3>
                <p className="text-sm text-muted-foreground">Consulta, edición y control de estado</p>
              </div>
              <div className="flex items-center gap-2">
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
                <Button
                  onClick={() => institucionesQuery.refetch()}
                  size="icon"
                  title="Actualizar"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table min-w-[820px] table-fixed text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Institución</th>
                    <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase">Identificación</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                    <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {instituciones.map((institucion, index) => (
                    <tr
                      className={cn(
                        'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                        index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
                      )}
                      key={institucion.id}
                    >
                      <td className="erp-table-edge truncate px-4 py-3 font-semibold text-primary">
                        {institucion.codigo}
                      </td>
                      <td className="truncate px-4 py-3">
                        <span className="font-medium">{institucion.nombre}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {institucion.correo || institucion.direccion || 'Sin datos de contacto'}
                        </span>
                      </td>
                      <td className="truncate px-4 py-3">{institucion.identificacion || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={institucion.estado === 'ACTIVO' ? 'green' : 'warning'}>
                          {institucion.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button onClick={() => startEdit(institucion)} size="sm" variant="outline">
                          <Edit3 className="h-4 w-4" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {institucionesQuery.isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        Cargando instituciones...
                      </td>
                    </tr>
                  ) : null}
                  {!institucionesQuery.isLoading && !instituciones.length ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                        No hay instituciones para mostrar.
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
              <DialogTitle>{editing ? 'Editar institución' : 'Nueva institución'}</DialogTitle>
              <DialogDescription>
                {editing ? editing.codigo : 'Complete los datos principales de la institución'}
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
                id="institucion-form"
                onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Código" error={form.formState.errors.codigo?.message}>
                    <Input
                      className="uppercase"
                      disabled={Boolean(editing)}
                      {...form.register('codigo')}
                    />
                  </Field>
                  <Field label="Nombre" error={form.formState.errors.nombre?.message}>
                    <Input {...form.register('nombre')} />
                  </Field>
                </div>

                <Field label="Razón social" error={form.formState.errors.razon_social?.message}>
                  <Input {...form.register('razon_social')} />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Tipo ID"
                    error={form.formState.errors.tipo_identificacion?.message}
                  >
                    <select
                      className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                      {...form.register('tipo_identificacion')}
                    >
                      <option value="">Sin tipo</option>
                      <option value="CEDULA">Cédula</option>
                      <option value="RUC">RUC</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="EXTRANJERO">Extranjero</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </Field>
                  <Field label="Identificación" error={form.formState.errors.identificacion?.message}>
                    <Input {...form.register('identificacion')} />
                  </Field>
                </div>

                <Field label="Dirección" error={form.formState.errors.direccion?.message}>
                  <Input {...form.register('direccion')} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Teléfono" error={form.formState.errors.telefono?.message}>
                    <Input {...form.register('telefono')} />
                  </Field>
                  <Field label="Correo" error={form.formState.errors.correo?.message}>
                    <Input autoComplete="email" {...form.register('correo')} />
                  </Field>
                </div>
                <Field label="Sitio web" error={form.formState.errors.sitio_web?.message}>
                  <Input placeholder="https://..." {...form.register('sitio_web')} />
                </Field>
                <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                  <Field label="Logo URL" error={form.formState.errors.logo_url?.message}>
                    <Input placeholder="https://..." {...form.register('logo_url')} />
                  </Field>
                  <Field label="Color" error={form.formState.errors.color_primario?.message}>
                    <Input type="color" {...form.register('color_primario')} />
                  </Field>
                </div>
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
              <Button disabled={saveMutation.isPending} form="institucion-form" type="submit">
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Guardando...' : 'Guardar institución'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
      <Building2 className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}
