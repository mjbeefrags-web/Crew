import { apiRequest } from './apiClient';
import { useAuthStore, type AuthUser } from '../state/authStore';

type AuthResponse = { access_token: string; token_type: 'bearer'; user: AuthUser };
type AuthSession = { authenticated: boolean; access_token?: string | null; user?: AuthUser | null };

async function establish(path: string, values: Record<string, string>): Promise<AuthUser> {
  const response = await apiRequest<AuthResponse>(`/api/v1/auth/${path}`, { method: 'POST', body: JSON.stringify(values) }, false);
  useAuthStore.getState().setSession(response.access_token, response.user);
  return response.user;
}

export const apiAuthService = {
  login: (email: string, password: string) => establish('login', { email, password }),
  register: (email: string, password: string, firstName: string, lastName: string) => establish('register', { email, password, first_name: firstName, last_name: lastName }),
  async logout(): Promise<void> {
    try { await apiRequest<void>('/api/v1/auth/logout', { method: 'POST' }, false); }
    finally { useAuthStore.getState().clearSession(); }
  },
  async currentUser(): Promise<AuthUser | null> {
    try {
      const session = await apiRequest<AuthSession>('/api/v1/auth/session', { method: 'POST' }, false);
      if (!session.authenticated || !session.access_token || !session.user) {
        useAuthStore.getState().clearSession();
        return null;
      }
      useAuthStore.getState().setSession(session.access_token, session.user);
      return session.user;
    }
    catch { return null; }
  },
};
