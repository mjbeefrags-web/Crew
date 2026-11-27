import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { CartIcon } from "../components/CartIcon";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ExperienceLayer } from "../components/ExperienceLayer";
import { CommandPalette } from "../components/CommandPalette";
import { SiteSoundToggle } from "../components/SiteSoundToggle";
import { Toast } from "../components/Toast";
import { useCommerceStore } from "../state/commerceStore";
import { useUiStore } from "../state/uiStore";
import { useAuthStore } from "../state/authStore";
import { API_MODE } from "../config/runtime";
import { FEATURES } from "../config/features";
import { routeSeo } from "../config/seo";
import { useSeo } from "../lib/useSeo";
import { useDialogFocus } from "../lib/useDialogFocus";
import { apiCommerceService } from "../services/apiCommerceService";
import { apiAuthService } from "../services/apiAuthService";
import { psychedelicPieces } from "../data/psychedelic";

const shopColumns = [
  {
    label: "THE EDIT",
    links: [
      ["Shop all", "/shop"],
      ["New arrivals", "/new-arrivals"],
      ["Best sellers", "/best-sellers"],
      ["Current drops", "/drops"],
    ],
  },
  {
    label: "CLOTHES / TOPS",
    links: [
      ["All tops", "/clothes/tops"],
      ["T-shirts", "/clothes/t-shirts"],
      ["Hoodies", "/clothes/hoodies"],
      ["Sweatshirts", "/clothes/sweatshirts"],
      ["Shirts", "/clothes/shirts"],
      ["Jackets", "/clothes/jackets"],
    ],
  },
  {
    label: "CLOTHES / BOTTOMS",
    links: [
      ["All bottoms", "/clothes/bottoms"],
      ["Denim & fits", "/denim"],
      ["Trousers", "/clothes/trousers"],
      ["Shorts", "/clothes/shorts"],
      ["Kids", "/kids"],
    ],
  },
  {
    label: "FINISHING PIECES",
    links: [
      ["Accessories", "/accessories"],
      ["Shoes", "/shoes"],
      ["Lookbook", "/lookbook"],
      ["About Crewww", "/about"],
      ["Find stores", "/find-stores"],
    ],
  },
] as const;

const DEFAULT_WORLD_PALETTE = {
  a: "var(--lichen)",
  b: "#5e3d4f",
  c: "#115054",
};

type WorldPalette = typeof DEFAULT_WORLD_PALETTE;

function worldPaletteStyle(palette: WorldPalette): CSSProperties {
  const { a, b, c } = palette;
  return {
    "--world-a": a,
    "--world-b": b,
    "--world-c": c,
    background: `linear-gradient(135deg, color-mix(in srgb, ${a} 22%, transparent), color-mix(in srgb, ${b} 15%, transparent), rgba(23, 25, 22, .85))`,
  } as CSSProperties;
}

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"shop" | "clothes" | null>(null);
  const [tripOpen, setTripOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeMenu = () => {
    setMenuOpen(false);
    setActiveMenu(null);
  };
  useDialogFocus(menuOpen, closeMenu, drawerRef, menuButtonRef);
  const mainRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const bagLinkRef = useRef<HTMLAnchorElement | null>(null);
  const prevBagCount = useRef(0);
  const bagLines = useCommerceStore((state) => state.cartLines);
  const bagCount = bagLines.reduce((total, line) => total + line.quantity, 0);
  useEffect(() => {
    const had = prevBagCount.current;
    prevBagCount.current = bagCount;
    if (bagCount > had && had !== 0) {
      bagLinkRef.current?.setAttribute("data-bag-pulse", "true");
      window.setTimeout(
        () => bagLinkRef.current?.removeAttribute("data-bag-pulse"),
        600,
      );
    }
  }, [bagCount]);
  const notice = useUiStore((state) => state.notice);
  const user = useAuthStore((state) => state.user);
  const clearNotice = useUiStore((state) => state.clearNotice);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const isTrip = location.pathname === "/drops/psychedelic-minds";

  // One metadata claim per route; data-specific pages (product, catalogue)
  // override it once their content resolves.
  const seo = useMemo(
    () => routeSeo(location.pathname, location.search),
    [location.pathname, location.search],
  );
  useSeo({ ...seo, owner: "route", deferTo: "page" });

  // Read the active drop's palette after mount instead of during render,
  // so the first paint is deterministic and SSR/hydration stay safe.
  const [worldPalette, setWorldPalette] = useState<WorldPalette>(
    DEFAULT_WORLD_PALETTE,
  );
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const read = () => {
      const node = document.querySelector<HTMLElement>(".drop-object");
      if (node) {
        setWorldPalette({
          a:
            node.style.getPropertyValue("--world-a").trim() ||
            DEFAULT_WORLD_PALETTE.a,
          b:
            node.style.getPropertyValue("--world-b").trim() ||
            DEFAULT_WORLD_PALETTE.b,
          c:
            node.style.getPropertyValue("--world-c").trim() ||
            DEFAULT_WORLD_PALETTE.c,
        });
        return;
      }
      if (tries++ < 60) frame = window.requestAnimationFrame(read);
    };
    frame = window.requestAnimationFrame(read);
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  // Move keyboard focus to the main landmark on later route changes. Skipping
  // the first render keeps the skip-link as the first Tab stop on page load.
  const previousPathRef = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousPathRef.current;
    previousPathRef.current = location.pathname;
    if (previous === null || previous === location.pathname) return undefined;
    // Leaving an immersive room can leave the page deep-scrolled with focus on
    // a canvas that has just unmounted. Reset both before handing focus over.
    window.scrollTo({ top: 0, behavior: "auto" });
    const id = window.setTimeout(
      () => mainRef.current?.focus({ preventScroll: true }),
      50,
    );
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  useEffect(() => {
    if (!API_MODE) return;
    let mounted = true;
    const onApiError = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail
        ?.message;
      useUiStore
        .getState()
        .showNotice(message || "The store could not be reached.");
    };
    window.addEventListener("crewww:api-error", onApiError);
    const hydrate = async () => {
      try {
        const lines = await apiCommerceService.getCart();
        if (mounted) useCommerceStore.getState().setRemoteCart(lines);
      } catch {
        /* Page queries surface connectivity errors where the user needs them. */
      }
      let user: Awaited<ReturnType<typeof apiAuthService.currentUser>> = null;
      try {
        user = await apiAuthService.currentUser();
      } catch {
        if (mounted) {
          useUiStore
            .getState()
            .showNotice(
              "Your session could not be restored. Please sign in again.",
            );
        }
      }
      if (mounted && user) {
        try {
          useCommerceStore
            .getState()
            .setRemoteWishlist(await apiCommerceService.getWishlist());
        } catch {
          /* The server remains authoritative; anonymous sessions have no wishlist. */
        }
      }
    };
    void hydrate();
    return () => {
      mounted = false;
      window.removeEventListener("crewww:api-error", onApiError);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setActiveMenu(null);
    setTripOpen(false);
  }, [location.pathname, location.search]);

  // Follow-scroll navigation. The header slides out of the way while reading
  // and comes back on the smallest upward movement. Writing attributes directly
  // keeps a high-frequency scroll listener off React's render path.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;
    let decisionY = window.scrollY;
    let queued = false;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const apply = () => {
      const y = window.scrollY;
      header.dataset.scrolled = String(y > 24);
      const locked =
        reduced ||
        header.classList.contains("has-open-menu") ||
        header.contains(document.activeElement) ||
        y < 120;
      if (locked) {
        header.dataset.navHidden = "false";
        decisionY = y;
      } else if (y > decisionY + 12) {
        header.dataset.navHidden = "true";
        decisionY = y;
      } else if (y < decisionY - 12) {
        header.dataset.navHidden = "false";
        decisionY = y;
      }
      queued = false;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(apply);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (header) header.dataset.navHidden = "false";
  }, [location.pathname]);

  useEffect(() => {
    const nodes = () =>
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)");
    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      typeof IntersectionObserver === "undefined"
    ) {
      nodes().forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );
    const watch = () => nodes().forEach((node) => observer.observe(node));
    watch();
    // Scope mutations to route content and coalesce bursts into one frame.
    // Watching all of document.body re-queried the entire page on every
    // unrelated DOM change (toasts, sound toggle, focus attributes).
    let frame = 0;
    const mutations = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(watch);
    });
    const main = mainRef.current;
    if (main) mutations.observe(main, { childList: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [location.pathname]);

  // Keyboard trapping and focus restoration live in useDialogFocus above.
  // This effect only owns the swipe-left gesture.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const drawer = drawerRef.current;
    let startX = 0;
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length) startX = event.touches[0].clientX;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length) startX = event.touches[0].clientX;
    };
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches?.[0];
      if (touch && startX - touch.clientX > 60) closeMenu();
    };
    drawer?.addEventListener("touchstart", onTouchStart, { passive: true });
    drawer?.addEventListener("touchmove", onTouchMove, { passive: true });
    drawer?.addEventListener("touchend", onTouchEnd);
    return () => {
      drawer?.removeEventListener("touchstart", onTouchStart);
      drawer?.removeEventListener("touchmove", onTouchMove);
      drawer?.removeEventListener("touchend", onTouchEnd);
    };
  }, [menuOpen]);

  const openShop = () => {
    if (isHome) {
      setMenuOpen(false);
      setActiveMenu(null);
      document.getElementById("collection")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    } else navigate("/shop");
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        SKIP TO CONTENT
      </a>
      <ExperienceLayer />
      {FEATURES.commandPalette && <CommandPalette />}
      {!isTrip && (
        <div className="ambient-layer" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="announcement">
        <span>CREWWW / MAKE YOUR OWN FREQUENCY</span>
        <i aria-hidden="true">·</i>
        <Link className="announcement-trip" to="/drops/psychedelic-minds">
          PSYCHEDELIC MINDS / ENTER THE ROOM ↗
        </Link>
        <i aria-hidden="true" className="announcement-preview-sep">
          ·
        </i>
        <span className="announcement-preview">
          PREVIEW STORE / SAMPLE DATA
        </span>
      </div>
      <header
        ref={headerRef}
        className={`site-header${menuOpen ? " has-open-menu" : ""}`}
        onMouseLeave={() => setActiveMenu(null)}
      >
        <div className="header-aura" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="header-art-rail" aria-hidden="true">
          {psychedelicPieces.map((piece) => (
            <i
              key={piece.id}
              style={
                {
                  "--rail-art": `url(${piece.artwork})`,
                  "--rail-accent": piece.accent,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <button
          ref={menuButtonRef}
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => {
            setMenuOpen((open) => !open);
            setActiveMenu(null);
          }}
        >
          <span>{menuOpen ? "CLOSE" : "MENU"}</span>
          <span
            className={`menu-glyph${menuOpen ? " is-open" : ""}`}
            aria-hidden="true"
          >
            <i />
            <i />
          </span>
        </button>
        <nav
          className="primary-navigation desktop-navigation"
          aria-label="Primary navigation"
        >
          <button type="button" onClick={openShop}>
            THE EDIT
          </button>
          <NavLink
            to="/new-arrivals"
            aria-current={
              location.pathname === "/new-arrivals" ? "page" : undefined
            }
          >
            NEW ARRIVALS
          </NavLink>
          <NavLink
            to="/kids"
            aria-current={location.pathname === "/kids" ? "page" : undefined}
          >
            KIDS
          </NavLink>
          <NavLink
            to="/denim"
            aria-current={location.pathname === "/denim" ? "page" : undefined}
          >
            DENIM
          </NavLink>
          <button
            type="button"
            aria-expanded={activeMenu === "shop"}
            aria-haspopup="menu"
            aria-controls="mega-menu"
            onClick={() => setActiveMenu(activeMenu === "shop" ? null : "shop")}
            onMouseEnter={() => setActiveMenu("shop")}
          >
            CLOTHES <span aria-hidden="true">⌄</span>
          </button>
          <NavLink
            to="/drops"
            aria-current={location.pathname === "/drops" ? "page" : undefined}
          >
            DROPS
          </NavLink>
          <div
            className={`trip-nav-group${tripOpen ? " is-open" : ""}`}
            onMouseEnter={() => setTripOpen(true)}
            onMouseLeave={() => setTripOpen(false)}
          >
            <NavLink
              className="desktop-trip-link"
              to="/drops/psychedelic-minds"
              aria-expanded={tripOpen}
              aria-controls="psychedelic-popover"
              aria-current={
                location.pathname === "/drops/psychedelic-minds"
                  ? "page"
                  : undefined
              }
              onFocus={() => setTripOpen(true)}
            >
              PSYCHEDELIC <span aria-hidden="true">⌄</span>
            </NavLink>
            <div
              className="trip-popover"
              id="psychedelic-popover"
              hidden={!tripOpen}
            >
              <div className="trip-popover-head">
                <p className="store-eyebrow">CONCEPT 02 / FIVE WORLDS</p>
                <strong>Pick your frequency.</strong>
              </div>
              <div className="trip-popover-grid">
                {psychedelicPieces.map((piece) => (
                  <Link
                    key={piece.id}
                    to={`/drops/psychedelic-minds?piece=${piece.id}&entered=1`}
                    style={{ "--piece-accent": piece.accent } as CSSProperties}
                  >
                    <img src={piece.artwork} alt="" loading="lazy" />
                    <span>{piece.world.name}</span>
                    <b>{piece.name}</b>
                  </Link>
                ))}
              </div>
              <Link className="trip-popover-all" to="/drops">
                ALL DROPS ↗
              </Link>
            </div>
          </div>
          <NavLink
            className="desktop-story-link"
            to="/lookbook"
            aria-current={
              location.pathname === "/lookbook" ? "page" : undefined
            }
          >
            STORIES
          </NavLink>
        </nav>
        <Link className="brand-link" to="/" aria-label="Crewww home">
          <BrandMark />
        </Link>
        <nav className="header-actions" aria-label="Shopping utilities">
          <SiteSoundToggle />
          {API_MODE && user?.role === "admin" && (
            <Link
              className="header-admin-link"
              to="/admin"
              aria-label="Owner console"
            >
              ADMIN
            </Link>
          )}
          <Link to="/search" aria-label="Search Crewww">
            SEARCH
          </Link>
          <Link className="header-utility-account" to="/account">
            ACCOUNT
          </Link>
          <Link
            className="header-utility-wishlist"
            to="/wishlist"
            aria-label="Wishlist"
          >
            SAVED
          </Link>
          <Link
            ref={bagLinkRef}
            to="/cart"
            aria-label={`Shopping cart, ${bagCount} items`}
            className="header-bag-link"
          >
            <CartIcon /> CART <span className="bag-count">{bagCount}</span>
          </Link>
        </nav>
        {activeMenu && (
          <div
            className="mega-menu is-open"
            id="mega-menu"
            role="menu"
            aria-label={`${activeMenu === "shop" ? "Shop" : "Clothes"} categories`}
            data-world-a
            style={worldPaletteStyle(worldPalette)}
            onMouseEnter={() => setActiveMenu(activeMenu)}
          >
            <div className="mega-menu-heading">
              <div>
                <span>CREWWW / THE CITY EDIT</span>
                <h2>
                  Find your <em>next layer.</em>
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close categories"
                onClick={() => setActiveMenu(null)}
              >
                ×
              </button>
            </div>
            <div className="mega-menu-columns">
              {shopColumns.map((column) => (
                <div key={column.label}>
                  <p>{column.label}</p>
                  {column.links.map(([label, to]) => (
                    <Link key={to} to={to}>
                      {label}
                      <span>↗</span>
                    </Link>
                  ))}
                </div>
              ))}
              <Link
                className="mega-menu-image"
                to="/drops/psychedelic-minds"
                style={{
                  backgroundImage:
                    "url(/images/drops/psychedelic-minds/print-plates/01-out-of-focus-dtg-back-print.webp)",
                }}
              >
                <span>PSYCHEDELIC MINDS</span>
                <strong>Enter the room ↗</strong>
              </Link>
            </div>
          </div>
        )}
      </header>
      {menuOpen && (
        <div
          className="mobile-navigation-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          ref={drawerRef}
          onClick={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <nav
            className={`mobile-navigation${menuOpen ? " is-open" : ""}`}
            id="mobile-navigation"
            aria-label="Mobile navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-navigation-top">
              <p>SHOP THE CREWWW WORLD</p>
              <Link to="/search">SEARCH THE EDIT ↗</Link>
            </div>
            <div className="mobile-navigation-links">
              {[
                "Psychedelic drop",
                "Shop all",
                "New arrivals",
                "Kids",
                "Denim",
                "Clothes",
                "Drops",
                "Best sellers",
                "Accessories",
                "Shoes",
                "Lookbook",
                "About",
                "Find stores",
                "Contact",
              ].map((label) => {
                const path = (
                  {
                    "Psychedelic drop": "/drops/psychedelic-minds",
                    "Shop all": "/shop",
                    "New arrivals": "/new-arrivals",
                    Kids: "/kids",
                    Denim: "/denim",
                    Clothes: "/clothes",
                    Drops: "/drops",
                    "Best sellers": "/best-sellers",
                    Accessories: "/accessories",
                    Shoes: "/shoes",
                    Lookbook: "/lookbook",
                    About: "/about",
                    "Find stores": "/find-stores",
                    Contact: "/contact",
                  } as Record<string, string>
                )[label];
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMenuOpen(false)}
                    aria-current={
                      location.pathname === path ? "page" : undefined
                    }
                  >
                    {label}
                    <span>↗</span>
                  </Link>
                );
              })}
            </div>
            <div className="mobile-navigation-bottom">
              <Link to="/account">ACCOUNT</Link>
              <Link to="/wishlist">SAVED PIECES</Link>
              <Link to="/cart">SHOPPING CART · {bagCount}</Link>
              {API_MODE && user?.role === "admin" && (
                <Link to="/admin">ADMIN</Link>
              )}
            </div>
          </nav>
        </div>
      )}
      <main id="main-content" ref={mainRef} tabIndex={-1}>
        <ErrorBoundary key={location.pathname}>
          <Suspense
            fallback={
              <div className="catalog-skeleton" role="status">
                OPENING CREWWW…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="site-footer store-footer">
        <div className="store-footer-top">
          <div>
            <BrandMark inverse />
            <p>
              Move your own way.
              <br />
              <em>Find your people.</em>
            </p>
          </div>
          <div className="footer-newsletter-prompt">
            <span>CREWWW / NOTES FROM THE BLOCK</span>
            <p>New drops, good stories, no noise.</p>
            <Link to="/#newsletter">JOIN THE LIST ↗</Link>
          </div>
        </div>
        <div className="footer-link-groups">
          <div>
            <span>SHOP</span>
            <Link to="/shop">All pieces</Link>
            <Link to="/new-arrivals">New arrivals</Link>
            <Link to="/kids">Kids</Link>
            <Link to="/denim">Denim</Link>
            <Link to="/drops">Drops</Link>
            <Link to="/best-sellers">Best sellers</Link>
          </div>
          <div>
            <span>THE WORLD</span>
            <Link to="/lookbook">Lookbook</Link>
            <Link to="/about">Our story</Link>
            <Link to="/find-stores">Find stores</Link>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <span>HELP & INFO</span>
            <Link to="/support">Support</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/shipping">Shipping</Link>
            <Link to="/returns">Returns</Link>
            <Link to="/policies/privacy">Privacy</Link>
            <Link to="/policies/terms">Terms</Link>
          </div>
          <div>
            <span>YOUR CREWWW</span>
            <Link to="/account">Account</Link>
            <Link to="/account/orders">Orders</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/cart">Cart</Link>
            {API_MODE && user?.role === "admin" && (
              <Link to="/admin">Owner console</Link>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© CREWWW STUDIO 2026</span>
          <span>PREVIEW STORE · SAMPLE PRODUCT DATA</span>
          <Link to="/design-system">DESIGN NOTES ↗</Link>
        </div>
      </footer>
      <Toast message={notice} onClose={clearNotice} />
    </>
  );
}
