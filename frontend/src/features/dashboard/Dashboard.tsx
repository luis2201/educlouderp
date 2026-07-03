import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  Database,
  KeyRound,
  LogOut,
  MapPin,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import { clearToken } from '@/lib/token-store';
import { cn } from '@/lib/utils';
import type { MeResponse } from '@/features/auth/auth.types';

type Catalogo = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
};

type CatalogosResponse = {
  data: Catalogo[];
};

type DashboardProps = {
  onLogout: () => void;
};

const modules = [
  { label: 'Catálogos', icon: Database, active: true },
  { label: 'Instituciones', icon: Building2 },
  { label: 'Sedes', icon: MapPin },
  { label: 'Personas', icon: Users },
  { label: 'Roles y permisos', icon: ShieldCheck },
  { label: 'Periodos', icon: BookOpen },
  { label: 'Parámetros', icon: Settings }
];

export function Dashboard({ onLogout }: DashboardProps) {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiRequest<MeResponse>('/api/auth/me')
  });
  const catalogosQuery = useQuery({
    queryKey: ['catalogos'],
    queryFn: () => apiRequest<CatalogosResponse>('/api/catalogos'),
    enabled: meQuery.isSuccess
  });

  async function logout() {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => null);
    clearToken();
    queryClient.clear();
    onLogout();
  }

  const usuario = meQuery.data?.data.usuario;
  const totalCatalogos = catalogosQuery.data?.data.length ?? 0;

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
          <Button onClick={logout} size="sm" variant="outline">
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-5 lg:grid-cols-[272px_1fr]">
        <aside className="space-y-3">
          <Card className="border-primary/15">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Sesión</CardTitle>
              <CardDescription>
                {meQuery.data?.data.estado || 'Verificando'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Usuario</span>
                <span className="font-medium">{usuario?.username}</span>
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
            </CardContent>
          </Card>

          <nav className="rounded-lg border bg-card/95 p-2 shadow-sm backdrop-blur">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <button
                  className={cn(
                    'flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors',
                    module.active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  key={module.label}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{module.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          {usuario?.debe_cambiar_clave ? (
            <Alert variant="warning">
              <div className="flex gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <AlertTitle>Cambio de contraseña pendiente</AlertTitle>
                  <AlertDescription>
                    La cuenta administrativa conserva una contraseña temporal. Este flujo será el
                    siguiente control de seguridad del frontend.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ) : (
            <Alert variant="success">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <AlertTitle>Sesión validada</AlertTitle>
                  <AlertDescription>
                    Los permisos y catálogos se consultan desde la API protegida.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-primary/15 bg-card/95 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Catálogos</p>
              <p className="mt-2 text-2xl font-semibold text-primary">{totalCatalogos}</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--brand-sky)/0.22)] bg-[hsl(var(--brand-sky)/0.1)] p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Módulo activo</p>
              <p className="mt-2 text-lg font-semibold">Núcleo</p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--brand-green)/0.24)] bg-[hsl(var(--brand-green)/0.1)] p-4 shadow-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Seguridad</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                <KeyRound className="h-4 w-4 text-[hsl(var(--brand-green))]" />
                Activa
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-card/95 p-4 shadow-sm backdrop-blur">
            <div>
              <h2 className="text-lg font-semibold text-primary">Catálogos</h2>
              <p className="text-sm text-muted-foreground">Núcleo de configuración inicial</p>
            </div>
            <Button
              onClick={() => catalogosQuery.refetch()}
              size="icon"
              title="Actualizar"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-card/95 shadow-sm">
            <table className="formal-table min-w-[720px] table-fixed text-sm">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Nombre</th>
                  <th className="w-36 px-4 py-3 text-left text-xs font-semibold uppercase">Tipo</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {catalogosQuery.data?.data.map((catalogo, index) => (
                  <tr
                    className={cn(
                      'border-b transition-colors last:border-0 hover:bg-[hsl(var(--brand-sky)/0.09)]',
                      index % 2 === 0 ? 'bg-card' : 'bg-secondary/28'
                    )}
                    key={catalogo.id}
                  >
                    <td className="truncate border-l-4 border-l-[hsl(var(--brand-sky))] px-4 py-3 font-semibold text-primary">
                      {catalogo.codigo}
                    </td>
                    <td className="truncate px-4 py-3">{catalogo.nombre}</td>
                    <td className="px-4 py-3">{catalogo.tipo}</td>
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
                {catalogosQuery.isError ? (
                  <tr>
                    <td className="px-4 py-6 text-destructive" colSpan={4}>
                      No se pudieron cargar los catálogos.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
