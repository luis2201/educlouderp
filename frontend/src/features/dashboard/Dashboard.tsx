import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  KeyRound,
  Layers3,
  LogOut,
  MapPin,
  PlusCircle,
  RefreshCw,
  School,
  Settings,
  ShieldCheck,
  UserPlus,
  Users
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { clearToken } from '@/lib/token-store';
import { cn } from '@/lib/utils';
import type { MeResponse } from '@/features/auth/auth.types';
import { InstitucionesCrud } from '@/features/instituciones/InstitucionesCrud';
import { PersonasCrud } from '@/features/personas/PersonasCrud';
import { SedesCrud } from '@/features/sedes/SedesCrud';

type ListResponse<T> = {
  data: T[];
};

type Catalogo = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
};

type Institucion = {
  codigo: string;
  nombre: string;
  estado: string;
};

type Persona = {
  id: string;
  nombres: string;
  apellidos: string;
  estado: string;
};

type Usuario = {
  id: string;
  username: string;
  estado: string;
  debe_cambiar_clave: boolean;
};

type Rol = {
  codigo: string;
  nombre: string;
  estado: string;
};

type Permiso = {
  codigo: string;
  nombre: string;
  modulo?: string;
  estado?: string;
};

type Parametro = {
  id: string;
  codigo: string;
  nombre?: string;
  estado?: string;
};

type DashboardProps = {
  onLogout: () => void;
};

const modules = [
  { id: 'dashboard', label: 'Panel ejecutivo', icon: Activity },
  { id: 'catalogos', label: 'Catálogos', icon: Database },
  { id: 'instituciones', label: 'Instituciones', icon: Building2 },
  { id: 'sedes', label: 'Sedes', icon: MapPin },
  { id: 'personas', label: 'Personas', icon: Users },
  { id: 'roles', label: 'Roles y permisos', icon: ShieldCheck },
  { id: 'periodos', label: 'Periodos', icon: BookOpen },
  { id: 'parametros', label: 'Parámetros', icon: Settings }
];

const phaseItems = [
  { label: 'Núcleo de base de datos', value: 100 },
  { label: 'Catálogos y políticas', value: 100 },
  { label: 'Instituciones y sedes', value: 85 },
  { label: 'Personas y usuarios', value: 82 },
  { label: 'Roles, permisos y sesiones', value: 88 },
  { label: 'UI ejecutiva inicial', value: 72 }
];

const calendarItems = [
  { day: '06', month: 'JUL', title: 'Validar cambio obligatorio de contraseña', tone: 'warning' },
  { day: '08', month: 'JUL', title: 'Diseñar CRUD de instituciones', tone: 'sky' },
  { day: '10', month: 'JUL', title: 'Conectar sedes y periodos desde UI', tone: 'green' }
];

const quickActions = [
  { label: 'Nueva institución', icon: Building2, tone: 'sky' },
  { label: 'Registrar persona', icon: UserPlus, tone: 'green' },
  { label: 'Crear catálogo', icon: PlusCircle, tone: 'navy' },
  { label: 'Revisar permisos', icon: ShieldCheck, tone: 'warning' }
];

const passwordSchema = z
  .object({
    passwordActual: z.string().min(1, 'Ingrese la contraseña actual'),
    password: z.string().min(8, 'La nueva contraseña debe tener al menos 8 caracteres'),
    confirmarPassword: z.string().min(1, 'Confirme la nueva contraseña')
  })
  .refine((values) => values.password === values.confirmarPassword, {
    message: 'La confirmación no coincide',
    path: ['confirmarPassword']
  })
  .refine((values) => values.password !== values.passwordActual, {
    message: 'Use una contraseña diferente a la actual',
    path: ['password']
  });

type PasswordValues = z.infer<typeof passwordSchema>;

function countActive<T extends { estado?: string }>(items: T[]) {
  return items.filter((item) => item.estado === 'ACTIVO' || item.estado === 'ACTIVA').length;
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const queryClient = useQueryClient();
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      passwordActual: '',
      password: '',
      confirmarPassword: ''
    }
  });
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest<MeResponse>('/api/auth/me')
  });
  const catalogosQuery = useQuery({
    queryKey: ['catalogos'],
    queryFn: () => apiRequest<ListResponse<Catalogo>>('/api/catalogos'),
    enabled: meQuery.isSuccess
  });
  const institucionesQuery = useQuery({
    queryKey: ['instituciones'],
    queryFn: () => apiRequest<ListResponse<Institucion>>('/api/instituciones'),
    enabled: meQuery.isSuccess
  });
  const personasQuery = useQuery({
    queryKey: ['personas'],
    queryFn: () => apiRequest<ListResponse<Persona>>('/api/personas'),
    enabled: meQuery.isSuccess
  });
  const usuariosQuery = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => apiRequest<ListResponse<Usuario>>('/api/usuarios'),
    enabled: meQuery.isSuccess
  });
  const rolesQuery = useQuery({
    queryKey: ['seguridad', 'roles'],
    queryFn: () => apiRequest<ListResponse<Rol>>('/api/seguridad/roles'),
    enabled: meQuery.isSuccess
  });
  const permisosQuery = useQuery({
    queryKey: ['seguridad', 'permisos'],
    queryFn: () => apiRequest<ListResponse<Permiso>>('/api/seguridad/permisos'),
    enabled: meQuery.isSuccess
  });
  const parametrosQuery = useQuery({
    queryKey: ['parametros-configuracion'],
    queryFn: () => apiRequest<ListResponse<Parametro>>('/api/parametros-configuracion'),
    enabled: meQuery.isSuccess
  });

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => null);
    clearToken();
    queryClient.clear();
    onLogout();
  }

  const passwordMutation = useMutation({
    mutationFn: (values: PasswordValues) =>
      apiRequest('/api/auth/password', {
        method: 'PATCH',
        body: {
          password_actual: values.passwordActual,
          password: values.password,
          confirmar_password: values.confirmarPassword
        }
      }),
    onSuccess() {
      passwordForm.reset();
      setIsPasswordOpen(false);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    }
  });

  const passwordError = passwordMutation.error as ApiError | null;

  function closePasswordDialog(open: boolean) {
    if (passwordMutation.isPending) return;

    setIsPasswordOpen(open);

    if (!open) {
      passwordForm.reset();
      passwordMutation.reset();
    }
  }

  const usuario = meQuery.data?.data.usuario;
  const catalogos = catalogosQuery.data?.data ?? [];
  const instituciones = institucionesQuery.data?.data ?? [];
  const personas = personasQuery.data?.data ?? [];
  const usuarios = usuariosQuery.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];
  const permisos = permisosQuery.data?.data ?? [];
  const parametros = parametrosQuery.data?.data ?? [];
  const dataQueries = [
    catalogosQuery,
    institucionesQuery,
    personasQuery,
    usuariosQuery,
    rolesQuery,
    permisosQuery,
    parametrosQuery
  ];
  const loadedQueries = dataQueries.filter((query) => query.isSuccess).length;
  const failedQueries = dataQueries.filter((query) => query.isError).length;
  const readiness = percent(loadedQueries, dataQueries.length);
  const usuariosActivos = countActive(usuarios);
  const usuariosClavePendiente = usuarios.filter((item) => item.debe_cambiar_clave).length;
  const catalogosSistema = catalogos.filter((item) => item.tipo === 'SISTEMA').length;
  const catalogosInstitucionales = catalogos.filter((item) => item.tipo === 'INSTITUCIONAL').length;
  const catalogosOperativos = catalogos.filter((item) => item.tipo === 'OPERATIVO').length;
  const catalogosBase = catalogos.filter((item) => item.estado === 'ACTIVO').slice(0, 6);
  const institucionesBase = instituciones.slice(0, 5);
  const usuariosBase = usuarios.slice(0, 5);
  const promedioFase = Math.round(
    phaseItems.reduce((total, item) => total + item.value, 0) / phaseItems.length
  );
  const catalogChartData = [
    { label: 'Sistema', value: catalogosSistema, tone: 'sky' },
    { label: 'Institucional', value: catalogosInstitucionales, tone: 'green' },
    { label: 'Operativo', value: catalogosOperativos, tone: 'navy' }
  ];
  const moduleChartData = [
    { label: 'Catálogos', value: catalogos.length, tone: 'sky' },
    { label: 'Personas', value: personas.length, tone: 'green' },
    { label: 'Usuarios', value: usuarios.length, tone: 'navy' },
    { label: 'Permisos', value: permisos.length, tone: 'warning' }
  ];
  const activityItems = [
    {
      title: 'Dashboard ejecutivo actualizado',
      description: 'KPI, alertas, charts y tablas ejecutivas aplicadas',
      icon: CheckCircle2,
      tone: 'green'
    },
    {
      title: 'Repositorio sincronizado',
      description: 'Rama main publicada en GitHub con fase inicial',
      icon: FileText,
      tone: 'sky'
    },
    {
      title: 'Seguridad activa',
      description: `${roles.length} roles y ${permisos.length} permisos disponibles`,
      icon: ShieldCheck,
      tone: 'navy'
    },
    {
      title: 'Siguiente control',
      description: 'Crear flujo de cambio obligatorio de contraseña',
      icon: Clock3,
      tone: 'warning'
    }
  ];

  function refreshDashboard() {
    dataQueries.forEach((query) => query.refetch());
    meQuery.refetch();
  }

  return (
    <div className="brand-surface min-h-screen">
      <header className="border-b bg-card/92 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img
              alt="EduCloudERP"
              className="h-10 w-10 rounded-md border bg-white object-contain p-0.5"
              src="/img/educlouderp_ico.png"
            />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-primary">EduCloudERP</h1>
              <p className="truncate text-sm text-muted-foreground">
                {usuario?.username || 'Verificando sesión'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshDashboard} size="icon" title="Actualizar panel" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={logout} size="sm" variant="outline">
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-5 xl:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="border-primary/15">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Sesión</CardTitle>
              <CardDescription>{meQuery.data?.data.estado || 'Verificando'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Usuario</span>
                <span className="truncate font-medium">{usuario?.username}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant="green">{usuario?.estado || 'Validando'}</Badge>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Clave</span>
                <Badge variant={usuario?.debe_cambiar_clave ? 'warning' : 'green'}>
                  {usuario?.debe_cambiar_clave ? 'Pendiente' : 'Vigente'}
                </Badge>
              </div>
              <Button
                className="mt-2 w-full"
                onClick={() => setIsPasswordOpen(true)}
                size="sm"
                variant={usuario?.debe_cambiar_clave ? 'default' : 'outline'}
              >
                <KeyRound className="h-4 w-4" />
                Actualizar contraseña
              </Button>
            </CardContent>
          </Card>

          <nav className="dashboard-panel p-2">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule === module.id;

              return (
                <button
                  className={cn(
                    'flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  key={module.label}
                  onClick={() => setActiveModule(module.id)}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{module.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="dashboard-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-primary">Fase 1</p>
              <Badge variant="sky">{promedioFase}%</Badge>
            </div>
            <div className="mt-3 h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${promedioFase}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Base, seguridad y módulos núcleo listos para consolidar pantallas operativas.
            </p>
          </div>
        </aside>

        {activeModule === 'instituciones' ? <InstitucionesCrud /> : null}
        {activeModule === 'sedes' ? <SedesCrud /> : null}
        {activeModule === 'personas' ? <PersonasCrud /> : null}

        {!['instituciones', 'sedes', 'personas'].includes(activeModule) ? (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
            <div className="elevated-panel overflow-hidden rounded-lg border bg-primary text-primary-foreground">
              <div className="grid gap-4 p-5 md:grid-cols-[1fr_220px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-white/25 bg-white/12 text-white" variant="default">
                      Panel ejecutivo
                    </Badge>
                    <Badge className="border-white/25 bg-white/12 text-white" variant="default">
                      Fase 1
                    </Badge>
                  </div>
                  <h2 className="mt-5 max-w-2xl text-2xl font-semibold leading-8">
                    Núcleo institucional listo para operación controlada.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                    La primera base funcional ya cubre datos maestros, seguridad, sesiones,
                    catálogos y configuración inicial para avanzar hacia pantallas operativas.
                  </p>
                </div>

                <div className="rounded-lg border border-white/16 bg-white/10 p-4">
                  <p className="text-xs font-semibold uppercase text-white/70">Preparación</p>
                  <p className="mt-3 text-4xl font-semibold">{readiness}%</p>
                  <div className="mt-4 h-2 rounded-full bg-white/18">
                    <div
                      className="h-2 rounded-full bg-[hsl(var(--brand-green))]"
                      style={{ width: `${readiness}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-white/72">
                    {loadedQueries} de {dataQueries.length} fuentes ejecutivas disponibles
                  </p>
                </div>
              </div>
            </div>

            {usuario?.debe_cambiar_clave ? (
              <Alert className="h-full" variant="warning">
                <div className="flex gap-3">
                  <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <AlertTitle>Cambio de contraseña pendiente</AlertTitle>
                    <AlertDescription>
                      La cuenta administrativa conserva una contraseña temporal. Conviene cerrar
                      este control antes de activar operación diaria.
                    </AlertDescription>
                    <Button
                      className="mt-4 bg-amber-900 text-white hover:bg-amber-800"
                      onClick={() => setIsPasswordOpen(true)}
                      size="sm"
                    >
                      <KeyRound className="h-4 w-4" />
                      Actualizar ahora
                    </Button>
                  </div>
                </div>
              </Alert>
            ) : (
              <Alert className="h-full" variant="success">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <AlertTitle>Seguridad activa</AlertTitle>
                    <AlertDescription>
                      Autenticación, sesiones, roles y permisos responden desde la API protegida.
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
          </div>

          {failedQueries ? (
            <Alert variant="destructive">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <AlertTitle>Fuentes con error</AlertTitle>
                  <AlertDescription>
                    {failedQueries} consulta(s) del panel no respondieron. Revise permisos o estado de
                    la API antes de tomar decisiones operativas.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              accent="sky"
              icon={School}
              label="Instituciones"
              meta={`${countActive(instituciones)} activas`}
              value={instituciones.length}
            />
            <MetricCard
              accent="green"
              icon={Users}
              label="Personas"
              meta={`${countActive(personas)} activas`}
              value={personas.length}
            />
            <MetricCard
              accent="navy"
              icon={KeyRound}
              label="Usuarios"
              meta={`${usuariosActivos} activos / ${usuariosClavePendiente} pendientes`}
              value={usuarios.length}
            />
            <MetricCard
              accent="sky"
              icon={ShieldCheck}
              label="Permisos"
              meta={`${roles.length} roles configurados`}
              value={permisos.length}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid gap-4 lg:grid-cols-2">
              <SimpleBarChart
                data={moduleChartData}
                description="Volumen comparativo de registros disponibles"
                title="Cobertura de módulos"
              />
              <SimpleDonutChart
                description="Clasificación de catálogos por tipo de gobierno"
                items={catalogChartData}
                title="Gobierno de catálogos"
                total={catalogos.length}
              />
            </div>

            <QuickActions actions={quickActions} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <CalendarPreview items={calendarItems} />
            <ActivityFeed items={activityItems} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="dashboard-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">Mapa ejecutivo de fase</h2>
                  <p className="text-sm text-muted-foreground">
                    Avance funcional de la primera base del ERP
                  </p>
                </div>
                <Badge variant="green">{promedioFase}% promedio</Badge>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {phaseItems.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground">{item.value}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-secondary">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          item.value >= 90
                            ? 'bg-[hsl(var(--brand-green))]'
                            : item.value >= 80
                              ? 'bg-[hsl(var(--brand-sky))]'
                              : 'bg-primary'
                        )}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-primary">Catálogos</h2>
                  <p className="text-sm text-muted-foreground">Distribución por gobierno</p>
                </div>
                <Badge variant="sky">{catalogos.length}</Badge>
              </div>
              <div className="mt-5 space-y-4">
                <CatalogType label="Sistema" total={catalogos.length} value={catalogosSistema} />
                <CatalogType
                  label="Institucionales"
                  total={catalogos.length}
                  value={catalogosInstitucionales}
                />
                <CatalogType label="Operativos" total={catalogos.length} value={catalogosOperativos} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DataTable
              columns={['Código', 'Institución', 'Estado']}
              emptyText="No hay instituciones registradas."
              rows={institucionesBase.map((institucion) => ({
                id: institucion.codigo,
                cells: [
                  <span className="font-semibold text-primary">{institucion.codigo}</span>,
                  <span className="truncate">{institucion.nombre}</span>,
                  <Badge key={institucion.codigo} variant="green">
                    {institucion.estado}
                  </Badge>
                ]
              }))}
              title="Instituciones"
              subtitle="Resumen operativo de instituciones registradas"
            />
            <DataTable
              columns={['Usuario', 'Estado', 'Clave']}
              emptyText="No hay usuarios registrados."
              rows={usuariosBase.map((item) => ({
                id: item.id,
                cells: [
                  <span className="font-semibold text-primary">{item.username}</span>,
                  <Badge key={`${item.id}-estado`} variant="green">
                    {item.estado}
                  </Badge>,
                  <Badge key={`${item.id}-clave`} variant={item.debe_cambiar_clave ? 'warning' : 'green'}>
                    {item.debe_cambiar_clave ? 'Pendiente' : 'Vigente'}
                  </Badge>
                ]
              }))}
              title="Usuarios"
              subtitle="Estado de acceso y credenciales"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-x-auto dashboard-panel">
              <div className="flex items-center justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="text-lg font-semibold text-primary">Control de catálogos base</h2>
                  <p className="text-sm text-muted-foreground">
                    Vista rápida de elementos configurados en fase 1
                  </p>
                </div>
                <Button onClick={() => catalogosQuery.refetch()} size="icon" title="Actualizar" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <table className="erp-table min-w-[760px] table-fixed text-sm">
                <thead className="bg-primary text-primary-foreground">
                  <tr>
                    <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Nombre</th>
                    <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase">Tipo</th>
                    <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogosBase.map((catalogo, index) => (
                    <tr
                      className={cn(
                        'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                        index % 2 === 0 ? 'bg-card' : 'bg-secondary/28'
                      )}
                      key={catalogo.id}
                    >
                      <td className="erp-table-edge truncate px-4 py-3 font-semibold text-primary">
                        {catalogo.codigo}
                      </td>
                      <td className="truncate px-4 py-3">{catalogo.nombre}</td>
                      <td className="px-4 py-3">
                        <Badge variant={catalogo.tipo === 'SISTEMA' ? 'sky' : 'muted'}>
                          {catalogo.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="green">{catalogo.estado}</Badge>
                      </td>
                    </tr>
                  ))}
                  {catalogosQuery.isLoading ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                        Cargando...
                      </td>
                    </tr>
                  ) : null}
                  {!catalogosQuery.isLoading && !catalogosBase.length ? (
                    <tr>
                      <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                        Sin catálogos activos para mostrar.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <ExecutiveSignal
                description={`${parametros.length} parámetros disponibles para reglas institucionales`}
                icon={Settings}
                title="Configuración"
                tone="sky"
              />
              <ExecutiveSignal
                description={`${roles.length} roles y ${permisos.length} permisos levantados`}
                icon={ShieldCheck}
                title="Gobierno de acceso"
                tone="green"
              />
              <ExecutiveSignal
                description="Sedes y periodos ya dependen de institución para mantener contexto"
                icon={Layers3}
                title="Modelo institucional"
                tone="navy"
              />
              <ExecutiveSignal
                description="Siguiente paso: pantallas CRUD y cambio obligatorio de contraseña"
                icon={Clock3}
                title="Próximo hito"
                tone="warning"
              />
            </div>
          </div>
        </section>
        ) : null}
      </main>

      <Dialog onOpenChange={closePasswordDialog} open={isPasswordOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Actualizar contraseña</DialogTitle>
            <DialogDescription>
              Confirme la contraseña actual y registre una nueva clave para la sesión.
            </DialogDescription>
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
              id="password-form"
              onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}
            >
              <PasswordField
                error={passwordForm.formState.errors.passwordActual?.message}
                label="Contraseña actual"
              >
                <Input
                  autoComplete="current-password"
                  type="password"
                  {...passwordForm.register('passwordActual')}
                />
              </PasswordField>
              <PasswordField error={passwordForm.formState.errors.password?.message} label="Nueva contraseña">
                <Input autoComplete="new-password" type="password" {...passwordForm.register('password')} />
              </PasswordField>
              <PasswordField
                error={passwordForm.formState.errors.confirmarPassword?.message}
                label="Confirmar contraseña"
              >
                <Input
                  autoComplete="new-password"
                  type="password"
                  {...passwordForm.register('confirmarPassword')}
                />
              </PasswordField>
            </form>
          </div>

          <DialogFooter>
            <Button disabled={passwordMutation.isPending} onClick={() => closePasswordDialog(false)} variant="outline">
              Cancelar
            </Button>
            <Button disabled={passwordMutation.isPending} form="password-form" type="submit">
              <KeyRound className="h-4 w-4" />
              {passwordMutation.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type MetricCardProps = {
  accent: 'green' | 'navy' | 'sky';
  icon: typeof Activity;
  label: string;
  meta: string;
  value: number;
};

type PasswordFieldProps = {
  children: ReactNode;
  error?: string;
  label: string;
};

function PasswordField({ children, error, label }: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function MetricCard({ accent, icon: Icon, label, meta, value }: MetricCardProps) {
  const accentClass = {
    green: 'border-[hsl(var(--brand-green)/0.24)] bg-[hsl(var(--brand-green)/0.1)] text-[hsl(116_48%_28%)]',
    navy: 'border-primary/15 bg-primary/10 text-primary',
    sky: 'border-[hsl(var(--brand-sky)/0.24)] bg-[hsl(var(--brand-sky)/0.1)] text-primary'
  }[accent];

  return (
    <div className={cn('dashboard-panel p-4', accentClass)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase opacity-75">{label}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
        </div>
        <span className="rounded-md border bg-white/52 p-2">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-sm opacity-80">{meta}</p>
    </div>
  );
}

type CatalogTypeProps = {
  label: string;
  total: number;
  value: number;
};

function CatalogType({ label, total, value }: CatalogTypeProps) {
  const progress = percent(value, total);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-[hsl(var(--brand-sky))]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

type ChartItem = {
  label: string;
  tone: string;
  value: number;
};

type SimpleBarChartProps = {
  data: ChartItem[];
  description: string;
  title: string;
};

function SimpleBarChart({ data, description, title }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md border bg-secondary/80 p-2 text-primary">
          <BarChart3 className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-sm text-muted-foreground">{item.value}</span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-secondary">
              <div
                className={cn('h-3 rounded-full', chartToneClass(item.tone))}
                style={{ width: `${Math.max(8, percent(item.value, maxValue))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SimpleDonutChartProps = {
  description: string;
  items: ChartItem[];
  title: string;
  total: number;
};

function SimpleDonutChart({ description, items, title, total }: SimpleDonutChartProps) {
  const first = percent(items[0]?.value ?? 0, total);
  const second = percent((items[0]?.value ?? 0) + (items[1]?.value ?? 0), total);
  const donutBackground = total
    ? `conic-gradient(hsl(var(--brand-sky)) 0 ${first}%, hsl(var(--brand-green)) ${first}% ${second}%, hsl(var(--primary)) ${second}% 100%)`
    : 'conic-gradient(hsl(var(--muted)) 0 100%)';

  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-md border bg-secondary/80 p-2 text-primary">
          <Database className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-[150px_1fr]">
        <div
          className="grid aspect-square place-items-center rounded-full"
          style={{ background: donutBackground }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full border bg-card text-center">
            <div>
              <p className="text-2xl font-semibold text-primary">{total}</p>
              <p className="text-xs text-muted-foreground">total</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div className="flex items-center justify-between gap-3" key={item.label}>
              <span className="flex items-center gap-2 text-sm">
                <span className={cn('h-2.5 w-2.5 rounded-full', chartToneClass(item.tone))} />
                {item.label}
              </span>
              <Badge variant={item.tone === 'green' ? 'green' : item.tone === 'sky' ? 'sky' : 'default'}>
                {item.value}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type DataTableRow = {
  cells: ReactNode[];
  id: string;
};

type DataTableProps = {
  columns: string[];
  emptyText: string;
  rows: DataTableRow[];
  subtitle: string;
  title: string;
};

function DataTable({ columns, emptyText, rows, subtitle, title }: DataTableProps) {
  return (
    <div className="overflow-x-auto dashboard-panel">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <table className="erp-table min-w-[560px] table-fixed text-sm">
        <thead className="bg-secondary/80 text-secondary-foreground">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              className={cn(
                'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                index % 2 === 0 ? 'bg-card' : 'bg-secondary/24'
              )}
              key={row.id}
            >
              {row.cells.map((cell, cellIndex) => (
                <td className="truncate px-4 py-3" key={`${row.id}-${cellIndex}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-4 py-6 text-muted-foreground" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

type CalendarPreviewProps = {
  items: typeof calendarItems;
};

function CalendarPreview({ items }: CalendarPreviewProps) {
  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Calendario</h2>
          <p className="text-sm text-muted-foreground">Próximos hitos de trabajo</p>
        </div>
        <span className="rounded-md border bg-secondary/80 p-2 text-primary">
          <CalendarDays className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div className="flex gap-3 rounded-md border bg-background/72 p-3" key={item.title}>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border bg-card text-center">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{item.month}</p>
                <p className="text-base font-semibold text-primary">{item.day}</p>
              </div>
            </div>
            <div className="min-w-0">
              <Badge variant={item.tone === 'green' ? 'green' : item.tone === 'warning' ? 'warning' : 'sky'}>
                Programado
              </Badge>
              <p className="mt-1 truncate text-sm font-medium">{item.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type ActivityItem = {
  description: string;
  icon: typeof Activity;
  title: string;
  tone: string;
};

type ActivityFeedProps = {
  items: ActivityItem[];
};

function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Actividad</h2>
          <p className="text-sm text-muted-foreground">Bitácora ejecutiva reciente</p>
        </div>
        <span className="rounded-md border bg-secondary/80 p-2 text-primary">
          <ClipboardList className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 space-y-0">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <div className="grid grid-cols-[32px_1fr] gap-3" key={item.title}>
              <div className="flex flex-col items-center">
                <span className={cn('grid h-8 w-8 place-items-center rounded-full text-white', chartToneClass(item.tone))}>
                  <Icon className="h-4 w-4" />
                </span>
                {index < items.length - 1 ? <span className="h-10 w-px bg-border" /> : null}
              </div>
              <div className="pb-4">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type QuickAction = {
  icon: typeof Activity;
  label: string;
  tone: string;
};

type QuickActionsProps = {
  actions: QuickAction[];
};

function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">Acciones rápidas</h2>
          <p className="text-sm text-muted-foreground">Entradas operativas prioritarias</p>
        </div>
        <span className="rounded-md border bg-secondary/80 p-2 text-primary">
          <PlusCircle className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              className="flex h-12 items-center justify-between gap-3 rounded-md border bg-background/78 px-3 text-left text-sm font-medium transition-colors hover:border-[hsl(var(--brand-sky)/0.45)] hover:bg-[hsl(var(--brand-sky)/0.08)]"
              key={action.label}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md text-white', chartToneClass(action.tone))}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{action.label}</span>
              </span>
              <span className="text-lg leading-none text-muted-foreground">+</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function chartToneClass(tone: string) {
  if (tone === 'green') return 'bg-[hsl(var(--brand-green))]';
  if (tone === 'sky') return 'bg-[hsl(var(--brand-sky))]';
  if (tone === 'warning') return 'bg-amber-500';
  return 'bg-primary';
}

type ExecutiveSignalProps = {
  description: string;
  icon: typeof Activity;
  title: string;
  tone: 'green' | 'navy' | 'sky' | 'warning';
};

function ExecutiveSignal({ description, icon: Icon, title, tone }: ExecutiveSignalProps) {
  const toneClass = {
    green: 'border-[hsl(var(--brand-green)/0.24)] bg-[hsl(var(--brand-green)/0.1)] text-[hsl(116_48%_28%)]',
    navy: 'border-primary/15 bg-primary/10 text-primary',
    sky: 'border-[hsl(var(--brand-sky)/0.24)] bg-[hsl(var(--brand-sky)/0.1)] text-primary',
    warning: 'border-amber-300/70 bg-amber-50 text-amber-900'
  }[tone];

  return (
    <div className={cn('rounded-lg border p-4 shadow-sm', toneClass)}>
      <div className="flex gap-3">
        <span className="rounded-md border bg-white/58 p-2">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-5 opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
}
