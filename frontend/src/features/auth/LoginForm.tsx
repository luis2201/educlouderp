import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Info, KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, type ApiError } from '@/lib/api';
import { setToken } from '@/lib/token-store';

import type { LoginResponse } from './auth.types';

const loginSchema = z.object({
  usuario: z.string().min(1, 'Ingrese el usuario'),
  password: z.string().min(1, 'Ingrese la contraseña')
});

type LoginValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  onLogin: () => void;
};

export function LoginForm({ onLogin }: LoginFormProps) {
  const queryClient = useQueryClient();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usuario: '',
      password: ''
    }
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) =>
      apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: values,
        token: null
      }),
    onSuccess(response) {
      setToken(response.data.token);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      onLogin();
    }
  });

  const error = loginMutation.error as ApiError | null;

  return (
    <div className="elevated-panel grid w-full max-w-5xl overflow-hidden rounded-lg border bg-card/95 lg:grid-cols-[1fr_420px]">
      <section className="brand-grid hidden border-r bg-secondary/55 p-8 lg:flex lg:flex-col lg:justify-between">
        <div>
          <img
            alt="EduCloudERP"
            className="h-28 w-auto object-contain"
            src="/img/educlouderp_logo.png"
          />
          <div className="mt-8 max-w-md">
            <h1 className="text-2xl font-semibold text-primary">Gestión educativa integrada</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Núcleo administrativo para instituciones, sedes, personas, catálogos y seguridad.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-[hsl(var(--brand-green)/0.22)] bg-[hsl(var(--brand-green)/0.1)] p-3">
            <ShieldCheck className="h-5 w-5 text-[hsl(var(--brand-green))]" />
            <p className="mt-2 text-sm font-medium">Sesiones protegidas</p>
            <p className="mt-1 text-xs text-muted-foreground">Control de permisos activo</p>
          </div>
          <div className="rounded-md border border-[hsl(var(--brand-sky)/0.24)] bg-[hsl(var(--brand-sky)/0.1)] p-3">
            <KeyRound className="h-5 w-5 text-[hsl(var(--brand-sky))]" />
            <p className="mt-2 text-sm font-medium">Acceso por rol</p>
            <p className="mt-1 text-xs text-muted-foreground">Privilegios por módulo</p>
          </div>
        </div>
      </section>

      <Card className="border-0 shadow-none">
        <CardHeader className="space-y-4">
          <img
            alt="EduCloudERP"
            className="h-16 w-auto object-contain lg:hidden"
            src="/img/educlouderp_logo.png"
          />
          <div>
            <CardTitle>Acceso institucional</CardTitle>
            <CardDescription>Ingrese con su usuario autorizado</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-5" variant="info">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <AlertTitle>Entorno administrativo</AlertTitle>
                <AlertDescription>
                  Use credenciales institucionales. La actividad queda asociada a su sesión.
                </AlertDescription>
              </div>
            </div>
          </Alert>

          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
          >
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                autoComplete="username"
                className="bg-background"
                {...form.register('usuario')}
              />
              {form.formState.errors.usuario ? (
                <p className="text-sm text-destructive">{form.formState.errors.usuario.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="bg-background"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>No se pudo iniciar sesión</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            ) : null}

            <Button className="w-full" disabled={loginMutation.isPending} type="submit">
              <LogIn className="h-4 w-4" />
              {loginMutation.isPending ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
