import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { LoginForm } from '@/features/auth/LoginForm';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { apiRequest } from '@/lib/api';
import { clearToken, getToken } from '@/lib/token-store';
import type { MeResponse } from '@/features/auth/auth.types';

export function App() {
  const [authVersion, setAuthVersion] = useState(0);
  const hasToken = Boolean(getToken());
  const meQuery = useQuery({
    queryKey: ['auth', 'me', authVersion],
    queryFn: () => apiRequest<MeResponse>('/api/auth/me'),
    enabled: hasToken,
    retry: false
  });

  useEffect(() => {
    if (meQuery.isError) {
      clearToken();
      setAuthVersion((version) => version + 1);
    }
  }, [meQuery.isError]);

  const refreshAuth = () => setAuthVersion((version) => version + 1);

  if (hasToken && !meQuery.isError) {
    return <Dashboard onLogout={refreshAuth} />;
  }

  return (
    <main className="brand-surface flex min-h-screen items-center justify-center px-4 py-8">
      <LoginForm onLogin={refreshAuth} />
    </main>
  );
}
