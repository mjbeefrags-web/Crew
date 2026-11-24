import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { API_MODE } from '../config/runtime';
import { useAuthStore } from '../state/authStore';

/** Frontend UX gate only; the API remains the authority on admin access. */
export function RequireAdmin() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!API_MODE) return <Outlet />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') return <div className="storefront-page">
    <section className="empty-commerce-state"><span>ADMIN ACCESS REQUIRED</span><h2>This console is<br /><em>restricted.</em></h2><p>Sign in with an administrator account to see store performance.</p><Link className="primary-store-button" to="/login">SIGN IN ↗</Link></section>
  </div>;

  return <Outlet />;
}
