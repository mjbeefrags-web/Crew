import { useMemo, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { catalogService } from "../../app/services";
import { ProductCard } from "../../components/ProductCard";
import type { ProductQuery } from "../../domain/service";
import type { CatalogRoute } from "../../data/mock/storefront";
import { formatCurrency } from "../../utils/formatCurrency";
import { useSeo } from "../../lib/useSeo";

const PAGE_STEP = 12;
const SORTS: readonly ProductQuery["sort"][] = [
  "featured",
  "newest",
  "popular",
  "price-asc",
  "price-desc",
  "name",
];

/**
 * Catalog state lives in the URL. Filters, sort and load-more are shareable,
 * survive refresh, and work with browser back/forward.
 */
export function CatalogPage({ route }: { route: CatalogRoute }) {
  const [params, setParams] = useSearchParams();
  const read = (key: string) => params.get(key) ?? "";
  const term = read("q");
  const collectionFilter = read("collection");
  const size = read("size");
  const color = read("color");
  const fit = read("fit");
  const wash = read("wash");
  const inStock = read("stock") === "1";
  const minPrice = read("min");
  const maxPrice = read("max");
  const sortValue = read("sort");
  const sort: ProductQuery["sort"] = SORTS.includes(
    sortValue as ProductQuery["sort"],
  )
    ? (sortValue as ProductQuery["sort"])
    : "featured";
  const showValue = Number(read("show"));
  const visibleCount =
    Number.isFinite(showValue) && showValue > 0
      ? Math.min(showValue, 48)
      : PAGE_STEP;
  useSeo({
    title: route.title,
    description: route.description,
    path: route.path + (params.toString() ? `?${params}` : ""),
  });

  const update = (
    key: string,
    value: string,
    options: { resetShow?: boolean; replace?: boolean } = {},
  ) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (options.resetShow !== false) next.delete("show");
    // Discrete choices push history so Back restores the previous view;
    // free-text typing replaces so one keystroke is not one history entry.
    setParams(next, { replace: options.replace === true });
  };
  const clear = () => setParams(new URLSearchParams(), { replace: true });

  const query = useMemo<ProductQuery>(
    () => ({
      ...route.query,
      collection: collectionFilter || route.query.collection,
      term: term.trim() || undefined,
      size: size || undefined,
      color: color || undefined,
      fit: fit || undefined,
      wash: wash || undefined,
      inStock: inStock || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
    }),
    [
      route.query,
      collectionFilter,
      term,
      size,
      color,
      fit,
      wash,
      inStock,
      minPrice,
      maxPrice,
      sort,
    ],
  );

  const productsQuery = useQuery({
    queryKey: ["catalog", route.path, query, visibleCount],
    queryFn: () =>
      catalogService.listProducts({
        ...query,
        page: 1,
        pageSize: visibleCount,
      }),
  });
  const products = productsQuery.data?.items ?? [];
  const loadedProductsQuery = useQuery({
    queryKey: ["catalog-facets", route.path],
    queryFn: () =>
      catalogService.listProducts({ ...route.query, pageSize: 48 }),
  });
  const loadedProducts = loadedProductsQuery.data?.items ?? [];
  const sizes = [
    ...new Set(loadedProducts.flatMap((product) => product.sizes)),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const colors = [
    ...new Set(
      loadedProducts.flatMap((product) =>
        product.colors.map((item) => item.name),
      ),
    ),
  ].sort();
  const fits = [
    ...new Set(
      loadedProducts
        .map((product) => product.fit)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const washes = [
    ...new Set(
      loadedProducts
        .map((product) => product.wash)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const collections = [
    ...new Set(loadedProducts.map((product) => product.collection)),
  ];
  const activeFilters = [
    collectionFilter
      ? collectionFilter
          .replace("CREWWW / ", "")
          .replace("DEMO / ", "SAMPLE / ")
      : "",
    size,
    color,
    fit,
    wash,
    inStock ? "In stock" : "",
    minPrice ? `From ${formatCurrency(Number(minPrice), "USD")}` : "",
    maxPrice ? `To ${formatCurrency(Number(maxPrice), "USD")}` : "",
  ].filter(Boolean);
  const removeFilter = (filter: string) => {
    if (
      filter ===
        collectionFilter
          .replace("CREWWW / ", "")
          .replace("DEMO / ", "SAMPLE / ") &&
      collectionFilter
    )
      update("collection", "");
    else if (filter === "In stock") update("stock", "");
    else if (filter.startsWith("From")) update("min", "");
    else if (filter.startsWith("To")) update("max", "");
    else if (filter === size) update("size", "");
    else if (filter === color) update("color", "");
    else if (filter === fit) update("fit", "");
    else if (filter === wash) update("wash", "");
  };

  return (
    <main className="catalog-route storefront-page">
      <section
        className="route-campaign"
        style={{ "--route-image": `url("${route.image}")` } as CSSProperties}
      >
        <div className="route-campaign-shade" />
        <div className="route-campaign-copy">
          <p className="store-eyebrow">{route.eyebrow}</p>
          <h1>{route.title}</h1>
          <p>{route.description}</p>
        </div>
        <span className="route-campaign-index">
          CREWWW /{" "}
          {String(
            route.path.split("/").filter(Boolean).at(-1) ?? "SHOP",
          ).toUpperCase()}
        </span>
      </section>
      <div className="catalog-breadcrumb">
        <Link to="/">HOME</Link>
        <span> / </span>
        <span>{route.eyebrow.split(" / ").at(-1)}</span>
      </div>
      {route.demoNote && (
        <p className="demo-data-note">DEVELOPMENT PREVIEW · {route.demoNote}</p>
      )}
      <div className="catalog-route-heading">
        <p className="store-eyebrow">
          {productsQuery.data?.total ?? "—"} PIECES / CURRENT VIEW
        </p>
        <Link to="/search">
          SEARCH THE EDIT <span>↗</span>
        </Link>
      </div>

      {route.path === "/denim" && (
        <nav className="fit-shortcuts" aria-label="Denim fit guide">
          <span>FIND YOUR FIT</span>
          <Link to="/denim/fits">COMPARE ALL FIVE FITS ↗</Link>
          {["Straight", "Slim", "Relaxed", "Wide-leg", "Baggy"].map((item) => (
            <Link
              key={item}
              to={`/denim/fits/${item.toLowerCase().replace(" ", "-")}`}
            >
              {item}
            </Link>
          ))}
        </nav>
      )}
      {route.path === "/clothes" && (
        <nav className="catalog-subcategories" aria-label="Clothing categories">
          {[
            "tops",
            "bottoms",
            "t-shirts",
            "hoodies",
            "sweatshirts",
            "shirts",
            "jackets",
            "trousers",
            "shorts",
          ].map((item) => (
            <Link key={item} to={`/clothes/${item}`}>
              {item.replace("-", " ")}
            </Link>
          ))}
        </nav>
      )}

      <section
        className="catalog-results"
        aria-label={`${route.title} product results`}
      >
        <aside className="catalog-filter-panel" aria-label="Filter products">
          <div className="filter-heading">
            <span>REFINE</span>
            <button type="button" onClick={clear}>
              CLEAR ALL
            </button>
          </div>
          <label className="catalog-filter-field">
            <span>SEARCH</span>
            <input
              type="search"
              value={term}
              onChange={(event) =>
                update("q", event.target.value, { replace: true })
              }
              placeholder="Pieces, fits, collections"
              aria-label="Search this category"
            />
          </label>
          {route.filters?.includes("collection") && collections.length > 1 && (
            <label className="catalog-filter-field">
              <span>COLLECTION</span>
              <select
                value={collectionFilter}
                aria-label="Filter collection"
                onChange={(event) => update("collection", event.target.value)}
              >
                <option value="">All collections</option>
                {collections.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection
                      .replace("CREWWW / ", "")
                      .replace("DEMO / ", "SAMPLE / ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          {route.filters?.includes("size") && (
            <label className="catalog-filter-field">
              <span>SIZE / AGE</span>
              <select
                aria-label="Filter size"
                value={size}
                onChange={(event) => update("size", event.target.value)}
              >
                <option value="">Any size</option>
                {sizes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {route.filters?.includes("color") && (
            <label className="catalog-filter-field">
              <span>COLOR</span>
              <select
                aria-label="Filter color"
                value={color}
                onChange={(event) => update("color", event.target.value)}
              >
                <option value="">All colors</option>
                {colors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {route.filters?.includes("fit") && (
            <label className="catalog-filter-field">
              <span>DENIM FIT</span>
              <select
                aria-label="Filter fit"
                value={fit}
                onChange={(event) => update("fit", event.target.value)}
              >
                <option value="">All fits</option>
                {fits.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {route.filters?.includes("wash") && (
            <label className="catalog-filter-field">
              <span>WASH</span>
              <select
                aria-label="Filter wash"
                value={wash}
                onChange={(event) => update("wash", event.target.value)}
              >
                <option value="">All washes</option>
                {washes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {route.filters?.includes("price") && (
            <fieldset className="catalog-price-filter">
              <legend>PRICE RANGE</legend>
              <label>
                MIN
                <input
                  aria-label="Minimum price"
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(event) =>
                    update("min", event.target.value, { replace: true })
                  }
                  placeholder="$0"
                />
              </label>
              <label>
                MAX
                <input
                  aria-label="Maximum price"
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) =>
                    update("max", event.target.value, { replace: true })
                  }
                  placeholder="$250"
                />
              </label>
            </fieldset>
          )}
          {route.filters?.includes("availability") && (
            <label className="availability-filter">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(event) =>
                  update("stock", event.target.checked ? "1" : "")
                }
              />{" "}
              Available pieces only
            </label>
          )}
        </aside>
        <div className="catalog-grid-area">
          <div className="catalog-toolbar">
            <p role="status" aria-live="polite">
              {productsQuery.data?.total ?? 0} PIECES
            </p>
            <div>
              {activeFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className="active-filter"
                  onClick={() => removeFilter(filter)}
                >
                  {filter} ×
                </button>
              ))}
            </div>
            <label>
              SORT{" "}
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(event) =>
                  update(
                    "sort",
                    event.target.value === "featured" ? "" : event.target.value,
                  )
                }
              >
                {SORTS.map((value) => (
                  <option key={value} value={value}>
                    {value === "featured"
                      ? "Featured"
                      : value === "newest"
                        ? "New arrivals"
                        : value === "popular"
                          ? "Popular"
                          : value === "price-asc"
                            ? "Price: low to high"
                            : value === "price-desc"
                              ? "Price: high to low"
                              : "Name"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {productsQuery.isPending && (
            <div className="catalog-skeleton" role="status" aria-busy="true">
              LOADING THE EDIT…
            </div>
          )}
          {productsQuery.isError && (
            <div className="catalog-empty" role="alert">
              <span>THE EDIT IS UNAVAILABLE</span>
              <p>Try loading the sample catalog again.</p>
              <button
                type="button"
                onClick={() => void productsQuery.refetch()}
              >
                RETRY ↗
              </button>
            </div>
          )}
          {!productsQuery.isPending &&
            !productsQuery.isError &&
            products.length > 0 && (
              <div className="store-product-grid">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          {!productsQuery.isPending &&
            !productsQuery.isError &&
            products.length === 0 && (
              <div className="catalog-empty">
                <span>NOTHING IN THIS EDIT</span>
                <p>Try a different term or remove a filter.</p>
                <button type="button" onClick={clear}>
                  CLEAR FILTERS ↗
                </button>
              </div>
            )}
          {productsQuery.data && products.length < productsQuery.data.total && (
            <button
              className="load-more-button"
              type="button"
              onClick={() =>
                update("show", String(visibleCount + PAGE_STEP), {
                  resetShow: false,
                })
              }
            >
              LOAD MORE PIECES{" "}
              <span>({productsQuery.data.total - products.length} REMAIN)</span>{" "}
              ↓
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
