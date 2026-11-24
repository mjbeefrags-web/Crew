import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogService } from "../app/services";
import { useUiStore } from "../state/uiStore";

type CommandItem = { key: string; label: string; href: string };

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem("crewww:search-history");
    return raw ? JSON.parse(raw) as string[] : [];
  } catch {
    return [];
  }
}

function writeHistory(raw: string) {
  const term = raw.trim();
  if (!term) return;
  try {
    const next = [term, ...readHistory().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    localStorage.setItem("crewww:search-history", JSON.stringify(next));
  } catch {
    /* localStorage unavailable; history is best-effort. */
  }
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [featured, setFeatured] = useState<CommandItem[]>([]);
  const [history, setHistory] = useState<string[]>(readHistory);
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const showNotice = useUiStore((state) => state.showNotice);

  const close = useCallback(() => {
    setIsOpen(false);
    setTerm("");
  }, []);

  const open = useCallback((initialTerm = "") => {
    setTerm(initialTerm);
    setIsOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        isOpen ? close() : open();
      } else if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        const target = event.target as HTMLElement | null;
        if (!target?.closest("input, textarea, select, button, a")) {
          event.preventDefault();
          open("/");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, open, close]);

  useEffect(() => {
    let cancelled = false;
    const query = term.trim().toLowerCase();
    setCursor(0);
    if (!query) {
      catalogService.listFeaturedProducts()
        .then((products) => {
          if (cancelled) return;
          setFeatured(products.slice(0, 8).map((product) => ({
            key: `product-${product.slug}`,
            label: product.name,
            href: `/products/${product.slug}`,
          })));
        })
        .catch(() => undefined);
      return () => { cancelled = true; };
    }
    // Debounce search
    const id = window.setTimeout(() => {
      catalogService.suggestProducts(query, 8)
        .then((products) => {
          if (cancelled) return;
          setFeatured(products.map((product) => ({ key: `product-${product.slug}`, label: product.name, href: `/products/${product.slug}` })));
        })
        .catch(() => undefined);
    }, 120);
    return () => { cancelled = true; window.clearTimeout(id); };
  }, [term]);

  const recent: CommandItem[] = useMemo(
    () => history.slice(0, 6).map((path) => ({ key: `recent-${path}`, label: path.replace(/^\//, ""), href: path })),
    [history]
  );
  const results = featured;

  const activate = (item: CommandItem) => {
    writeHistory(item.href);
    setHistory(readHistory());
    navigate(item.href);
    close();
  };

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="command-palette">
        <input
          ref={inputRef}
          className="command-palette-input"
          type="search"
          value={term}
          placeholder="Search pieces, drops, and more…"
          aria-label="Command palette search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="command-palette-list"
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { close(); return; }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((c) => Math.min(results.length - 1, c + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const item = results[cursor];
              if (item) activate(item);
              else showNotice("No results — try a different term.");
            }
          }}
        />
        <ul
          ref={listRef}
          id="command-palette-list"
          className="command-palette-list"
          role="listbox"
          aria-label="Results"
        >
          {results.length === 0 && (
            <li className="command-palette-empty">
              {term ? "No results — try a different term." : history.length ? "Recent searches:" : "Try \"Hoodie\" or a colourway name."}
            </li>
          )}
          {!term && recent.map((item, index) => (
            <li key={item.href}>
              <button type="button" className={index === cursor ? "is-active" : ""} onClick={() => activate(item)}>
                ⌀ {item.label}
              </button>
            </li>
          ))}
          {results.map((item, index) => (
            <li key={item.href}>
              <button type="button" className={index === cursor ? "is-active" : ""} onClick={() => activate(item)}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="command-palette-hint" aria-live="polite">
          ⌥ ESC · ↑↓ to move · ↵ to open
        </div>
      </div>
    </div>
  );
}
