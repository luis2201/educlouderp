import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit3, MapPin, PlusCircle, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

type Sede = {
  id: string;
  institucion_id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
};

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Ingrese un correo válido')
  .optional();

const sedeSchema = z.object({
  codigo: z.string().trim().min(2, 'Ingrese el código').max(40, 'Máximo 40 caracteres'),
  nombre: z.string().trim().min(3, 'Ingrese el nombre').max(180, 'Máximo 180 caracteres'),
  direccion: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  correo: optionalEmail,
  estado: z.enum(['ACTIVO', 'INACTIVO', 'ELIMINADO'])
});

type SedeValues = z.infer<typeof sedeSchema>;

const defaultValues: SedeValues = {
  codigo: '',
  nombre: '',
  direccion: '',
  telefono: '',
  correo: '',
  estado: 'ACTIVO'
};

function toFormValues(sede: Sede): SedeValues {
  return {
    codigo: sede.codigo,
    nombre: sede.nombre,
    direccion: sede.direccion || '',
    telefono: sede.telefono || '',
    correo: sede.correo || '',
    estado: sede.estado
  };
}

function cleanPayload(values: SedeValues) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? undefined : value])
  );
}

export function SedesCrud() {
  const queryClient = useQueryClient();
  const [institucionCodigo, setInstitucionCodigo] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [editing, setEditing] = useState<Sede | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<SedeValues>({
    resolver: zodResolver(sedeSchema),
    defaultValues
  });

  const institucionesQuery = useQuery({
    queryKey: ['instituciones', 'selector', 'ACTIVO'],
    queryFn: () => apiRequest<ListResponse<Institucion>>('/api/instituciones?estado=ACTIVO')
  });

  const instituciones = institucionesQuery.data?.data ?? [];
  const activeInstitutionCode = institucionCodigo || instituciones[0]?.codigo || '';
  const selectedInstitucion = instituciones.find((item) => item.codigo === activeInstitutionCode) || null;

  useEffect(() => {
    if (!institucionCodigo && instituciones[0]?.codigo) {
      setInstitucionCodigo(instituciones[0].codigo);
    }
  }, [institucionCodigo, instituciones]);

  const sedesQuery = useQuery({
    queryKey: ['sedes', activeInstitutionCode, estadoFilter],
    queryFn: () =>
      apiRequest<ListResponse<Sede>>(
        `/api/instituciones/${activeInstitutionCode}/sedes${estadoFilter ? `?estado=${estadoFilter}` : ''}`
      ),
    enabled: Boolean(activeInstitutionCode)
  });

  const sedes = sedesQuery.data?.data ?? [];
  const activas = useMemo(() => sedes.filter((sede) => sede.estado === 'ACTIVO').length, [sedes]);

  const saveMutation = useMutation({
    mutationFn: (values: SedeValues) => {
      const payload = cleanPayload(values);

      if (editing) {
        const { codigo: _codigo, ...patchPayload } = payload;
        return apiRequest(`/api/instituciones/${activeInstitutionCode}/sedes/${editing.codigo}`, {
          method: 'PATCH',
          body: patchPayload
        });
      }

      return apiRequest(`/api/instituciones/${activeInstitutionCode}/sedes`, {
        method: 'POST',
        body: payload
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['sedes'] });
      form.reset(defaultValues);
      setEditing(null);
      setIsFormOpen(false);
    }
  });

  const error = saveMutation.error as ApiError | null;

  function updateInstitucion(codigo: string) {
    setInstitucionCodigo(codigo);
    setEditing(null);
    form.reset(defaultValues);
  }

  function startCreate() {
    setEditing(null);
    form.reset(defaultValues);
    setIsFormOpen(true);
  }

  function startEdit(sede: Sede) {
    setEditing(sede);
    form.reset(toFormValues(sede));
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
      <div className="elevated-panel rounded-lg border bg-primary p-5 text-primary-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge className="border-white/25 bg-white/12 text-white">CRUD</Badge>
            <h2 className="mt-4 text-2xl font-semibold">Sedes</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/78">
              Administración de sedes dentro del contexto institucional seleccionado.
            </p>
          </div>
          <Button
            className="bg-white text-primary hover:bg-white/90"
            disabled={!activeInstitutionCode}
            onClick={startCreate}
          >
            <PlusCircle className="h-4 w-4" />
            Nueva
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="dashboard-panel p-4">
          <Label>Institución</Label>
          <select
            className="mt-2 h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            onChange={(event) => updateInstitucion(event.target.value)}
            value={activeInstitutionCode}
          >
            {instituciones.map((institucion) => (
              <option key={institucion.codigo} value={institucion.codigo}>
                {institucion.nombre}
              </option>
            ))}
            {!instituciones.length ? <option value="">Sin instituciones</option> : null}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedInstitucion?.codigo || activeInstitutionCode || 'Seleccione una institución'}
          </p>
        </div>
        <SummaryCard label="Sedes" value={sedes.length} />
        <SummaryCard label="Activas" tone="green" value={activas} />
      </div>

      {!activeInstitutionCode ? (
        <Alert variant="warning">
          <AlertTitle>Institución requerida</AlertTitle>
          <AlertDescription>
            Cree o active una institución antes de registrar sedes.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="dashboard-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Listado</h3>
            <p className="text-sm text-muted-foreground">Sedes de la institución seleccionada</p>
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
            <Button onClick={() => sedesQuery.refetch()} size="icon" title="Actualizar" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="erp-table min-w-[780px] table-fixed text-sm">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Sede</th>
                <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase">Contacto</th>
                <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sedes.map((sede, index) => (
                <tr
                  className={cn(
                    'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                    index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
                  )}
                  key={sede.id}
                >
                  <td className="erp-table-edge truncate px-4 py-3 font-semibold text-primary">
                    {sede.codigo}
                  </td>
                  <td className="truncate px-4 py-3">
                    <span className="font-medium">{sede.nombre}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {sede.direccion || 'Sin dirección registrada'}
                    </span>
                  </td>
                  <td className="truncate px-4 py-3">{sede.correo || sede.telefono || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={sede.estado === 'ACTIVO' ? 'green' : 'warning'}>{sede.estado}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button onClick={() => startEdit(sede)} size="sm" variant="outline">
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {sedesQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    Cargando sedes...
                  </td>
                </tr>
              ) : null}
              {!sedesQuery.isLoading && !sedes.length ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    No hay sedes para mostrar.
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
            <DialogTitle>{editing ? 'Editar sede' : 'Nueva sede'}</DialogTitle>
            <DialogDescription>
              {editing ? editing.codigo : `Institución: ${activeInstitutionCode}`}
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
              id="sede-form"
              onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Código" error={form.formState.errors.codigo?.message}>
                  <Input className="uppercase" disabled={Boolean(editing)} {...form.register('codigo')} />
                </Field>
                <Field label="Nombre" error={form.formState.errors.nombre?.message}>
                  <Input {...form.register('nombre')} />
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
            <Button disabled={saveMutation.isPending} form="sede-form" type="submit">
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar sede'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  tone?: 'green';
  value: number;
};

function SummaryCard({ label, tone, value }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'dashboard-panel p-4',
        tone === 'green' ? 'border-[hsl(var(--brand-green)/0.24)] bg-[hsl(var(--brand-green)/0.1)]' : ''
      )}
    >
      {tone === 'green' ? (
        <Building2 className="h-5 w-5 text-[hsl(var(--brand-green))]" />
      ) : (
        <MapPin className="h-5 w-5 text-primary" />
      )}
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}
