import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { catalogService, commerceService } from '../app/services';
import { ProductCard } from '../components/ProductCard';
import { useCommerceStore } from '../state/commerceStore';
import { useUiStore } from '../state/uiStore';
import { API_MODE } from '../config/runtime';
import { apiCommerceService } from '../services/apiCommerceService';
import { apiAuthService } from '../services/apiAuthService';
import { useAuthStore } from '../state/authStore';
import { formatCurrency } from '../utils/formatCurrency';

export function CartPage() {
  const cartLines = useCommerceStore((state) => state.cartLines);
  const setLineQuantity = useCommerceStore((state) => state.setLineQuantity);
  const removeCartLine = useCommerceStore((state) => state.removeCartLine);
  const productsQuery = useQuery({ queryKey: ['cart-products'], queryFn: () => catalogService.listProducts({ pageSize: 48 }) });
  const [promotionInput, setPromotionInput] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const showNotice = useUiStore((state) => state.showNotice);
  const products = productsQuery.data?.items ?? [];
  const calculatedTotals = commerceService.calculateCartTotals(cartLines, products, API_MODE ? '' : promotionCode);
  const totals = API_MODE ? { ...calculatedTotals, delivery: calculatedTotals.subtotal === 0 || calculatedTotals.subtotal >= 100 ? 0 : 7, discount: 0, total: calculatedTotals.subtotal + (calculatedTotals.subtotal === 0 || calculatedTotals.subtotal >= 100 ? 0 : 7), promotionAccepted: false } : calculatedTotals;

  return <div className="storefront-page cart-page"><section className="simple-page-hero"><p className="store-eyebrow">CREWWW / YOUR SELECTION</p><h1>The <em>bag.</em></h1><p className="page-hero-copy">A local preview basket. Availability and payment are not connected to a live store.</p></section>
    {cartLines.length === 0 ? <section className="empty-commerce-state"><span>THE BAG IS OPEN</span><h2>Something good<br /><em>will find its way in.</em></h2><p>Your saved pieces will appear here.</p><Link className="primary-store-button" to="/shop">CONTINUE EXPLORING ↗</Link></section> : <section className="cart-page-layout"><div className="cart-page-lines"><div className="cart-page-heading"><span>PIECE / OPTIONS</span><span>PRICE / QTY</span></div>{cartLines.map((line, index) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return <div className="cart-preview-line" key={`${line.productId}-${index}`}><p>This saved item is no longer in the sample catalog.</p><button type="button" onClick={() => removeCartLine(index)}>REMOVE</button></div>;
      return <article className="cart-preview-line" key={`${line.productId}-${line.size}-${line.color}`}><Link to={`/products/${product.slug}`} className="cart-preview-image">{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <span>CREWWW</span>}</Link><div className="cart-preview-description"><Link to={`/products/${product.slug}`}>{product.name}</Link><span>{line.color} / {line.size}</span>{product.isPreviewData && <small>DEMO PRODUCT</small>}<button type="button" onClick={() => removeCartLine(index)}>REMOVE PIECE ×</button></div><div className="cart-preview-price"><strong>{formatCurrency((product.salePrice ?? product.price) * line.quantity, product.currency)}</strong><div className="cart-quantity-control"><button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => setLineQuantity(index, line.quantity - 1)}>−</button><span>{line.quantity}</span><button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => setLineQuantity(index, line.quantity + 1)}>+</button></div></div></article>;
    })}</div><aside className="cart-order-summary"><p className="store-eyebrow">ORDER PREVIEW / USD</p><h2>At a glance.</h2><div><span>SUBTOTAL</span><strong>{formatCurrency(totals.subtotal, totals.currency)}</strong></div><div><span>ESTIMATED DELIVERY</span><strong>{totals.delivery ? formatCurrency(totals.delivery, totals.currency) : 'SAMPLE FREE DELIVERY'}</strong></div>{totals.discount > 0 && <div><span>DEMO PROMOTION / 10%</span><strong>−{formatCurrency(totals.discount, totals.currency)}</strong></div>}<p className="cart-shipping-note">Delivery threshold and charges are sample values only.</p><form className="promotion-form" onSubmit={(event) => { event.preventDefault(); setPromotionCode(promotionInput); if (promotionInput.trim()) showNotice(promotionInput.trim().toUpperCase() === 'CREWWW10' ? 'Demo code applied.' : 'That demo code is not recognized.'); }}><label htmlFor="promotion-code">PROMO CODE / DEMO: CREWWW10</label><div><input id="promotion-code" value={promotionInput} onChange={(event) => setPromotionInput(event.target.value)} placeholder="Enter a code"/><button type="submit">APPLY</button></div>{promotionCode && !totals.promotionAccepted && <small role="alert">This preview code is not recognized.</small>}</form><div className="cart-total"><span>TOTAL / ESTIMATE</span><strong>{formatCurrency(totals.total, totals.currency)}</strong></div><Link className="primary-store-button checkout-link" to="/checkout">CONTINUE TO CHECKOUT ↗</Link><p className="checkout-disclaimer">No payment will be taken. Checkout creates a local demonstration order only.</p><Link to="/shop" className="text-link">KEEP LOOKING ↗</Link></aside></section>}
    {cartLines.length > 0 && <section className="cart-recommendations"><div className="catalog-route-heading"><p className="store-eyebrow">ANOTHER LOOK / RECENT PIECES</p><Link to="/new-arrivals">NEW ARRIVALS ↗</Link></div>{products.filter((product) => !cartLines.some((line) => line.productId === product.id)).slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</section>}
  </div>;
}

export function WishlistPage() {
  const wishlist = useCommerceStore((state) => state.wishlist);
  const productsQuery = useQuery({ queryKey: ['wishlist-products', wishlist], queryFn: () => catalogService.listProducts({ pageSize: 48 }) });
  const products = productsQuery.data?.items.filter((product) => wishlist.includes(product.id)) ?? [];
  return <div className="storefront-page"><section className="simple-page-hero"><p className="store-eyebrow">CREWWW / YOUR SAVED PIECES</p><h1>The <em>shortlist.</em></h1><p className="page-hero-copy">Pieces you want to come back to, stored in this browser preview.</p></section>{productsQuery.isPending ? <div className="catalog-skeleton" role="status">LOADING SAVED PIECES…</div> : products.length ? <section className="wishlist-grid store-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</section> : <section className="empty-commerce-state"><span>NOTHING SAVED YET</span><h2>Keep an eye<br /><em>on what you like.</em></h2><Link className="primary-store-button" to="/new-arrivals">FIND A PIECE ↗</Link></section>}</div>;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const cartLines = useCommerceStore((state) => state.cartLines);
  const clearCart = useCommerceStore((state) => state.clearCart);
  const productsQuery = useQuery({ queryKey: ['checkout-products'], queryFn: () => catalogService.listProducts({ pageSize: 48 }) });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'mock-card' | 'pay-on-delivery'>('mock-card');
  const products = productsQuery.data?.items ?? [];
  const subtotal = commerceService.calculateCartTotals(cartLines, products).subtotal;
  const deliveryCost = cartLines.length === 0 ? 0 : delivery === 'express' ? 16 : subtotal >= 100 ? 0 : 8;
  const total = subtotal + deliveryCost;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!cartLines.length) { setError('Your bag is empty. Add a piece before continuing.'); return; }
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setBusy(true);
    const data = new FormData(form);
    const email = String(data.get('email') ?? '').trim();
    try {
      const shipping = {
        first_name: String(data.get('firstName') ?? '').trim(),
        last_name: String(data.get('lastName') ?? '').trim(),
        email,
        address_line1: String(data.get('address') ?? '').trim(),
        city: String(data.get('city') ?? '').trim(),
        postal_code: String(data.get('postcode') ?? '').trim(),
        country_code: String(data.get('country') ?? '').slice(0, 2).toUpperCase(),
      };
      const record = API_MODE
        ? await apiCommerceService.checkout(cartLines, shipping, delivery, paymentMethod)
        : await commerceService.createDemoOrder({ email, lines: [...cartLines], subtotal, delivery: deliveryCost, discount: 0, total, currency: products[0]?.currency ?? 'USD', paymentMethod });
      clearCart();
      navigate(`/order-confirmation/${record.id}`);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not be completed. Please try again.');
    } finally { setBusy(false); }
  };

  if (cartLines.length === 0 && !busy) return <div className="storefront-page"><section className="simple-page-hero"><p className="store-eyebrow">CREWWW / CHECKOUT</p><h1>Nothing to <em>check out.</em></h1><p className="page-hero-copy">Your bag is empty. This demo does not reserve inventory.</p><Link to="/shop" className="primary-store-button">RETURN TO THE SHOP ↗</Link></section></div>;

  return <div className="storefront-page checkout-page"><div className="checkout-progress"><span>01 / DETAILS</span><i/><span>02 / DELIVERY</span><i/><span>03 / REVIEW</span><b>{API_MODE ? 'MOCK PAYMENT' : 'DEMO ONLY'}</b></div><div className="simple-page-hero checkout-intro"><p className="store-eyebrow">CREWWW / SECURE PREVIEW</p><h1>Make it <em>yours.</em></h1><p className="page-hero-copy">{API_MODE ? 'Your order and stock are validated by the local store API. Payment is simulated; nothing is charged or shipped.' : 'Complete the form to create a local demonstration order. No payment or shipment will occur.'}</p></div><form className="checkout-layout" onSubmit={submit}>
    <div className="checkout-fields"><fieldset><legend>01 / YOUR DETAILS</legend><div className="checkout-field-grid"><label>FIRST NAME<input name="firstName" autoComplete="given-name" required /></label><label>LAST NAME<input name="lastName" autoComplete="family-name" required /></label><label className="full-width">EMAIL<input type="email" name="email" autoComplete="email" required /></label><label className="full-width">PHONE / OPTIONAL<input type="tel" name="phone" autoComplete="tel" /></label></div></fieldset>
      <fieldset><legend>02 / DELIVERY ADDRESS</legend><div className="checkout-field-grid"><label className="full-width">ADDRESS<input name="address" autoComplete="street-address" required /></label><label>CITY / REGION<input name="city" autoComplete="address-level2" required /></label><label>POSTCODE<input name="postcode" autoComplete="postal-code" /></label><label className="full-width">COUNTRY / SAMPLE<select name="country" defaultValue="" required><option value="" disabled>Select a country</option><option value="US">United States / sample</option><option value="GB">United Kingdom / sample</option><option value="EG">Egypt / sample</option></select></label></div><p className="checkout-disclaimer">Address handling and delivery values are local development data. No shipping provider is connected.</p></fieldset>
      <fieldset><legend>03 / DELIVERY OPTION</legend><label className="checkout-choice"><input type="radio" name="delivery" checked={delivery === 'standard'} onChange={() => setDelivery('standard')} /><span><strong>Standard / sample estimate</strong><small>3–5 business days / {subtotal >= 100 ? 'complimentary sample' : '$7 sample'}</small></span></label><label className="checkout-choice"><input type="radio" name="delivery" checked={delivery === 'express'} onChange={() => setDelivery('express')} /><span><strong>Express / sample estimate</strong><small>1–2 business days / $16 sample</small></span></label></fieldset>
      <fieldset><legend>04 / PAYMENT PREVIEW</legend><label className="checkout-choice"><input type="radio" name="paymentMethod" checked={paymentMethod === 'mock-card'} onChange={() => setPaymentMethod('mock-card')} /><span><strong>Mock card</strong><small>No card details are requested or stored.</small></span></label><label className="checkout-choice"><input type="radio" name="paymentMethod" checked={paymentMethod === 'pay-on-delivery'} onChange={() => setPaymentMethod('pay-on-delivery')} /><span><strong>Pay on delivery / mock</strong><small>Selection only; no real fulfillment is connected.</small></span></label></fieldset>
    </div><aside className="checkout-summary"><p className="store-eyebrow">YOUR ORDER / {cartLines.reduce((sum, line) => sum + line.quantity, 0)} PIECES</p><h2>Order preview.</h2>{cartLines.map((line) => { const product = products.find((item) => item.id === line.productId); return product ? <div className="checkout-line" key={`${line.productId}-${line.size}-${line.color}`}><span>{line.quantity} × {product.name}<small>{line.color} / {line.size}</small></span><strong>{formatCurrency((product.salePrice ?? product.price) * line.quantity, product.currency)}</strong></div> : null; })}<div className="checkout-total-line"><span>SUBTOTAL</span><strong>{formatCurrency(subtotal, products[0]?.currency ?? 'USD')}</strong></div><div className="checkout-total-line"><span>DELIVERY / ESTIMATE</span><strong>{deliveryCost ? formatCurrency(deliveryCost, products[0]?.currency ?? 'USD') : 'SAMPLE FREE'}</strong></div><div className="checkout-total-line grand-total"><span>DEMO TOTAL</span><strong>{formatCurrency(total, products[0]?.currency ?? 'USD')}</strong></div>{error && <p className="form-message" role="alert">{error}</p>}<button className="primary-store-button" type="submit" disabled={busy}>{busy ? 'CREATING PREVIEW…' : 'PLACE DEMO ORDER ↗'}</button><p className="checkout-disclaimer">This button creates a locally stored demo receipt. It does not process a payment.</p></aside>
    </form></div>;
}

export function OrderConfirmationPage() {
  const { orderId = '' } = useParams();
  const orderQuery = useQuery({ queryKey: ['demo-order', orderId], queryFn: () => API_MODE ? apiCommerceService.getOrder(orderId) : commerceService.getDemoOrder(orderId) });
  const order = orderQuery.data;
  return <div className="storefront-page order-confirmation-page"><section className="order-confirmation-card"><span className="order-confirmation-mark">✓</span><p className="store-eyebrow">CREWWW / {API_MODE ? 'LOCAL ORDER SERVICE' : 'LOCAL DEMONSTRATION'}</p><h1>It’s in the <em>preview.</em></h1>{orderQuery.isPending ? <p role="status">Loading the order…</p> : order ? <><p>{API_MODE ? 'The local store created your order and ran the mock payment flow. No charge or shipment was made.' : `Demo order ${order.id} has been saved in this browser. No payment or delivery was initiated.`}</p><div className="confirmation-summary">{order.lines.map((line, index) => <span key={`${line.productId}-${index}`}>{line.quantity} × {line.productId} / {line.color} / {line.size}</span>)}<b>TOTAL / {formatCurrency(order.total, order.currency)}</b></div><Link className="primary-store-button" to={API_MODE ? '/account/orders' : `/account/orders/${order.id}`}>VIEW {API_MODE ? 'ORDERS' : 'DEMO ORDER'} ↗</Link></> : <><p>This order is not available in the current session.</p><Link className="text-link" to="/shop">RETURN TO THE SHOP ↗</Link></>}</section></div>;
}

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const title = mode === 'register' ? 'Make a little room.' : mode === 'forgot' ? 'Find your way back.' : 'Welcome back.';
  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const email = String(values.get('email') ?? '').trim().toLowerCase();
    if (mode === 'forgot') {
      setMessage(API_MODE ? 'Password recovery is not enabled until a verified email delivery service is configured.' : `Password recovery preview for ${email}. No email was sent.`);
      return;
    }
    if (API_MODE) {
      setBusy(true);
      try {
        if (mode === 'register') await apiAuthService.register(email, String(values.get('password') ?? ''), String(values.get('firstName') ?? ''), String(values.get('lastName') ?? ''));
        else await apiAuthService.login(email, String(values.get('password') ?? ''));
        try { useCommerceStore.getState().setRemoteCart(await apiCommerceService.getCart()); } catch { /* Keep the authenticated session; the cart view will retry. */ }
        try { useCommerceStore.getState().setRemoteWishlist(await apiCommerceService.getWishlist()); } catch { /* A new account may not have a wishlist yet. */ }
        navigate('/account');
      } catch (authError) { setMessage(authError instanceof Error ? authError.message : 'Account request failed.'); }
      finally { setBusy(false); }
      return;
    }
    try { window.localStorage.setItem('crewww-demo-session', JSON.stringify({ email, previewOnly: true })); } catch { /* in-memory navigation still works */ }
    setMessage('Demo account saved in this browser. No real account was created.');
    navigate('/account');
  };
  return <div className="storefront-page auth-page"><section className="auth-panel"><p className="store-eyebrow">CREWWW / YOUR ACCOUNT</p><h1>{title.split(' ').slice(0, -1).join(' ')} <em>{title.split(' ').at(-1)}</em></h1><p>{API_MODE ? 'Local API accounts use hashed passwords and revocable sessions. Email verification is not configured.' : 'Account actions in this milestone are a local frontend preview, not verified identity or account services.'}</p><form onSubmit={(event) => void onSubmit(event)}>{mode === 'register' && <><label>FIRST NAME<input type="text" name="firstName" autoComplete="given-name" required /></label><label>LAST NAME<input type="text" name="lastName" autoComplete="family-name" required /></label></>}<label>EMAIL<input type="email" name="email" autoComplete="email" required /></label>{mode !== 'forgot' && <label>PASSWORD<input type="password" name="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={API_MODE ? 12 : 8} required /></label>}{message && <p role="status" className="form-message">{message}</p>}<button className="primary-store-button" type="submit" disabled={busy}>{busy ? 'WORKING…' : mode === 'register' ? (API_MODE ? 'CREATE ACCOUNT' : 'CREATE DEMO ACCOUNT') : mode === 'forgot' ? 'REQUEST RECOVERY' : (API_MODE ? 'SIGN IN' : 'SIGN IN TO PREVIEW')} ↗</button></form><div className="auth-links">{mode !== 'login' && <Link to="/login">Sign in</Link>}{mode !== 'register' && <Link to="/register">Create account</Link>}{mode !== 'forgot' && <Link to="/forgot-password">Forgot password?</Link>}</div></section></div>;
}

export function AccountPage({ section = 'overview' }: { section?: 'overview' | 'profile' | 'addresses' | 'orders' | 'order-detail' }) {
  const [session, setSession] = useState(() => { try { return JSON.parse(window.localStorage.getItem('crewww-demo-session') ?? 'null') as { email?: string } | null; } catch { return null; } });
  const authUser = useAuthStore((state) => state.user);
  const currentEmail = API_MODE ? authUser?.email : session?.email;
  const ordersQuery = useQuery({ queryKey: ['account-orders'], queryFn: () => API_MODE ? apiCommerceService.listOrders() : commerceService.listDemoOrders(), enabled: Boolean(currentEmail) && (section === 'orders' || section === 'overview' || section === 'order-detail') });
  const { orderId = '' } = useParams();
  const orderQuery = useQuery({ queryKey: ['account-order', orderId], queryFn: () => API_MODE ? apiCommerceService.getOrder(orderId) : commerceService.getDemoOrder(orderId), enabled: section === 'order-detail' && Boolean(orderId) && Boolean(currentEmail) });
  if (!currentEmail) return <div className="storefront-page account-page"><section className="simple-page-hero"><p className="store-eyebrow">CREWWW / ACCOUNT</p><h1>Your place<br /><em>in the crew.</em></h1><p className="page-hero-copy">Sign in to view your profile and order history.</p><Link className="primary-store-button" to="/login">SIGN IN ↗</Link></section><div className="account-auth-links"><Link to="/register">CREATE ACCOUNT</Link></div></div>;

  const signOut = () => { if (API_MODE) { void apiAuthService.logout(); useAuthStore.getState().clearSession(); useCommerceStore.getState().setRemoteWishlist([]); useCommerceStore.getState().setRemoteCart([]); } else { window.localStorage.removeItem('crewww-demo-session'); setSession(null); } };
  const profileContent = section === 'profile' ? <section className="account-card"><p className="store-eyebrow">PROFILE / LOCAL ONLY</p><h2>Your details.</h2><form onSubmit={(event) => { event.preventDefault(); useUiStore.getState().showNotice('Profile preview saved in this browser.'); }}><label>EMAIL<input type="email" defaultValue={currentEmail} /></label><label>DISPLAY NAME<input placeholder="Add a display name" /></label><button className="primary-store-button">SAVE DEMO PROFILE</button></form></section>
    : section === 'addresses' ? <section className="account-card"><p className="store-eyebrow">ADDRESS BOOK / LOCAL ONLY</p><h2>Saved places.</h2><p>Addresses entered at demo checkout are not synchronized here. No address book service is connected.</p><Link className="text-link" to="/checkout">ADD AN ADDRESS IN CHECKOUT ↗</Link></section>
      : section === 'orders' ? <section className="account-card"><p className="store-eyebrow">ORDER HISTORY / PREVIEW</p><h2>Paper trail.</h2>{ordersQuery.data?.length ? <div className="account-order-list">{ordersQuery.data.map((order) => <Link key={order.id} to={`/account/orders/${order.id}`}><span>{order.id}<small>{new Date(order.createdAt).toLocaleDateString()}</small></span><strong>{formatCurrency(order.total, order.currency)} ↗</strong></Link>)}</div> : <p>No demo orders are saved in this browser yet.</p>}</section>
        : section === 'order-detail' ? <section className="account-card"><p className="store-eyebrow">ORDER DETAIL / PREVIEW</p><h2>{orderQuery.data?.id ?? 'Order not found.'}</h2>{orderQuery.data ? <><p>Local demo status: {orderQuery.data.status}. No payment was made.</p>{orderQuery.data.lines.map((line, index) => <p key={`${line.productId}-${index}`}>{line.quantity} × {line.productId} / {line.size} / {line.color}</p>)}<strong>{formatCurrency(orderQuery.data.total, orderQuery.data.currency)}</strong></> : <Link to="/account/orders">BACK TO ORDERS ↗</Link>}</section>
          : <section className="account-card"><p className="store-eyebrow">GOOD TO SEE YOU / {API_MODE ? 'LOCAL API ACCOUNT' : 'DEMO MODE'}</p><h2>{currentEmail}</h2><p>{API_MODE ? 'You are signed in to this development API. Profile edits, saved addresses and verified email are not available yet.' : 'This session exists only in local browser storage. There is no verified login.'}</p><div className="account-dashboard-links"><Link to="/account/profile">PROFILE ↗</Link><Link to="/account/addresses">ADDRESSES ↗</Link><Link to="/account/orders">ORDER HISTORY ↗</Link><Link to="/wishlist">SAVED PIECES ↗</Link></div><button type="button" onClick={signOut}>SIGN OUT ↗</button></section>;

  return <div className="storefront-page account-page"><section className="simple-page-hero compact"><p className="store-eyebrow">CREWWW / YOUR PLACE</p><h1>The <em>crew.</em></h1><p className="page-hero-copy">A locally simulated account area for M3 review.</p></section><div className="account-layout"><nav className="account-nav" aria-label="Account navigation"><Link to="/account">Overview</Link><Link to="/account/profile">Profile</Link><Link to="/account/addresses">Addresses</Link><Link to="/account/orders">Orders</Link><button type="button" onClick={signOut}>Sign out</button></nav>{profileContent}</div></div>;
}

