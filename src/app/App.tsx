import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { catalogRoutes } from '../data/mock/storefront';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductPage } from '../features/catalog/ProductPage';
import { DesignSystemPage } from '../pages/DesignSystemPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ShowroomPage } from '../pages/ShowroomPage';
import { RequireAdmin } from './RequireAdmin';
import { SiteLayout } from './SiteLayout';
import { ErrorBoundary } from '../components/ErrorBoundary';
// (kept exported for route-level retries on other pages)

const DropPage = lazy(() => import('../pages/DropsPage').then((module) => ({ default: module.DropPage })));
const DropsIndexPage = lazy(() => import('../pages/DropsPage').then((module) => ({ default: module.DropsIndexPage })));
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));

// Secondary journeys are code-split so the first storefront paint stays light.
const commerce = <T,>(load: (module: typeof import('../pages/CommercePages')) => T) => import('../pages/CommercePages').then((module) => ({ default: load(module) }));
const content = <T,>(load: (module: typeof import('../pages/ContentPages')) => T) => import('../pages/ContentPages').then((module) => ({ default: load(module) }));
const AccountPage = lazy(() => commerce((module) => module.AccountPage));
const AuthPage = lazy(() => commerce((module) => module.AuthPage));
const CartPage = lazy(() => commerce((module) => module.CartPage));
const CheckoutPage = lazy(() => commerce((module) => module.CheckoutPage));
const OrderConfirmationPage = lazy(() => commerce((module) => module.OrderConfirmationPage));
const WishlistPage = lazy(() => commerce((module) => module.WishlistPage));
const AboutPage = lazy(() => content((module) => module.AboutPage));
const ContactPage = lazy(() => content((module) => module.ContactPage));
const DenimFitsPage = lazy(() => content((module) => module.DenimFitsPage));
const EditorialDetailPage = lazy(() => content((module) => module.EditorialDetailPage));
const FAQPage = lazy(() => content((module) => module.FAQPage));
const LookbookIndexPage = lazy(() => content((module) => module.LookbookIndexPage));
const PolicyPage = lazy(() => content((module) => module.PolicyPage));
const StoreFinderPage = lazy(() => content((module) => module.StoreFinderPage));
const SupportPage = lazy(() => content((module) => module.SupportPage));
const AdminSystemPage = lazy(() => import('../pages/AdminSystemPage').then((module) => ({ default: module.AdminSystemPage })));
const SearchPage = lazy(() => import('../features/catalog/SearchPage').then((module) => ({ default: module.SearchPage })));
const PsychedelicDropPage = lazy(() => import('../pages/PsychedelicDropPage').then((module) => ({ default: module.PsychedelicDropPage })));

export function App() {
  const location = useLocation();
  // Docker preview defaults to the Psychedelic Minds drop; local dev uses the showroom.
  const initialRoute = import.meta.env.VITE_INITIAL_ROUTE;
  const showInitialRoute = initialRoute && location.pathname === '/';
  return <Suspense fallback={<div className="catalog-skeleton" role="status">OPENING CREWWW…</div>}><Routes>
    <Route element={<SiteLayout />}>
      <Route
        index
        element={showInitialRoute ? <Navigate to={initialRoute} replace /> : <ShowroomPage />}
      />
      {catalogRoutes.map((route) => <Route key={route.path} path={route.path.slice(1)} element={<CatalogPage route={route} />} />)}
      <Route path="search" element={<SearchPage />} />
      <Route path="products/:slug" element={<ProductPage />} />
      <Route path="denim/fits" element={<DenimFitsPage />} />
      <Route path="denim/fits/:fitSlug" element={<DenimFitsPage detail />} />
      <Route path="drops" element={<DropsIndexPage />} />
      <Route path="drops/psychedelic-minds" element={<PsychedelicDropPage />} />
      <Route path="drops/:slug" element={<DropPage />} />
      <Route path="lookbook" element={<LookbookIndexPage />} />
      <Route path="lookbook/:slug" element={<EditorialDetailPage />} />
      <Route path="looks/:slug" element={<EditorialDetailPage shoppable />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="find-stores" element={<StoreFinderPage />} />
      <Route path="find-stores/:storeSlug" element={<StoreFinderPage detail />} />
      <Route path="contact" element={<ContactPage />} />
      <Route path="support" element={<SupportPage />} />
      <Route path="faq" element={<FAQPage />} />
      <Route path="shipping" element={<PolicyPage kind="shipping" />} />
      <Route path="returns" element={<PolicyPage kind="returns" />} />
      <Route path="policies/privacy" element={<PolicyPage kind="privacy" />} />
      <Route path="policies/terms" element={<PolicyPage kind="terms" />} />
      <Route path="wishlist" element={<WishlistPage />} />
      <Route path="cart" element={<CartPage />} />
      <Route path="checkout" element={<CheckoutPage />} />
      <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
      <Route path="login" element={<AuthPage mode="login" />} />
      <Route path="register" element={<AuthPage mode="register" />} />
      <Route path="forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="account" element={<AccountPage />} />
      <Route path="account/profile" element={<AccountPage section="profile" />} />
      <Route path="account/addresses" element={<AccountPage section="addresses" />} />
      <Route path="account/orders" element={<AccountPage section="orders" />} />
      <Route path="account/orders/:orderId" element={<AccountPage section="order-detail" />} />
      <Route element={<RequireAdmin />}>
        <Route path="admin" element={<AdminDashboardPage />} />
        <Route path="admin/system" element={<AdminSystemPage />} />
      </Route>
      <Route path="concept" element={<Navigate to="/about" replace />} />
      <Route path="design-system" element={<DesignSystemPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></Suspense>;
}
