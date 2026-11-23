import { API_BASE_URL } from '../config/runtime';
import { useAuthStore, type AuthUser } from '../state/authStore';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'api_error') {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshFlight) return refreshFlight;
  refreshFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!response.ok) {
        useAuthStore.getState().clearSession();
        return false;
      }
      const body = await response.json() as { access_token: string; user: AuthUser };
      useAuthStore.getState().setSession(body.access_token, body.user);
      return true;
    } catch {
      useAuthStore.getState().clearSession();
      return false;
    } finally {
      refreshFlight = null;
    }
  })();
  return refreshFlight;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = useAuthStore.getState().accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && !path.includes('/auth/')) {
    if (await refreshSession()) return apiRequest<T>(path, init, false);
  }
  if (!response.ok) {
    let message = 'The request could not be completed.';
    let code = 'api_error';
    try {
      const body = await response.json() as { detail?: unknown };
      if (typeof body.detail === 'object' && body.detail && 'message' in body.detail) {
        message = String(body.detail.message);
        code = 'code' in body.detail ? String(body.detail.code) : code;
      } else if (typeof body.detail === 'string') message = body.detail;
    } catch { /* retain generic response */ }
    throw new ApiError(message, response.status, code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { refreshSession };
