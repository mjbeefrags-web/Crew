import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { catalogService } from '../../app/services';
import { ProductCard } from '../../components/ProductCard';
import type { ProductQuery } from '../../domain/service';
import type { CatalogRoute } from '../../data/mock/storefront';
import { formatCurrency } from '../../utils/formatCurrency';

const PAGE_STEP = 12;

export function CatalogPage({ route }: { route: CatalogRoute }) {
  const [term, setTerm] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
  const [collectionFilter, setCollectionFilter] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [fit, setFit] = useState('');
  const [wash, setWash] = useState('');
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<ProductQuery['sort']>('featured');
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  const query = useMemo<ProductQuery>(() => ({
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
  }), [route.query, collectionFilter, term, size, color, fit, wash, inStock, minPrice, maxPrice, sort]);

  const productsQuery = useQuery({
    queryKey: ['catalog', route.path, query, visibleCount],
    queryFn: () => catalogService.listProducts({ ...query, page: 1, pageSize: visibleCount }),
  });
  const suggestionsQuery = useQuery({
    queryKey: ['catalog-suggestions', term],
    queryFn: () => catalogService.suggestProducts(term),
    enabled: term.trim().length > 1,
  });
  const products = productsQuery.data?.items ?? [];
  const loadedProductsQuery = useQuery({
    queryKey: ['catalog-facets', route.path],
    queryFn: () => catalogService.listProducts({ ...route.query, pageSize: 48 }),
  });
  const loadedProducts = loadedProductsQuery.data?.items ?? [];
  const sizes = [...new Set(loadedProducts.flatMap((product) => product.sizes))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const colors = [...new Set(loadedProducts.flatMap((product) => product.colors.map((item) => item.name)))].sort();
  const fits = [...new Set(loadedProducts.map((product) => product.fit).filter((value): value is string => Boolean(value)))];
  const washes = [...new Set(loadedProducts.map((product) => product.wash).filter((value): value is string => Boolean(value)))];
  const collections = [...new Set(loadedProducts.map((product) => product.collection))];
  const activeFilters = [size, color, fit, wash, inStock ? 'In stock' : '', minPrice ? `From ${formatCurrency(Number(minPrice), 'USD')}` : '', maxPrice ? `To ${formatCurrency(Number(maxPrice), 'USD')}` : ''].filter(Boolean);
  const clear = () => { setSize(''); setColor(''); setFit(''); setWash(''); setInStock(false); setMinPrice(''); setMaxPrice(''); setSort('featured'); setTerm(''); setVisibleCount(PAGE_STEP); };

  return <main className="catalog-route storefront-page">
    <section className="route-campaign" style={{ '--route-image': `url("${route.image}")` } as CSSProperties}>
      <div className="route-campaign-shade" />
      <div className="route-campaign-copy"><p className="store-eyebrow">{route.eyebrow}</p><h1>{route.title}</h1><p>{route.description}</p></div>
      <span className="route-campaign-index">CREWWW / {String(route.path.split('/').filter(Boolean).at(-1) ?? 'SHOP').toUpperCase()}</span>
    </section>
    <div className="catalog-breadcrumb"><Link to="/">HOME</Link><span> / </span><span>{route.eyebrow.split(' / ').at(-1)}</span></div>
    {route.demoNote && <p className="demo-data-note">DEVELOPMENT PREVIEW · {route.demoNote}</p>}
    <div className="catalog-route-heading"><p className="store-eyebrow">{productsQuery.data?.total ?? '—'} PIECES / CURRENT VIEW</p><Link to="/search">SEARCH THE EDIT <span>↗</span></Link></div>

    {route.path === '/denim' && <nav className="fit-shortcuts" aria-label="Denim fit guide"><span>FIND YOUR FIT</span><Link to="/denim/fits">COMPARE ALL FIVE FITS ↗</Link>{['Straight', 'Slim', 'Relaxed', 'Wide-leg', 'Baggy'].map((item) => <Link key={item} to={`/denim/fits/${item.toLowerCase().replace(' ', '-')}`}>{item}</Link>)}</nav>}
    {route.path === '/clothes' && <nav className="catalog-subcategories" aria-label="Clothing categories">{['tops', 'bottoms', 't-shirts', 'hoodies', 'sweatshirts', 'shirts', 'jackets', 'trousers', 'shorts'].map((item) => <Link key={item} to={item === 'tops' || item === 'bottoms' ? `/clothes/${item}` : `/clothes/${item}`}>{item.replace('-', ' ')}</Link>)}</nav>}

    <section className="catalog-results" aria-label={`${route.title} product results`}>
      <aside className="catalog-filter-panel" aria-label="Filter products">
        <div className="filter-heading"><span>REFINE</span><button type="button" onClick={clear}>CLEAR ALL</button></div>
        <label className="catalog-filter-field"><span>SEARCH</span><input type="search" value={term} onChange={(event) => { setTerm(event.target.value); setVisibleCount(PAGE_STEP); }} placeholder="Pieces, fits, collections" aria-label="Search this category" />
          {suggestionsQuery.data && suggestionsQuery.data.length > 0 && term.trim().length > 1 && <div className="search-suggestions" role="listbox" aria-label="Search suggestions">{suggestionsQuery.data.map((product) => <Link role="option" key={product.id} to={`/products/${product.slug}`}>{product.name}<span>{product.category}</span></Link>)}</div>}
        </label>
        {route.filters?.includes('collection') && collections.length > 1 && <label className="catalog-filter-field"><span>COLLECTION</span><select value={collectionFilter} aria-label="Filter collection" onChange={(event) => { setCollectionFilter(event.target.value); setVisibleCount(PAGE_STEP); }}><option value="">All collections</option>{collections.map((collection) => <option key={collection} value={collection}>{collection.replace('CREWWW / ', '').replace('DEMO / ', 'SAMPLE / ')}</option>)}</select></label>}
        {route.filters?.includes('size') && <label className="catalog-filter-field"><span>SIZE / AGE</span><select aria-label="Filter size" value={size} onChange={(event) => setSize(event.target.value)}><option value="">Any size</option>{sizes.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {route.filters?.includes('color') && <label className="catalog-filter-field"><span>COLOR</span><select aria-label="Filter color" value={color} onChange={(event) => setColor(event.target.value)}><option value="">All colors</option>{colors.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {route.filters?.includes('fit') && <label className="catalog-filter-field"><span>DENIM FIT</span><select aria-label="Filter fit" value={fit} onChange={(event) => setFit(event.target.value)}><option value="">All fits</option>{fits.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {route.filters?.includes('wash') && <label className="catalog-filter-field"><span>WASH</span><select aria-label="Filter wash" value={wash} onChange={(event) => setWash(event.target.value)}><option value="">All washes</option>{washes.map((item) => <option key={item}>{item}</option>)}</select></label>}
        {route.filters?.includes('price') && <fieldset className="catalog-price-filter"><legend>PRICE RANGE</legend><label>MIN<input aria-label="Minimum price" type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="$0" /></label><label>MAX<input aria-label="Maximum price" type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder="$250" /></label></fieldset>}
        {route.filters?.includes('availability') && <label className="availability-filter"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /> Available pieces only</label>}
      </aside>
      <div className="catalog-grid-area">
        <div className="catalog-toolbar"><p role="status" aria-live="polite">{productsQuery.data?.total ?? 0} PIECES</p><div>{activeFilters.map((filter) => <button key={filter} type="button" className="active-filter" onClick={() => { if (filter === 'In stock') setInStock(false); else if (filter.startsWith('From')) setMinPrice(''); else if (filter.startsWith('To')) setMaxPrice(''); else if (filter === size) setSize(''); else if (filter === color) setColor(''); else if (filter === fit) setFit(''); else if (filter === wash) setWash(''); }}>{filter} ×</button>)}</div><label>SORT <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as ProductQuery['sort'])}><option value="featured">Featured</option><option value="newest">New arrivals</option><option value="popular">Popular</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label></div>
        {productsQuery.isPending && <div className="catalog-skeleton" role="status" aria-busy="true">LOADING THE EDIT…</div>}
        {productsQuery.isError && <div className="catalog-empty" role="alert"><span>THE EDIT IS UNAVAILABLE</span><p>Try loading the sample catalog again.</p><button type="button" onClick={() => void productsQuery.refetch()}>RETRY ↗</button></div>}
        {!productsQuery.isPending && !productsQuery.isError && products.length > 0 && <div className="store-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
        {!productsQuery.isPending && !productsQuery.isError && products.length === 0 && <div className="catalog-empty"><span>NOTHING IN THIS EDIT</span><p>Try a different term or remove a filter.</p><button type="button" onClick={clear}>CLEAR FILTERS ↗</button></div>}
        {productsQuery.data && products.length < productsQuery.data.total && <button className="load-more-button" type="button" onClick={() => setVisibleCount((count) => count + PAGE_STEP)}>LOAD MORE PIECES <span>({productsQuery.data.total - products.length} REMAIN)</span> ↓</button>}
      </div>
    </section>
  </main>;

}
