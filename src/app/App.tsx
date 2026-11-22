import { Navigate, Route, Routes } from 'react-router-dom';
import { catalogRoutes } from '../data/mock/storefront';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { ProductPage } from '../features/catalog/ProductPage';
import { SearchPage } from '../features/catalog/SearchPage';
import { AccountPage, AuthPage, CartPage, CheckoutPage, OrderConfirmationPage, WishlistPage } from '../pages/CommercePages';
import { AboutPage, ContactPage, DenimFitsPage, EditorialDetailPage, FAQPage, LookbookIndexPage, PolicyPage, StoreFinderPage, SupportPage } from '../pages/ContentPages';
import { DesignSystemPage } from '../pages/DesignSystemPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ShowroomPage } from '../pages/ShowroomPage';
import { SiteLayout } from './SiteLayout';

export function App() {
  return <Routes>
    <Route element={<SiteLayout />}>
      <Route index element={<ShowroomPage />} />
      {catalogRoutes.map((route) => <Route key={route.path} path={route.path.slice(1)} element={<CatalogPage route={route} />} />)}
      <Route path="search" element={<SearchPage />} />
      <Route path="products/:slug" element={<ProductPage />} />
      <Route path="denim/fits" element={<DenimFitsPage />} />
      <Route path="denim/fits/:fitSlug" element={<DenimFitsPage detail />} />
      <Route path="drops" element={<LookbookIndexPage type="drop" />} />
      <Route path="drops/:slug" element={<EditorialDetailPage type="drop" />} />
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
      <Route path="concept" element={<Navigate to="/about" replace />} />
      <Route path="design-system" element={<DesignSystemPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>;
}
