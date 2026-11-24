import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { catalogService } from '../../app/services';
import { ProductCard } from '../../components/ProductCard';
import { FitFinder } from '../../components/FitFinder';
import { useCommerceStore } from '../../state/commerceStore';
import { useUiStore } from '../../state/uiStore';
import { formatCurrency } from '../../utils/formatCurrency';
import { trackEvent } from '../../lib/insights';
import { useDialogFocus } from '../../lib/useDialogFocus';
import { useSeo } from '../../lib/useSeo';

const HoodieViewer = lazy(() => import('../../components/HoodieViewer').then((module) => ({ default: module.HoodieViewer })));

const RECENT_KEY = 'crewww-recently-viewed';

function rememberProduct(id: string) {
  try {
    const previous = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]') as string[];
    window.localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...previous.filter((item) => item !== id)].slice(0, 8)));
  } catch { /* Product views remain fully usable if storage is blocked. */ }
}

function readRecentIds(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const productQuery = useQuery({ queryKey: ['product', slug], queryFn: () => catalogService.getProduct(slug) });
  const product = productQuery.data;
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [details, setDetails] = useState('');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const sizeGuideRef = useRef<HTMLElement | null>(null);
  const zoomRef = useRef<HTMLDivElement | null>(null);
  const wishlist = useCommerceStore((state) => state.wishlist);
  const addCartLine = useCommerceStore((state) => state.addCartLine);
  const toggleWishlist = useCommerceStore((state) => state.toggleWishlist);
  const showNotice = useUiStore((state) => state.showNotice);

  useEffect(() => {
    if (!product) return;
    rememberProduct(product.id);
    trackEvent('product_view', { productId: product.id, productSlug: product.slug });
    const firstAvailable = product.variants?.find((variant) => variant.stockQuantity > 0);
    setSize(firstAvailable?.size ?? product.sizes[0] ?? 'ONE SIZE');
    setColor(firstAvailable?.color ?? product.colors[0]?.name ?? product.color);
    setImageIndex(0);
  }, [product?.id, product?.slug]);

  const relatedQuery = useQuery({ queryKey: ['related-products', product?.id], queryFn: () => catalogService.getRelatedProducts(product!.id, 4), enabled: Boolean(product) });
  const recentIds = useMemo(() => readRecentIds().filter((id) => id !== product?.id).slice(0, 4), [product?.id]);
  const recentQuery = useQuery({
    queryKey: ['recent-products', recentIds.join('|')],
    queryFn: () => catalogService.listProducts({ pageSize: 48 }),
    enabled: recentIds.length > 0,
  });
  const recentProducts = recentIds
    .map((id) => recentQuery.data?.items.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const gallery = useMemo(() => product ? [...new Set([...(product.galleryUrls ?? []), product.imageUrl].filter(Boolean))] : [], [product]);
  const activeColor = product?.colors.find((item) => item.name === color);
  const variants = product?.variants ?? [];
  const selectedVariant = variants.find((variant) => variant.size === size && variant.color.toLocaleLowerCase() === color.toLocaleLowerCase());
  const isSizeAvailable = (item: string) => variants.length === 0 || variants.some((variant) => variant.size === item && variant.color.toLocaleLowerCase() === color.toLocaleLowerCase() && variant.stockQuantity > 0);
  const displayPrice = selectedVariant?.salePrice ?? selectedVariant?.price ?? product?.salePrice ?? product?.price ?? 0;
  useDialogFocus(sizeGuideOpen, () => setSizeGuideOpen(false), sizeGuideRef);
  useDialogFocus(zoomOpen, () => setZoomOpen(false), zoomRef);
  const structuredData = useMemo(() => {
    if (!product || product.isPreviewData) return undefined;
    return {
      '@context': 'https://schema.org', '@type': 'Product',
      name: product.name, description: product.description,
      image: product.imageUrl ? new URL(product.imageUrl, window.location.origin).toString() : undefined,
      sku: product.variants?.[0]?.sku,
      brand: { '@type': 'Brand', name: 'CREWWW' },
      offers: {
        '@type': 'Offer',
        price: product.salePrice ?? product.price,
        priceCurrency: product.currency,
        availability: product.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
    };
  }, [product]);
  useSeo({
    title: product?.name ?? 'Piece',
    description: product?.description ?? 'Explore the Crewww edit.',
    path: product ? `/products/${product.slug}` : '/products',
    image: product?.imageUrl,
    structuredData,
  });

  if (productQuery.isPending) return <div className="catalog-skeleton product-loading" role="status" aria-busy="true">OPENING THE PIECE…</div>;
  if (productQuery.isError) return <div className="catalog-empty" role="alert"><span>THE PIECE COULD NOT LOAD</span><button type="button" onClick={() => void productQuery.refetch()}>TRY AGAIN ↗</button></div>;
  if (!product) return <div className="route-fallback storefront-page"><p className="store-eyebrow">CREWWW / NOT FOUND</p><h1>This piece<br /><em>is out of frame.</em></h1><Link to="/shop" className="text-link">BROWSE THE EDIT ↗</Link></div>;

  const saved = wishlist.includes(product.id);
  const addToBag = () => {
    if (!size) { showNotice('Choose a size before adding this piece.'); return; }
    if (selectedVariant && selectedVariant.stockQuantity <= 0) { showNotice('That size is sold out in this color. Choose another option.'); return; }
    if (selectedVariant && quantity > selectedVariant.stockQuantity) { showNotice(`Only ${selectedVariant.stockQuantity} left in this size. Reduce the quantity.`); return; }
    addCartLine({ productId: product.id, size, color, quantity, sku: selectedVariant?.sku });
    trackEvent('add_to_bag', { productId: product.id, productSlug: product.slug, sku: selectedVariant?.sku });
    showNotice(`${product.name} · ${color} · ${size} added to your bag.`);
  };

  return <div className="storefront-page product-page">
    <div className="catalog-breadcrumb"><Link to="/">HOME</Link><span> / </span><Link to="/shop">SHOP</Link><span> / </span><span>{product.name.toUpperCase()}</span></div>
    {product.isPreviewData && <p className="demo-data-note">SAMPLE PRODUCT · This record and its image, variants and price are placeholders for frontend review.</p>}
    <section className="product-detail-layout">
      <div className="product-gallery">
        {product.category === 'hoodies' && !product.isPreviewData && <div className="pdp-3d-panel"><Suspense fallback={<div className="viewer-unavailable">Loading the garment preview…</div>}><HoodieViewer color={activeColor?.value ?? '#171719'} label={product.name} artworkUrl={product.imageUrl} /></Suspense><span>ILLUSTRATIVE CREWWW GARMENT STUDY</span></div>}
        <div className="product-main-image"><img src={gallery[imageIndex] || '/images/crewww/hoodie-01.jpg'} alt={`${product.name} in ${color}`} onClick={() => setZoomOpen(true)} /><button type="button" aria-label="Zoom product image" onClick={() => setZoomOpen(true)}>＋</button></div>
        {gallery.length > 1 && <div className="product-thumbnails" role="group" aria-label="Product images">{gallery.map((image, index) => <button type="button" key={image} aria-label={`View product image ${index + 1}`} aria-pressed={imageIndex === index} onClick={() => setImageIndex(index)}><img src={image} alt="" /></button>)}</div>}
        {product.isPreviewData && <p className="product-image-caption">CAMPAIGN IMAGE / NOT A CONFIRMED PRODUCT PHOTOGRAPH</p>}
      </div>
      <div className="product-purchase-panel">
        <p className="store-eyebrow">{product.collection} / {product.category.toUpperCase()}</p>
        <h1>{product.name.replace(' · Preview', '')}</h1>
        <p className="product-short-description">{product.description}</p>
        <div className="product-price-line"><strong>{formatCurrency(displayPrice, product.currency)}</strong>{(selectedVariant?.salePrice ?? product.salePrice) && <del>{formatCurrency(selectedVariant?.price ?? product.price, product.currency)}</del>}{product.isPreviewData && <small>DEMO PRICE</small>}</div>
        <p className="availability-line" aria-live="polite">
          <i className={(selectedVariant ? selectedVariant.stockQuantity > 0 : product.available) ? '' : 'is-unavailable'} />
          {selectedVariant ? selectedVariant.stockQuantity > 0 ? `IN STOCK · ${selectedVariant.stockQuantity <= 5 ? `ONLY ${selectedVariant.stockQuantity} LEFT` : 'READY TO SHIP'}` : 'SOLD OUT IN THIS OPTION' : product.available ? 'PREVIEW AVAILABILITY' : 'CURRENTLY UNAVAILABLE'}
          <span>{selectedVariant ? ` · SKU ${selectedVariant.sku}` : ' · No live stock connection'}</span>
        </p>
        <div className="product-option-block"><div className="product-option-heading"><span>COLOR</span><span>{color}</span></div><div className="product-color-options">{product.colors.map((item) => <button key={item.name} type="button" aria-label={`Choose color ${item.name}`} aria-pressed={color === item.name} title={item.name} style={{ '--swatch': item.value } as CSSProperties} onClick={() => setColor(item.name)} />)}</div></div>
        <div className="product-option-block"><div className="product-option-heading"><span>SIZE / AGE</span><button type="button" onClick={() => setSizeGuideOpen(true)}>SIZE GUIDE ↗</button></div><div className="product-size-options">{product.sizes.map((item) => <button key={item} type="button" aria-pressed={size === item} disabled={!isSizeAvailable(item)} title={isSizeAvailable(item) ? undefined : 'Unavailable in this color'} onClick={() => setSize(item)}>{item}</button>)}</div>{product.ageBand && <small>AGE RANGE / {product.ageBand} · DEMO GUIDE</small>}{product.fit && <small>FIT / {product.fit} · {product.wash} · DEMO GUIDE</small>}<FitFinder sizes={product.sizes} fit={product.fit} wash={product.wash} ageBand={product.ageBand} productSlug={product.slug} selected={size} onPick={setSize} /></div>
        <div className="product-purchase-actions"><div className="product-quantity"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((count) => Math.max(1, count - 1))}>−</button><span aria-live="polite">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((count) => count + 1)}>+</button></div><button className="primary-store-button" type="button" onClick={addToBag}>ADD TO BAG — {formatCurrency(displayPrice * quantity, product.currency)} ↗</button></div>
        <div className="mobile-buy-bar"><span><b>{product.name}</b><small>{formatCurrency(displayPrice, product.currency)}</small></span><button type="button" onClick={addToBag}>ADD TO BAG ↗</button></div>
        <button className={`product-save-button${saved ? ' is-saved' : ''}`} type="button" aria-pressed={saved} onClick={() => { toggleWishlist(product.id); showNotice(saved ? 'Removed from saved pieces.' : 'Saved to your wishlist.'); }}>{saved ? '♥ SAVED TO YOUR WISHLIST' : '♡ SAVE TO YOUR WISHLIST'}</button>
        <div className="product-purchase-notes"><p>DELIVERY / OPTIONS WILL BE CONFIRMED WHEN STORE DETAILS ARE APPROVED.</p><Link to="/shipping">SHIPPING & RETURNS ↗</Link></div>
        <div className="product-details-accordion">{(['Description', 'Materials & care', 'Fit & measurements', 'Delivery & returns'] as const).map((item) => <div key={item}><button type="button" aria-expanded={details === item} onClick={() => setDetails(details === item ? '' : item)}>{item}<span>{details === item ? '−' : '+'}</span></button>{details === item && <p>{item === 'Description' ? product.description : item === 'Materials & care' ? `${product.specifications.material} ${product.specifications.care}` : item === 'Fit & measurements' ? `${product.specifications.fit} ${product.fit ? `Candidate fit: ${product.fit}.` : ''} Sizing must be confirmed against a production sample.` : 'Delivery regions, charges and return terms are preview content and require owner confirmation.'}</p>}</div>)}</div>
        <Link className="text-link" to="/find-stores">FIND A CREWWW STORE ↗</Link>
      </div>
    </section>
    <section className="related-products"><div className="catalog-route-heading"><p className="store-eyebrow">KEEP EXPLORING / SAME EDIT</p><Link to="/shop">VIEW ALL ↗</Link></div>{relatedQuery.data?.length ? <div className="store-product-grid">{relatedQuery.data.map((item) => <ProductCard key={item.id} product={item} />)}</div> : <div className="related-empty">New pieces for this edit are in preview.</div>}</section>
    {recentProducts.length > 0 && <section className="related-products recently-viewed-products"><div className="catalog-route-heading"><p className="store-eyebrow">YOUR TRAIL / RECENTLY VIEWED</p><span>BACK TO WHERE YOU LEFT OFF</span></div><div className="store-product-grid">{recentProducts.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    {sizeGuideOpen && <div className="store-modal-backdrop" onClick={() => setSizeGuideOpen(false)}><section ref={sizeGuideRef} className="size-guide-modal" role="dialog" aria-modal="true" aria-labelledby="size-guide-title" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close size guide" onClick={() => setSizeGuideOpen(false)}>×</button><p className="store-eyebrow">CREWWW / SIZE NOTES</p><h2 id="size-guide-title">Find your <em>fit.</em></h2><p>{product.specifications.fit} This sample size guide is illustrative. Compare measurements with a garment that fits you; final Crewww measurements need owner confirmation.</p><div className="size-guide-row"><span>SIZE</span><span>{product.sizes.join(' · ')}</span></div><Link to={product.category === 'denim' ? '/denim/fits' : '/support'} onClick={() => setSizeGuideOpen(false)}>MORE FIT HELP ↗</Link></section></div>}
    {zoomOpen && <div ref={zoomRef} className="image-zoom-backdrop" role="dialog" aria-modal="true" aria-label={`${product.name} image zoom`} onClick={() => setZoomOpen(false)}><button type="button" aria-label="Close image zoom" onClick={() => setZoomOpen(false)}>×</button><img src={gallery[imageIndex] || '/images/crewww/hoodie-01.jpg'} alt={`${product.name} detail`} /></div>}
  </div>;
}
