import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { API_MODE } from '../config/runtime';
import { apiRequest } from '../services/apiClient';
import { useAuthStore } from '../state/authStore';

type ServiceStatus = { status: 'healthy' | 'degraded' | 'unavailable' | 'not_configured'; mode?: string };
type SystemStatus = {
  environment: string;
  frontend_backend_connectivity: { frontend: string; backend: string };
  services: Record<string, ServiceStatus>;
  warnings: { code: string; message: string }[];
  checked_at: string;
};

export function AdminSystemPage() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryKey: ['admin-system-status'], queryFn: () => apiRequest<SystemStatus>('/api/admin/system/status'), enabled: API_MODE && user?.role === 'admin', refetchInterval: 30_000, retry: false });

  return <div className="storefront-page admin-system-page">
    <section className="simple-page-hero"><p className="store-eyebrow">CREWWW / OPERATIONS</p><h1>System <em>status.</em></h1><p className="page-hero-copy">Private diagnostics for authorized store administrators.</p></section>
    {!API_MODE ? <section className="empty-commerce-state"><span>API MODE REQUIRED</span><h2>Diagnostics are<br /><em>not connected.</em></h2><p>Start the local API-backed environment to inspect live service checks.</p></section>
      : user?.role !== 'admin' ? <section className="empty-commerce-state"><span>ADMIN ACCESS REQUIRED</span><h2>This page is<br /><em>restricted.</em></h2><p>Sign in with an administrator account to view system diagnostics.</p><Link className="primary-store-button" to="/login">SIGN IN ↗</Link></section>
        : query.isPending ? <div className="catalog-skeleton" role="status" aria-busy="true">CHECKING LOCAL SERVICES…</div>
          : query.isError ? <section className="catalog-empty" role="alert"><span>STATUS CHECK FAILED</span><p>{query.error instanceof Error ? query.error.message : 'The diagnostics endpoint is unavailable.'}</p><button type="button" onClick={() => void query.refetch()}>RETRY ↗</button></section>
            : query.data && <>
              <section className="admin-status-overview"><div><span>ENVIRONMENT</span><strong>{query.data.environment}</strong></div><div><span>FRONTEND</span><strong>{query.data.frontend_backend_connectivity.frontend}</strong></div><div><span>BACKEND API</span><strong>{query.data.frontend_backend_connectivity.backend}</strong></div><div><span>LAST CHECK</span><strong>{new Date(query.data.checked_at).toLocaleString()}</strong></div></section>
              <section className="admin-service-grid" aria-label="Service status">{Object.entries(query.data.services).map(([name, service]) => <article className={`admin-service-card status-${service.status}`} key={name}><span>{name.replaceAll('_', ' ')}</span><strong>{service.status.replaceAll('_', ' ')}</strong>{service.mode && <small>Mode: {service.mode}</small>}</article>)}</section>
              <section className="admin-warnings"><div className="catalog-route-heading"><p className="store-eyebrow">CONFIGURATION / HEALTH WARNINGS</p><span>{query.data.warnings.length} ITEMS</span></div>{query.data.warnings.length ? <ul>{query.data.warnings.map((warning) => <li key={warning.code}><strong>{warning.code}</strong><span>{warning.message}</span></li>)}</ul> : <p>No configuration warnings reported.</p>}</section>
              <p className="admin-diagnostics-note">This dashboard reports service state and safe warning codes only. It never returns environment values, connection strings, passwords, API keys or tokens.</p>
            </>}
  </div>;
}
