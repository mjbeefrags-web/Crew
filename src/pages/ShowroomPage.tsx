import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Button } from "../components/Button";
import { ColorwayMatrix } from "../components/ColorwayMatrix";
import { ConceptWorlds } from "../components/ConceptWorlds";
import { DropTransmissionRail } from "../components/DropTransmissionRail";
import { featuredProducts } from "../data/mock/catalog";
import { psychedelicPieces } from "../data/psychedelic";
import type { Product } from "../domain/product";
import { useCommerceStore } from "../state/commerceStore";
import type { CartLine } from "../domain/commerce";
import {
  HomepageIntroSections,
  HomepageStorySections,
} from "./HomepageSections";
import { formatCurrency } from "../utils/formatCurrency";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { WorldDestinationId, WorldMode } from "../scenes/CrewwwWorld";
import { catalogService } from "../app/services";
import { API_MODE } from "../config/runtime";
import { FEATURES } from "../config/features";
import { trackEvent } from "../lib/insights";
import { isSoundEnabled, startAmbience, stopAmbience } from "../lib/sound";

const HoodieViewer = lazy(() =>
  import("../components/HoodieViewer").then((module) => ({
    default: module.HoodieViewer,
  })),
);
const CrewwwWorld = lazy(() =>
  import("../scenes/CrewwwWorld").then((module) => ({
    default: module.CrewwwWorld,
  })),
);

function WorldStageFallback() {
  return (
    <div
      className="world-stage world-stage-fallback"
      aria-label="Crewww district"
    >
      <div className="world-fallback-scene">
        <span>CREWWW</span>
        <b>THE BLOCK / FIRST RUN</b>
      </div>
    </div>
  );
}

const worldCollections = {
  graphic: "CREWWW / GRAPHIC HOODIES",
  outside: "CREWWW / OUTSIDE HOURS",
  city: "CREWWW / CITY NOTES",
  essentials: "CREWWW / ESSENTIALS",
} as const;

type Origin = { x: number; y: number; scale: number };
const categories = [
  "All pieces",
  "Jackets",
  "Tops",
  "Hoodies",
  "Shirts",
  "Denim",
  "Trousers",
  "Accessories",
];
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "ONE SIZE"];
export function ShowroomPage() {
  const catalogQuery = useQuery({
    queryKey: ["showroom-products"],
    queryFn: () => catalogService.listFeaturedProducts(),
    enabled: API_MODE,
  });
  const catalogProducts = API_MODE
    ? (catalogQuery.data ?? [])
    : featuredProducts;
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(
    searchParams.get("category") || "All pieces",
  );
  const [collection, setCollection] = useState(
    searchParams.get("collection") || "",
  );
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "featured");
  const [size, setSize] = useState(searchParams.get("size") || "");
  const [color, setColor] = useState(searchParams.get("color") || "");
  const [availableOnly, setAvailableOnly] = useState(
    searchParams.get("available") === "1",
  );
  const [newOnly, setNewOnly] = useState(searchParams.get("new") === "1");
  const [bestOnly, setBestOnly] = useState(searchParams.get("best") === "1");
  const [minPrice, setMinPrice] = useState(
    Number(searchParams.get("minPrice") || 0),
  );
  const [maxPrice, setMaxPrice] = useState(
    Number(searchParams.get("maxPrice") || 250),
  );
  const wishlist = useCommerceStore((state) => state.wishlist);
  const cartLines = useCommerceStore((state) => state.cartLines);
  const addCartLine = useCommerceStore((state) => state.addCartLine);
  const removeCartLine = useCommerceStore((state) => state.removeCartLine);
  const toggleWishlistState = useCommerceStore((state) => state.toggleWishlist);
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const cartOpenerRef = useRef<HTMLElement | null>(null);
  const cartCloseRef = useRef<HTMLButtonElement | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0, scale: 0.5 });
  const [closing, setClosing] = useState(false);
  const [activeSize, setActiveSize] = useState("M");
  const [activeColor, setActiveColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState("");
  const [toast, setToast] = useState("");
  const [worldMode, setWorldMode] = useState<WorldMode>("cinematic");
  const [walkHint, setWalkHint] = useState(false);
  // The hero poster paints immediately; the WebGL block is mounted once the
  // browser is idle so Three.js never competes with the first render.
  const [worldReady, setWorldReady] = useState(false);
  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      const handle = idleWindow.requestIdleCallback(() => setWorldReady(true), {
        timeout: 1200,
      });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(() => setWorldReady(true), 500);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (worldMode !== "explore") return;
    try {
      if (localStorage.getItem("crewww:walk-hint-seen")) return;
    } catch {
      /* ignore */
    }
    setWalkHint(true);
    const t = window.setTimeout(() => {
      setWalkHint(false);
      try {
        localStorage.setItem("crewww:walk-hint-seen", "1");
      } catch {
        /* ignore */
      }
    }, 6000);
    return () => window.clearTimeout(t);
  }, [worldMode]);
  const [nearDestination, setNearDestination] =
    useState<WorldDestinationId | null>(null);
  const [moveInput, setMoveInput] = useState({ x: 0, z: 0 });
  const [journey, setJourney] = useState(0);
  const journeyTrackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const transitionTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const transitionLockRef = useRef(false);
  const closingRef = useRef(false);
  const historyMarkerRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const chapterIndex =
    journey < 0.2
      ? 0
      : journey < 0.4
        ? 1
        : journey < 0.6
          ? 2
          : journey < 0.8
            ? 3
            : 4;
  const chapterArt = psychedelicPieces;
  const scrollToCollection = () => {
    clearFilters();
    if (window.location.hash !== "#collection")
      window.history.pushState(
        {},
        "",
        `${location.pathname}${location.search}#collection`,
      );
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() =>
      document
        .getElementById("collection")
        ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }),
    );
  };
  const originForProduct = (productId: string): Origin | null => {
    const rect = cardRefs.current[productId]?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: rect.left + rect.width / 2 - window.innerWidth / 2,
      y: rect.top + rect.height / 2 - window.innerHeight / 2,
      scale: rect.width / Math.min(500, window.innerWidth * 0.8),
    };
  };

  const walkVectors = {
    backward: { x: 0, z: -1 },
    forward: { x: 0, z: 1 },
    left: { x: -1, z: 0 },
    right: { x: 1, z: 0 },
  } as const;
  const startWalk = (direction: keyof typeof walkVectors) =>
    setMoveInput(walkVectors[direction]);
  const stopWalk = () => setMoveInput({ x: 0, z: 0 });
  const walkKey =
    (direction: keyof typeof walkVectors) =>
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        startWalk(direction);
      }
    };

  const selectWorldDestination = (
    destination: keyof typeof worldCollections,
  ) => {
    setCategory("All pieces");
    setCollection(worldCollections[destination]);
    setQuery("");
    setSort("featured");
    setSize("");
    setColor("");
    setAvailableOnly(false);
    setNewOnly(false);
    setBestOnly(false);
    setMinPrice(0);
    setMaxPrice(250);
    trackEvent("world_destination", { destination });
    if (window.location.hash !== "#collection")
      window.history.pushState(
        {},
        "",
        `${location.pathname}${location.search}#collection`,
      );
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(() =>
      document
        .getElementById("collection")
        ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" }),
    );
  };

  useEffect(() => {
    const openBag = (event: Event) => {
      cartOpenerRef.current =
        (event as CustomEvent<HTMLElement>).detail ??
        (document.activeElement as HTMLElement);
      setCartOpen(true);
    };
    window.addEventListener("arcfield:open-bag", openBag);
    return () => window.removeEventListener("arcfield:open-bag", openBag);
  }, []);

  // Ambient sound on home when enabled (Tier 3.21)
  useEffect(() => {
    if (!FEATURES.ambientSound) return;
    const sync = () => {
      if (isSoundEnabled()) startAmbience();
      else stopAmbience();
    };
    sync();
    window.addEventListener("crewww:sound-change", sync);
    return () => {
      window.removeEventListener("crewww:sound-change", sync);
      stopAmbience();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const track = journeyTrackRef.current;
      const reduced =
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
        false;
      if (!track || reduced) {
        setJourney((current) => (current === 0 ? current : 0));
        return;
      }
      const bounds = track.getBoundingClientRect();
      const distance = Math.max(1, bounds.height - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -bounds.top / distance));
      setJourney((current) =>
        Math.abs(current - progress) > 0.01 ? progress : current,
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!cartOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => cartCloseRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>(".cart-drawer");
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [cartOpen]);

  const closeCart = () => {
    setCartOpen(false);
    window.setTimeout(
      () => cartOpenerRef.current?.focus({ preventScroll: true }),
      0,
    );
  };

  // Sync filters to URL (Tier 2.11) — shareable & back-button friendly.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const set = (k: string, v: string, def = "") => {
      if (v && v !== def) next.set(k, v);
      else next.delete(k);
    };
    set("category", category, "All pieces");
    set("collection", collection);
    set("q", query);
    set("sort", sort, "featured");
    set("size", size);
    set("color", color);
    set("available", availableOnly ? "1" : "");
    set("new", newOnly ? "1" : "");
    set("best", bestOnly ? "1" : "");
    set("minPrice", String(minPrice), "0");
    set("maxPrice", String(maxPrice), "250");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    category,
    collection,
    query,
    sort,
    size,
    color,
    availableOnly,
    newOnly,
    bestOnly,
    minPrice,
    maxPrice,
    searchParams,
    setSearchParams,
  ]);

  const openCart = (opener: HTMLElement) => {
    cartOpenerRef.current = opener;
    setCartOpen(true);
  };

  useEffect(
    () => () => {
      if (transitionTimerRef.current !== null)
        window.clearTimeout(transitionTimerRef.current);
      if (toastTimerRef.current !== null)
        window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const products = useMemo(() => {
    const result = catalogProducts.filter((product) => {
      const matchesCategory =
        category === "All pieces" ||
        product.category.toLowerCase() === category.toLowerCase();
      const matchesQuery =
        `${product.name} ${product.category} ${product.collection}`
          .toLowerCase()
          .includes(query.toLowerCase());
      return (
        matchesCategory &&
        (!collection || product.collection === collection) &&
        matchesQuery &&
        (!size || product.sizes.includes(size)) &&
        (!color || product.colors.some((item) => item.name === color)) &&
        (!availableOnly || product.available) &&
        (!newOnly || product.isNew) &&
        (!bestOnly || product.bestSeller) &&
        product.price >= minPrice &&
        product.price <= maxPrice
      );
    });
    if (sort === "price-low") result.sort((a, b) => a.price - b.price);
    if (sort === "price-high") result.sort((a, b) => b.price - a.price);
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [
    catalogProducts,
    category,
    collection,
    query,
    sort,
    size,
    color,
    availableOnly,
    newOnly,
    bestOnly,
    minPrice,
    maxPrice,
  ]);

  const openStudio = (product: Product) => {
    if (transitionLockRef.current || activeProduct) return;
    const sourceCard = cardRefs.current[product.id];
    const capturedOrigin = originForProduct(product.id);
    if (!sourceCard || !capturedOrigin) return;
    transitionLockRef.current = true;
    closingRef.current = false;
    restoreFocusRef.current = sourceCard;
    setClosing(false);
    setOrigin(capturedOrigin);
    window.history.pushState(
      { ...(window.history.state ?? {}), arcfieldInspectionId: product.id },
      "",
      `${location.pathname}${location.search}#inspection`,
    );
    historyMarkerRef.current = true;
    setActiveProduct(product);
    setActiveSize(
      product.sizes.find((item) => item !== "ONE SIZE") ?? "ONE SIZE",
    );
    setActiveColor(product.colors[0]?.name ?? product.color);
    setQuantity(1);
    setDetails("");
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    transitionTimerRef.current = window.setTimeout(() => {
      transitionLockRef.current = false;
      transitionTimerRef.current = null;
    }, 650);
  };
  const closeStudio = () => {
    if (!activeProduct || closingRef.current) return;
    const currentOrigin = originForProduct(activeProduct.id);
    if (currentOrigin) setOrigin(currentOrigin);
    closingRef.current = true;
    transitionLockRef.current = true;
    if (transitionTimerRef.current !== null)
      window.clearTimeout(transitionTimerRef.current);
    setClosing(true);
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reducedMotion ? 0 : 460;
    transitionTimerRef.current = window.setTimeout(() => {
      setActiveProduct(null);
      setClosing(false);
      closingRef.current = false;
      transitionLockRef.current = false;
      window.setTimeout(
        () => restoreFocusRef.current?.focus({ preventScroll: true }),
        0,
      );
      transitionTimerRef.current = null;
    }, delay);
  };
  const requestCloseStudio = () => {
    if (historyMarkerRef.current) {
      window.history.back();
      return;
    }
    closeStudio();
  };

  useEffect(() => {
    if (!activeProduct) return undefined;
    const previousOverflow = window.document.body.style.overflow;
    const previousPaddingRight = window.document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - window.document.documentElement.clientWidth;
    window.document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0)
      window.document.body.style.paddingRight = `${scrollbarWidth}px`;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onPopState = () => {
      if (!historyMarkerRef.current) return;
      historyMarkerRef.current = false;
      closeStudio();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      requestCloseStudio();
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("popstate", onPopState);
    const updateOrigin = () => {
      const nextOrigin = originForProduct(activeProduct.id);
      if (nextOrigin) setOrigin(nextOrigin);
    };
    window.addEventListener("resize", updateOrigin);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("resize", updateOrigin);
      window.document.body.style.overflow = previousOverflow;
      window.document.body.style.paddingRight = previousPaddingRight;
    };
  }, [activeProduct]);

  const handleStudioKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const showToast = (message: string) => {
    if (toastTimerRef.current !== null)
      window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast("");
      toastTimerRef.current = null;
    }, 2800);
  };
  const clearFilters = () => {
    setCategory("All pieces");
    setCollection("");
    setQuery("");
    setSize("");
    setColor("");
    setAvailableOnly(false);
    setNewOnly(false);
    setBestOnly(false);
    setMinPrice(0);
    setMaxPrice(250);
    setSort("featured");
  };
  const toggleWish = (product: Product) => {
    const removing = wishlist.includes(product.id);
    toggleWishlistState(product.id);
    showToast(
      removing ? "Removed from saved pieces." : "Saved to your wishlist.",
    );
  };
  const addToBag = () => {
    if (!activeProduct) return;
    const line: CartLine = {
      productId: activeProduct.id,
      size: activeSize,
      color: activeColor,
      quantity,
    };
    addCartLine(line);
    showToast(
      `${activeProduct.name} · ${activeColor} · ${activeSize} added to your bag.`,
    );
  };

  return (
    <div className="showroom">
      <div className="journey-track" ref={journeyTrackRef}>
        <div className="journey-sticky">
          <section
            className="showroom-hero"
            aria-labelledby="showroom-title"
            style={
              {
                "--journey": journey,
                "--chapter-art": `url(${chapterArt[chapterIndex].artwork})`,
                "--chapter-accent": chapterArt[chapterIndex].accent,
              } as CSSProperties
            }
          >
            <div className="hero-flicker" aria-hidden="true" />
            <div className="journey-artwall" aria-hidden="true">
              {psychedelicPieces.map((piece, index) => (
                <img
                  key={piece.id}
                  src={piece.artwork}
                  alt=""
                  width={957}
                  height={452}
                  loading={
                    chapterArt[chapterIndex].id === piece.id ? "eager" : "lazy"
                  }
                  fetchPriority={
                    chapterArt[chapterIndex].id === piece.id ? "high" : "auto"
                  }
                  decoding="async"
                  className={
                    chapterArt[chapterIndex].id === piece.id ? "is-active" : ""
                  }
                  style={{ "--art-delay": `${index * -1.4}s` } as CSSProperties}
                />
              ))}
            </div>
            <div className="showroom-hero-copy" key={`copy-${chapterIndex}`}>
              {chapterIndex === 0 && (
                <>
                  <p className="showroom-eyebrow">
                    <span className="live-mark" /> CREWWW / YOUR DISTRICT
                  </p>
                  <h1 id="showroom-title" aria-label="The block is yours">
                    <span className="hero-line">The block</span>
                    <span className="hero-line">
                      is <em>yours.</em>
                    </span>
                  </h1>
                  <p className="showroom-lede">
                    Find your next layer in the neighborhood.
                    <br />
                    Explore a little or shop the full edit.
                  </p>
                  <div className="chapter-actions">
                    <a
                      className="hero-cta"
                      href="#collection"
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToCollection();
                      }}
                    >
                      SHOP ALL HOODIES <span>↘</span>
                    </a>
                    <Link
                      className="hero-trip-link"
                      to="/drops/psychedelic-minds"
                    >
                      ENTER THE PSYCHEDELIC DROP <span>↗</span>
                    </Link>
                  </div>
                </>
              )}
              {chapterIndex === 1 && (
                <>
                  <p className="showroom-eyebrow">
                    <span className="live-mark" /> CHAPTER 02 / THE STREET
                  </p>
                  <h1 id="showroom-title">
                    <span className="hero-line">Two sides.</span>
                    <span className="hero-line">
                      <em>One frequency.</em>
                    </span>
                  </h1>
                  <p className="showroom-lede">
                    Every storefront is a state of mind.
                    <br />
                    Pick a door and walk into it.
                  </p>
                  <div className="chapter-actions">
                    <button
                      className="hero-cta"
                      type="button"
                      onClick={scrollToCollection}
                    >
                      SHOP ALL HOODIES <span>↘</span>
                    </button>
                    <button
                      className="chapter-secondary"
                      type="button"
                      onClick={() => setWorldMode("explore")}
                    >
                      EXPLORE THE BLOCK <span>↗</span>
                    </button>
                  </div>
                </>
              )}
              {chapterIndex === 2 && (
                <>
                  <p className="showroom-eyebrow">
                    <span className="live-mark" /> CHAPTER 03 / THE SIGNAL
                  </p>
                  <h1 id="showroom-title">
                    <span className="hero-line">Graphics</span>
                    <span className="hero-line">
                      <em>with a pulse.</em>
                    </span>
                  </h1>
                  <p className="showroom-lede">
                    Psychedelic Minds. Five transmissions
                    <br />
                    from the same fever dream.
                  </p>
                  <Link className="hero-cta" to="/drops/psychedelic-minds">
                    ENTER THE TRIP <span>↗</span>
                  </Link>
                </>
              )}
              {chapterIndex === 3 && (
                <>
                  <p className="showroom-eyebrow">
                    <span className="live-mark" /> CHAPTER 04 / THE EDIT
                  </p>
                  <h1 id="showroom-title">
                    <span className="hero-line">Find your</span>
                    <span className="hero-line">
                      <em>crew.</em>
                    </span>
                  </h1>
                  <p className="showroom-lede">
                    Eight heavyweight pieces.
                    <br />
                    The one that looks like you is in here.
                  </p>
                  <button
                    className="hero-cta"
                    type="button"
                    onClick={scrollToCollection}
                  >
                    SHOP THE EDIT <span>↘</span>
                  </button>
                </>
              )}
              {chapterIndex === 4 && (
                <>
                  <p className="showroom-eyebrow">
                    <span className="live-mark" /> CHAPTER 05 / THE PORTAL
                  </p>
                  <h1 id="showroom-title">
                    <span className="hero-line">The print is</span>
                    <span className="hero-line">
                      <em>a door.</em>
                    </span>
                  </h1>
                  <p className="showroom-lede">
                    Five concepts. Five worlds.
                    <br />
                    Choose the frequency you want to live in.
                  </p>
                  <Link
                    className="hero-cta"
                    to="/drops/psychedelic-minds?piece=mind-03&amp;entered=1"
                  >
                    ENTER THE GIFT ROOM <span>↗</span>
                  </Link>
                </>
              )}
            </div>
            <div className="world-mode-bar" hidden={!FEATURES.worldWalk}>
              <button
                type="button"
                aria-pressed={worldMode === "explore"}
                onClick={() => {
                  setWorldMode(
                    worldMode === "explore" ? "cinematic" : "explore",
                  );
                  setNearDestination(null);
                  setMoveInput({ x: 0, z: 0 });
                }}
              >
                {worldMode === "explore"
                  ? "EXIT WALK MODE"
                  : "EXPLORE THE BLOCK"}
              </button>
              {worldMode === "explore" && (
                <span>WASD · DRAG TO LOOK · E TO ENTER</span>
              )}
              {walkHint && (
                <div className="walk-hint" role="status" aria-live="polite">
                  <b>EXPLORE MODE</b>
                  <span>
                    WASD / arrows to move · drag to look · E to enter a store
                  </span>
                </div>
              )}
            </div>
            {worldReady ? (
              <Suspense fallback={<WorldStageFallback />}>
                <CrewwwWorld
                  onDestination={selectWorldDestination}
                  mode={worldMode}
                  moveInput={moveInput}
                  onNearDestination={setNearDestination}
                  progress={journey}
                />
              </Suspense>
            ) : (
              <WorldStageFallback />
            )}
            <div
              className="chapter-wipe"
              key={`wipe-${chapterIndex}`}
              aria-hidden="true"
            />
            <nav
              className="world-destinations"
              aria-label="Explore Crewww collections"
            >
              {(
                Object.entries(worldCollections) as [
                  keyof typeof worldCollections,
                  string,
                ][]
              ).map(([id, name], index) => (
                <a
                  href="#collection"
                  key={id}
                  onClick={(event) => {
                    event.preventDefault();
                    selectWorldDestination(id);
                  }}
                >
                  <span>0{index + 1}</span>
                  <strong>{name.replace("CREWWW / ", "")}</strong>
                  <i aria-hidden="true">↗</i>
                </a>
              ))}
            </nav>
            <span className="hero-footnote">
              SELECT A STORE / OR SHOP ALL ↘
            </span>
            {worldMode === "explore" && (
              <>
                <div className="world-dpad" aria-label="Walk controls">
                  <button
                    type="button"
                    aria-label="Walk backward"
                    onPointerDown={() => startWalk("backward")}
                    onPointerUp={stopWalk}
                    onPointerLeave={stopWalk}
                    onKeyDown={walkKey("backward")}
                    onKeyUp={stopWalk}
                    onBlur={stopWalk}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Walk forward"
                    onPointerDown={() => startWalk("forward")}
                    onPointerUp={stopWalk}
                    onPointerLeave={stopWalk}
                    onKeyDown={walkKey("forward")}
                    onKeyUp={stopWalk}
                    onBlur={stopWalk}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Strafe left"
                    onPointerDown={() => startWalk("left")}
                    onPointerUp={stopWalk}
                    onPointerLeave={stopWalk}
                    onKeyDown={walkKey("left")}
                    onKeyUp={stopWalk}
                    onBlur={stopWalk}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label="Strafe right"
                    onPointerDown={() => startWalk("right")}
                    onPointerUp={stopWalk}
                    onPointerLeave={stopWalk}
                    onKeyDown={walkKey("right")}
                    onKeyUp={stopWalk}
                    onBlur={stopWalk}
                  >
                    →
                  </button>
                </div>
                {nearDestination && (
                  <button
                    className="world-prompt"
                    type="button"
                    onClick={() => selectWorldDestination(nearDestination)}
                  >
                    PRESS E / ENTER{" "}
                    {worldCollections[nearDestination].replace("CREWWW / ", "")}{" "}
                    ↗
                  </button>
                )}
              </>
            )}
            <div className="world-journey" aria-hidden="true">
              <span>THE BLOCK</span>
              <i>
                <b style={{ transform: `scaleX(${journey})` }} />
              </i>
              <span>THE EDIT</span>
            </div>
            <div className="chapter-rail" aria-hidden="true">
              <div
                className="chapter-rail-fill"
                style={{ transform: `scaleX(${journey})` }}
              />
              {["BLOCK", "STREET", "SIGNAL", "EDIT", "PORTAL"].map(
                (label, index) => (
                  <span
                    key={label}
                    className={index === chapterIndex ? "is-active" : ""}
                  >
                    <i>{String(index + 1).padStart(2, "0")}</i>
                    {label}
                  </span>
                ),
              )}
              <span className="chapter-rail-count">
                {String(chapterIndex + 1).padStart(2, "0")} / 05
              </span>
            </div>
            <div
              className="journey-scroll-hint"
              aria-hidden="true"
              style={{
                opacity: journey > 0.2 ? 0 : 1 - journey * 4,
                transform: `translateY(${journey * -20}px)`,
              }}
            >
              SCROLL TO MOVE THROUGH THE BLOCK{" "}
              <i
                style={{
                  display: "inline-block",
                  animation: "scroll-chevron 1.4s ease-in-out infinite",
                }}
              >
                ↓
              </i>
            </div>
          </section>
        </div>
      </div>

      {/* Breathing threshold between the world and the scroll journey. The
          colour fields react to scroll velocity; the spacer itself never
          changes layout height, so scrolling stays smooth. */}
      <div className="scroll-breath" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <span>BREATHE / SCROLL TO FIND YOUR FREQUENCY</span>
      </div>

      <section
        className="drop-entry-banner"
        data-reveal
        style={
          {
            "--banner-art": `url(${psychedelicPieces[2].artwork})`,
            "--banner-accent": psychedelicPieces[2].accent,
          } as CSSProperties
        }
      >
        <div>
          <span>CREW / CONCEPT 02 / PSYCHEDELIC MINDS</span>
          <h2>
            Psychedelic
            <br />
            <em>Minds.</em>
          </h2>
          <p>
            Five designs, five states of mind. Step into a drop chamber and
            examine each piece like an item you just unlocked.
          </p>
        </div>
        <Link to="/drops/psychedelic-minds">ENTER THE PSYCHEDELIC ROOM ↗</Link>
      </section>

      <DropTransmissionRail />

      <ConceptWorlds />

      <ColorwayMatrix />

      <HomepageIntroSections />

      <section
        className="collection"
        id="collection"
        data-reveal
        aria-labelledby="collection-title"
      >
        <div className="collection-heading">
          <div>
            <p className="showroom-eyebrow">THE FIRST RUN / 08 HOODIES</p>
            <h2 id="collection-title">
              Find your <em>crew.</em>
            </h2>
          </div>
          <p>
            Heavy fleece, expressive graphics,
            <br />
            and room to make the look your own.
          </p>
        </div>
        <div className="catalog-tools">
          <label className="catalog-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search pieces"
              placeholder="Try: hoodie, cherry, black — ⌘K"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                // Surface the command palette hint; actual filtering remains here.
              }}
            />
            <button
              type="button"
              className="catalog-search-kbd"
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true }),
                )
              }
              aria-label="Open command palette"
            >
              ⌘K
            </button>
          </label>
          <label className="sort-control">
            SORT BY{" "}
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="catalog-layout">
          <button
            type="button"
            className="filter-mobile-toggle"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            FILTERS {filtersOpen ? "−" : "+"}{" "}
            <span>{products.length} PIECES</span>
          </button>
          <aside
            className={`filter-panel${filtersOpen ? " is-mobile-open" : ""}`}
            aria-label="Product filters"
          >
            <div className="filter-title">
              <span>REFINE</span>
              <button type="button" onClick={clearFilters}>
                CLEAR ALL
              </button>
            </div>
            <fieldset className="filter-group">
              <legend>Category</legend>
              {categories.map((item) => (
                <button
                  className={
                    category === item
                      ? "filter-choice selected"
                      : "filter-choice"
                  }
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                >
                  {item}
                  <span>{category === item ? "●" : ""}</span>
                </button>
              ))}
            </fieldset>
            <label className="filter-group select-filter">
              <span>Collection</span>
              <select
                aria-label="Filter by collection"
                value={collection}
                onChange={(event) => setCollection(event.target.value)}
              >
                <option value="">All collections</option>
                {[
                  ...new Set(catalogProducts.map((item) => item.collection)),
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="filter-group select-filter">
              <span>Size</span>
              <select
                aria-label="Filter by size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
              >
                <option value="">Any size</option>
                {sizes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <fieldset className="filter-group color-filter">
              <legend>Color</legend>
              <div>
                {[
                  ...new Map(
                    catalogProducts
                      .flatMap((item) => item.colors)
                      .map((item) => [item.name, item]),
                  ).values(),
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    title={item.name}
                    aria-label={`Filter color ${item.name}`}
                    aria-pressed={color === item.name}
                    className={
                      color === item.name
                        ? "color-choice selected"
                        : "color-choice"
                    }
                    style={{ "--swatch": item.value } as CSSProperties}
                    onClick={() =>
                      setColor(color === item.name ? "" : item.name)
                    }
                  />
                ))}
              </div>
            </fieldset>
            <fieldset className="filter-group price-filter">
              <legend>Price range</legend>
              <span>
                {formatCurrency(minPrice, "USD")} –{" "}
                {formatCurrency(maxPrice, "USD")}
              </span>
              <label>
                FROM
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, maxPrice - 10)}
                  step="10"
                  value={minPrice}
                  aria-label="Minimum price"
                  onChange={(event) => setMinPrice(Number(event.target.value))}
                />
              </label>
              <label>
                TO
                <input
                  type="range"
                  min={Math.min(50, minPrice + 10)}
                  max="250"
                  step="10"
                  value={maxPrice}
                  aria-label="Maximum price"
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                />
              </label>
            </fieldset>
            <fieldset className="filter-group toggle-filter">
              <legend>Availability</legend>
              <label>
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                />{" "}
                In stock
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={newOnly}
                  onChange={(event) => setNewOnly(event.target.checked)}
                />{" "}
                New arrivals
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={bestOnly}
                  onChange={(event) => setBestOnly(event.target.checked)}
                />{" "}
                Best sellers
              </label>
            </fieldset>
          </aside>
          <div className="product-area">
            <div className="results-line">
              <span>{products.length} PIECES</span>
              <span>SELECT A PIECE TO INSPECT ↗</span>
            </div>
            {catalogQuery.isLoading ? (
              <div className="product-grid" aria-hidden="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`product-tile tile-${i % 5} skeleton-tile`}
                  >
                    <div className="skeleton-image" />
                    <div className="skeleton-line" style={{ width: "40%" }} />
                    <div className="skeleton-line" style={{ width: "70%" }} />
                  </div>
                ))}
              </div>
            ) : products.length ? (
              <div className="product-grid">
                {products.map((product, index) => (
                  <article
                    className={`product-tile tile-${index % 5}`}
                    data-index={String(index + 1).padStart(2, "0")}
                    key={product.id}
                  >
                    <div className="tile-image-wrap" data-tilt>
                      <button
                        ref={(node) => {
                          cardRefs.current[product.id] = node;
                        }}
                        className="tile-image-button"
                        type="button"
                        data-cursor="INSPECT"
                        aria-label={`Inspect ${product.name}`}
                        onClick={() => openStudio(product)}
                      >
                        <img
                          src={product.imageUrl}
                          alt={`${product.name}, ${product.color}`}
                          width={800}
                          height={1000}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="inspect-chip">
                          <i /> INSPECT PIECE
                        </span>
                      </button>
                      <button
                        className={
                          wishlist.includes(product.id)
                            ? "wishlist-button saved"
                            : "wishlist-button"
                        }
                        type="button"
                        aria-label={`${wishlist.includes(product.id) ? "Remove" : "Add"} ${product.name} ${wishlist.includes(product.id) ? "from" : "to"} wishlist`}
                        aria-pressed={wishlist.includes(product.id)}
                        onClick={() => toggleWish(product)}
                      >
                        {wishlist.includes(product.id) ? "♥" : "♡"}
                      </button>
                      {product.isNew && (
                        <span className="product-tag">NEW SEASON</span>
                      )}
                    </div>
                    <div className="tile-meta">
                      <div>
                        <span>{product.collection.toUpperCase()}</span>
                        <h3>{product.name}</h3>
                      </div>
                      <strong>
                        {formatCurrency(product.price, product.currency)}
                      </strong>
                    </div>
                    <div className="tile-colors">
                      <span>{product.colors.length} COLORS</span>
                      <div>
                        {product.colors.slice(0, 4).map((item) => (
                          <i
                            key={item.name}
                            title={item.name}
                            style={{ background: item.value }}
                          />
                        ))}
                      </div>
                      <span>{product.available ? "IN STOCK" : "SOLD OUT"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-catalog" role="status">
                <span>NO PIECES FOUND</span>
                <h3>
                  Nothing in this edit.
                  <br />
                  <em>Try another search.</em>
                </h3>
                <p className="empty-catalog-hint">
                  Try “hoodie”, “cherry”, or “black”, or clear filters.
                </p>
                <button type="button" onClick={clearFilters}>
                  CLEAR FILTERS ↗
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="showroom-editorial">
        <span>CREWWW / NOTE 01</span>
        <p>
          Find your people.
          <br />
          <em>Keep your own style.</em>
        </p>
        <a href="#collection">BACK TO THE HOODIES ↑</a>
      </section>

      <HomepageStorySections />

      {activeProduct && (
        <div
          className={`studio-overlay ${closing ? "is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeProduct.name} inspection studio`}
          tabIndex={-1}
          onKeyDown={handleStudioKeyDown}
        >
          <div className="studio-backdrop" />
          <button
            ref={closeButtonRef}
            className="studio-close"
            type="button"
            onClick={requestCloseStudio}
            disabled={closing}
          >
            ← <span>BACK TO COLLECTION</span>
          </button>
          <div className="studio-layout">
            <div className="studio-stage">
              <div className="studio-stage-label">
                <span>INSPECTION STUDIO</span>
                <span>OBJECT / {activeProduct.id.slice(-2)}</span>
              </div>
              <div
                className="studio-visual"
                style={
                  {
                    "--origin-x": `${origin.x}px`,
                    "--origin-y": `${origin.y}px`,
                    "--origin-scale": origin.scale,
                  } as CSSProperties
                }
              >
                <div className="studio-glow" />
                <Suspense
                  fallback={
                    <div className="hoodie-viewer viewer-unavailable">
                      Loading 3D preview…
                    </div>
                  }
                >
                  <HoodieViewer
                    color={
                      activeProduct.colors.find(
                        (item) => item.name === activeColor,
                      )?.value ?? "#171719"
                    }
                    label={activeProduct.name}
                    artworkUrl={activeProduct.imageUrl}
                  />
                </Suspense>
                <a
                  className="reference-image-link"
                  href={activeProduct.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  VIEW REFERENCE PHOTO ↗
                </a>
              </div>
              <div className="studio-controls" aria-label="3D garment preview">
                <span>DRAG TO ROTATE</span>
                <span>COLOR VARIANT UPDATES VIEW</span>
              </div>
            </div>
            <aside className="studio-details">
              <p className="showroom-eyebrow">
                {activeProduct.collection.toUpperCase()} /{" "}
                {activeProduct.category.toUpperCase()}
              </p>
              <h2>{activeProduct.name}</h2>
              <p className="studio-description">{activeProduct.description}</p>
              <strong className="studio-price">
                {formatCurrency(activeProduct.price, activeProduct.currency)}
              </strong>
              <div className="variant-block">
                <div className="variant-heading">
                  <span>COLOR</span>
                  <span>{activeColor}</span>
                </div>
                <div className="variant-colors">
                  {activeProduct.colors.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      aria-label={`Select ${item.name}`}
                      aria-pressed={activeColor === item.name}
                      className={
                        activeColor === item.name
                          ? "variant-color selected"
                          : "variant-color"
                      }
                      style={{ "--swatch": item.value } as CSSProperties}
                      onClick={() => setActiveColor(item.name)}
                    />
                  ))}
                </div>
              </div>
              <div className="variant-block">
                <div className="variant-heading">
                  <span>SELECT SIZE</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDetails(
                        details === "Measurements" ? "" : "Measurements",
                      )
                    }
                  >
                    SIZE GUIDE +
                  </button>
                </div>
                <div className="size-grid">
                  {activeProduct.sizes.map((item) => (
                    <button
                      type="button"
                      key={item}
                      aria-pressed={activeSize === item}
                      className={
                        activeSize === item
                          ? "size-button selected"
                          : "size-button"
                      }
                      onClick={() => setActiveSize(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="quantity-row">
                <span>QUANTITY</span>
                <div>
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <Button className="studio-add" onClick={addToBag}>
                ADD TO BAG —{" "}
                {formatCurrency(
                  activeProduct.price * quantity,
                  activeProduct.currency,
                )}{" "}
                <span>↗</span>
              </Button>
              <button
                className="studio-save"
                type="button"
                onClick={() => toggleWish(activeProduct)}
              >
                {wishlist.includes(activeProduct.id)
                  ? "♥ SAVED TO WISHLIST"
                  : "♡ SAVE TO WISHLIST"}
              </button>
              <div className="detail-accordions">
                {(
                  [
                    "Description",
                    "Material",
                    "Fit",
                    "Care",
                    "Measurements",
                    "Design details",
                  ] as const
                ).map((item) => (
                  <div className="detail-row" key={item}>
                    <button
                      type="button"
                      aria-expanded={details === item}
                      onClick={() => setDetails(details === item ? "" : item)}
                    >
                      {item}
                      <span>{details === item ? "−" : "+"}</span>
                    </button>
                    {details === item && (
                      <p>
                        {item === "Description"
                          ? activeProduct.description
                          : item === "Material"
                            ? activeProduct.specifications.material
                            : item === "Fit"
                              ? activeProduct.specifications.fit
                              : item === "Care"
                                ? activeProduct.specifications.care
                                : item === "Measurements"
                                  ? `Available sizes: ${activeProduct.sizes.join(", ")}. Fit guidance is a demo and should be confirmed against the final garment.`
                                  : activeProduct.specifications.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="cart-scrim" onClick={closeCart}>
          <section
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Shopping bag"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              ref={cartCloseRef}
              className="cart-close"
              type="button"
              aria-label="Close shopping bag"
              onClick={closeCart}
            >
              ×
            </button>
            <span className="showroom-eyebrow">
              YOUR SELECTION / {cartCount}
            </span>
            <h2>The bag.</h2>
            {cartLines.length ? (
              <div className="bag-lines">
                {cartLines.map((line, index) => {
                  const product = catalogProducts.find(
                    (item) => item.id === line.productId,
                  );
                  if (!product) return null;
                  return (
                    <div
                      className="bag-line"
                      key={`${line.productId}-${line.size}-${line.color}`}
                    >
                      <img src={product.imageUrl} alt="" />
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          {line.color} / {line.size} / QTY {line.quantity}
                          {line.sku ? ` / SKU ${line.sku}` : ""}
                        </span>
                        <span>
                          {formatCurrency(
                            (product.salePrice ?? product.price) *
                              line.quantity,
                            product.currency,
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name} from bag`}
                        onClick={() => removeCartLine(index)}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <p className="bag-note">
                  {API_MODE
                    ? "Prices and availability are confirmed by the store service."
                    : "Demo checkout is not connected yet."}
                </p>
              </div>
            ) : (
              <p>Your bag is waiting for something good.</p>
            )}
            <button
              type="button"
              onClick={() => {
                closeCart();
                document
                  .getElementById("collection")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              CONTINUE EXPLORING ↗
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="showroom-toast" role="status">
          {toast}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast("")}
          >
            ×
          </button>
        </div>
      )}
      <button
        className="floating-bag"
        type="button"
        aria-label={`Shopping bag, ${cartCount} items`}
        onClick={(event) => openCart(event.currentTarget)}
      >
        BAG <span>{cartCount}</span>
      </button>
    </div>
  );
}
