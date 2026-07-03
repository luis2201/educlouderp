import { getToken } from './token-store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4005';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export type ApiError = Error & {
  status?: number;
  requestId?: string;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const token = options.token ?? getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || 'No se pudo completar la solicitud') as ApiError;
    error.status = response.status;
    error.requestId = payload?.request_id;
    throw error;
  }

  return payload as T;
}
