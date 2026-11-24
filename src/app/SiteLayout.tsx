import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { ExperienceLayer } from '../components/ExperienceLayer';
import { SiteSoundToggle } from '../components/SiteSoundToggle';
import { Toast } from '../components/Toast';
import { useCommerceStore } from '../state/commerceStore';
import { useUiStore } from '../state/uiStore';
import { useAuthStore } from '../state/authStore';
import { API_MODE } from '../config/runtime';
import { apiCommerceService } from '../services/apiCommerceService';
import { apiAuthService } from '../services/apiAuthService';

const shopColumns = [
  { label: 'THE EDIT', links: [['Shop all', '/shop'], ['New arrivals', '/new-arrivals'], ['Best sellers', '/best-sellers'], ['Current drops', '/drops']] },
  { label: 'CLOTHES / TOPS', links: [['All tops', '/clothes/tops'], ['T-shirts', '/clothes/t-shirts'], ['Hoodies', '/clothes/hoodies'], ['Sweatshirts', '/clothes/sweatshirts'], ['Shirts', '/clothes/shirts'], ['Jackets', '/clothes/jackets']] },
  { label: 'CLOTHES / BOTTOMS', links: [['All bottoms', '/clothes/bottoms'], ['Denim & fits', '/denim'], ['Trousers', '/clothes/trousers'], ['Shorts', '/clothes/shorts'], ['Kids', '/kids']] },
  { label: 'FINISHING PIECES', links: [['Accessories', '/accessories'], ['Shoes', '/shoes'], ['Lookbook', '/lookbook'], ['About Crewww', '/about'], ['Find stores', '/find-stores']] },
] as const;

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'shop' | 'clothes' | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  // Move keyboard focus to the main landmark when the route changes, so
  // screen-reader and keyboard users start each page in a predictable place.
  useEffect(() => {
    const id = window.setTimeout(() => mainRef.current?.focus({ preventScroll: true }), 50);
    return () => window.clearTimeout(id);
  }, [location.pathname]);
  const bagLines = useCommerceStore((state) => state.cartLines);
  const bagCount = bagLines.reduce((total, line) => total + line.quantity, 0);
  const notice = useUiStore((state) => state.notice);
  const user = useAuthStore((state) => state.user);
  const clearNotice = useUiStore((state) => state.clearNotice);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isTrip = location.pathname === '/drops/psychedelic-minds';

  useEffect(() => {
    if (!API_MODE) return;
    let mounted = true;
    const onApiError = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message;
      useUiStore.getState().showNotice(message || 'The store could not be reached.');
    };
    window.addEventListener('crewww:api-error', onApiError);
    const hydrate = async () => {
      try { const lines = await apiCommerceService.getCart(); if (mounted) useCommerceStore.getState().setRemoteCart(lines); }
      catch { /* Page queries surface connectivity errors where the user needs them. */ }
      const user = await apiAuthService.currentUser();
      if (mounted && user) {
        try { useCommerceStore.getState().setRemoteWishlist(await apiCommerceService.getWishlist()); }
        catch { /* The server remains authoritative; anonymous sessions have no wishlist. */ }
      }
    };
    void hydrate();
    return () => { mounted = false; window.removeEventListener('crewww:api-error', onApiError); };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setActiveMenu(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const nodes = () => document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)');
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      nodes().forEach((node) => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    const watch = () => nodes().forEach((node) => observer.observe(node));
    watch();
    const mutations = new MutationObserver(watch);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setActiveMenu(null);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const openShop = () => {
    if (isHome) {
      setMenuOpen(false);
      setActiveMenu(null);
      document.getElementById('collection')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } else navigate('/shop');
  };

  return <>
    <a className="skip-link" href="#main-content">SKIP TO CONTENT</a>
    <ExperienceLayer />
    {!isTrip && <div className="ambient-layer" aria-hidden="true"><i /><i /><i /></div>}
    <div className="announcement"><span>CREWWW / MAKE YOUR OWN FREQUENCY</span><i aria-hidden="true">·</i><Link className="announcement-trip" to="/drops/psychedelic-minds">PSYCHEDELIC MINDS / ENTER THE ROOM ↗</Link><i aria-hidden="true">·</i><span>DEVELOPMENT PREVIEW / COMMERCE DATA IS SAMPLE ONLY</span></div>
    <header className={`site-header${menuOpen ? ' has-open-menu' : ''}`} onMouseLeave={() => setActiveMenu(null)}>
      <button ref={menuButtonRef} className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => { setMenuOpen((open) => !open); setActiveMenu(null); }}><span>{menuOpen ? 'CLOSE' : 'MENU'}</span><span className={`menu-glyph${menuOpen ? ' is-open' : ''}`} aria-hidden="true"><i /><i /></span></button>
      <nav className="primary-navigation desktop-navigation" aria-label="Primary navigation">
        <button type="button" onClick={openShop}>THE EDIT</button>
        <NavLink to="/new-arrivals">NEW ARRIVALS</NavLink>
        <NavLink to="/kids">KIDS</NavLink>
        <NavLink to="/denim">DENIM</NavLink>
        <button type="button" aria-expanded={activeMenu === 'shop'} onClick={() => setActiveMenu(activeMenu === 'shop' ? null : 'shop')} onMouseEnter={() => setActiveMenu('shop')}>CLOTHES <span aria-hidden="true">⌄</span></button>
        <NavLink to="/drops">DROPS</NavLink>
        <NavLink className="desktop-trip-link" to="/drops/psychedelic-minds">PSYCHEDELIC</NavLink>
        <NavLink className="desktop-story-link" to="/lookbook">STORIES</NavLink>
      </nav>
      <Link className="brand-link" to="/" aria-label="Crewww home"><BrandMark /></Link>
      <nav className="header-actions" aria-label="Shopping utilities">
        <SiteSoundToggle />
        {(!API_MODE || user?.role === 'admin') && <Link className="header-admin-link" to="/admin" aria-label="Owner console">{API_MODE ? 'ADMIN' : 'ADMIN DEMO'}</Link>}
        <Link to="/search" aria-label="Search Crewww">SEARCH</Link>
        <Link className="header-utility-account" to="/account">ACCOUNT</Link>
        <Link className="header-utility-wishlist" to="/wishlist" aria-label="Wishlist">SAVED</Link>
        <Link to="/cart" aria-label={`Shopping bag, ${bagCount} items`}>BAG <span className="bag-count">{bagCount}</span></Link>
      </nav>
      {activeMenu && <div className="mega-menu" role="region" aria-label={`${activeMenu === 'shop' ? 'Shop' : 'Clothes'} categories`} onMouseEnter={() => setActiveMenu(activeMenu)}>
        <div className="mega-menu-heading"><div><span>CREWWW / THE CITY EDIT</span><h2>Find your <em>next layer.</em></h2></div><button type="button" aria-label="Close categories" onClick={() => setActiveMenu(null)}>×</button></div>
        <div className="mega-menu-columns">{shopColumns.map((column) => <div key={column.label}><p>{column.label}</p>{column.links.map(([label, to]) => <Link key={to} to={to}>{label}<span>↗</span></Link>)}</div>)}
          <Link className="mega-menu-image" to="/drops/psychedelic-minds" style={{ backgroundImage: 'url(/images/drops/psychedelic-minds/print-plates/01-out-of-focus-dtg-back-print.webp)' }}><span>PSYCHEDELIC MINDS</span><strong>Enter the room ↗</strong></Link>
        </div>
      </div>}
    </header>
    {menuOpen && <div className="mobile-navigation-backdrop" onClick={() => setMenuOpen(false)}>
      <nav className="mobile-navigation" id="mobile-navigation" aria-label="Mobile navigation" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-navigation-top"><p>SHOP THE CREWWW WORLD</p><Link to="/search">SEARCH THE EDIT ↗</Link></div>
        <div className="mobile-navigation-links">
          {['Psychedelic drop', 'Shop all', 'New arrivals', 'Kids', 'Denim', 'Clothes', 'Drops', 'Best sellers', 'Accessories', 'Shoes', 'Lookbook', 'About', 'Find stores', 'Contact'].map((label) => {
            const path = ({ 'Psychedelic drop': '/drops/psychedelic-minds', 'Shop all': '/shop', 'New arrivals': '/new-arrivals', Kids: '/kids', Denim: '/denim', Clothes: '/clothes', Drops: '/drops', 'Best sellers': '/best-sellers', Accessories: '/accessories', Shoes: '/shoes', Lookbook: '/lookbook', About: '/about', 'Find stores': '/find-stores', Contact: '/contact' } as Record<string, string>)[label];
            return <Link key={path} to={path} onClick={() => setMenuOpen(false)}>{label}<span>↗</span></Link>;
          })}
        </div>
        <div className="mobile-navigation-bottom"><Link to="/account">ACCOUNT</Link><Link to="/wishlist">SAVED PIECES</Link><Link to="/cart">SHOPPING BAG · {bagCount}</Link>{(!API_MODE || user?.role === 'admin') && <Link to="/admin">{API_MODE ? 'ADMIN' : 'ADMIN DEMO'}</Link>}</div>
      </nav>
    </div>}
    <main id="main-content" ref={mainRef} tabIndex={-1}><Outlet /></main>
    <footer className="site-footer store-footer">
      <div className="store-footer-top"><div><BrandMark inverse /><p>Move your own way.<br /><em>Find your people.</em></p></div><div className="footer-newsletter-prompt"><span>CREWWW / NOTES FROM THE BLOCK</span><p>New drops, good stories, no noise.</p><Link to="/#newsletter">JOIN THE LIST ↗</Link></div></div>
      <div className="footer-link-groups">
        <div><span>SHOP</span><Link to="/shop">All pieces</Link><Link to="/new-arrivals">New arrivals</Link><Link to="/kids">Kids</Link><Link to="/denim">Denim</Link><Link to="/drops">Drops</Link><Link to="/best-sellers">Best sellers</Link></div>
        <div><span>THE WORLD</span><Link to="/lookbook">Lookbook</Link><Link to="/about">Our story</Link><Link to="/find-stores">Find stores</Link><Link to="/contact">Contact</Link></div>
        <div><span>HELP / PREVIEW</span><Link to="/support">Support</Link><Link to="/faq">FAQ</Link><Link to="/shipping">Shipping</Link><Link to="/returns">Returns</Link><Link to="/policies/privacy">Privacy</Link><Link to="/policies/terms">Terms</Link></div>
        <div><span>YOUR CREWWW</span><Link to="/account">Account</Link><Link to="/account/orders">Orders</Link><Link to="/wishlist">Wishlist</Link><Link to="/cart">Bag</Link>{(!API_MODE || user?.role === 'admin') && <Link to="/admin">{API_MODE ? 'Owner console' : 'Owner console · demo'}</Link>}</div>
      </div>
      <div className="footer-bottom"><span>© CREWWW STUDIO 2026</span><span>PRODUCT / PRICING / STORE DETAILS ARE PREVIEW DATA</span><Link to="/design-system">DESIGN NOTES ↗</Link></div>
    </footer>
    <Toast message={notice} onClose={clearNotice} />
  </>;
}
