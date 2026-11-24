import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { catalogService } from '../../app/services';
import { ProductCard } from '../../components/ProductCard';
import { trackEvent } from '../../lib/insights';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [term, setTerm] = useState(params.get('q') ?? '');
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = useQuery({ queryKey: ['search-page', params.get('q')], queryFn: () => catalogService.listProducts({ term: params.get('q') ?? '', pageSize: 48 }), enabled: params.has('q') });
  const suggestions = useQuery({ queryKey: ['search-suggestions', term], queryFn: () => catalogService.suggestProducts(term, 6), enabled: term.trim().length > 1 && term !== params.get('q') });
  const showSuggestions = Boolean(suggestions.data?.length && term !== params.get('q'));
  const items = suggestions.data ?? [];

  useEffect(() => { setActiveIndex(-1); }, [term]);

  const submitSearch = (value: string) => {
    const searchTerm = value.trim();
    if (searchTerm) trackEvent('search', { query: searchTerm });
    setParams(searchTerm ? { q: searchTerm } : {});
  };

  const onSuggestionKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, items.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); navigate(`/products/${items[activeIndex].slug}`); }
    else if (event.key === 'Escape') { setActiveIndex(-1); }
  };

  return <div className="storefront-page search-page">
    <section className="simple-page-hero"><p className="store-eyebrow">CREWWW / FIND YOUR PIECE</p><h1>Search the <em>edit.</em></h1><form className="big-search-form" onSubmit={(event) => { event.preventDefault(); submitSearch(term); }}><label htmlFor="store-search">WHAT ARE YOU LOOKING FOR?</label><div><input
      id="store-search" type="search" value={term} onChange={(event) => setTerm(event.target.value)}
      role="combobox" aria-expanded={showSuggestions} aria-controls="search-suggestions" aria-autocomplete="list"
      aria-activedescendant={showSuggestions && activeIndex >= 0 ? `search-suggestion-${items[activeIndex].id}` : undefined}
      onKeyDown={onSuggestionKeyDown} placeholder="Try a color, fit or collection"
    /><button type="submit" aria-label="Search">↗</button></div></form>
      {showSuggestions && <div id="search-suggestions" className="search-suggestions search-page-suggestions" role="listbox" aria-label="Suggested pieces">{items.map((product, index) => <Link
        id={`search-suggestion-${product.id}`} role="option" aria-selected={activeIndex === index}
        to={`/products/${product.slug}`} key={product.id}
        onMouseEnter={() => setActiveIndex(index)}
      >{product.name}<span>{product.collection}</span></Link>)}</div>}
    </section>
    <section className="search-results-section" aria-live="polite">{!params.has('q') ? <div className="catalog-empty"><span>SEARCH CREWWW</span><p>Search names, categories, collections or fit.</p><div className="quick-search-links"><Link to="/new-arrivals">New arrivals ↗</Link><Link to="/denim">Denim fits ↗</Link><Link to="/kids">Kids ↗</Link></div></div> : query.isPending ? <div className="catalog-skeleton" role="status" aria-busy="true">SEARCHING THE EDIT…</div> : query.isError ? <div className="catalog-empty" role="alert"><span>SEARCH IS UNAVAILABLE</span><button type="button" onClick={() => void query.refetch()}>TRY AGAIN ↗</button></div> : <><div className="catalog-route-heading"><p className="store-eyebrow">{query.data.total} RESULTS / “{params.get('q')}”</p><Link to="/shop">BROWSE EVERYTHING ↗</Link></div>{query.data.items.length ? <div className="store-product-grid search-result-grid">{query.data.items.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><span>NO PIECES FOUND</span><p>Try a shorter search or browse the latest edit.</p><Link className="text-link" to="/new-arrivals">SEE NEW ARRIVALS ↗</Link></div>}</>}</section>
  </div>;
}
