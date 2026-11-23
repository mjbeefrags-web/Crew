import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '../domain/product';
import { API_MODE } from '../config/runtime';
import { useAuthStore } from '../state/authStore';
import { useCommerceStore } from '../state/commerceStore';
import { useUiStore } from '../state/uiStore';
import { formatCurrency } from '../utils/formatCurrency';

export function ProductCard({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const wishlist = useCommerceStore((state) => state.wishlist);
  const toggleWishlist = useCommerceStore((state) => state.toggleWishlist);
  const addCartLine = useCommerceStore((state) => state.addCartLine);
  const showNotice = useUiStore((state) => state.showNotice);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const saved = wishlist.includes(product.id);

  const quickAdd = () => {
    addCartLine({ productId: product.id, size: product.sizes[0] ?? 'ONE SIZE', color: product.colors[0]?.name ?? product.color, quantity: 1 });
    showNotice(`${product.name} added to your preview bag.`);
  };

  return <article className="store-product-card">
    <div className="store-product-media">
      <Link to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
        {product.imageUrl && !failed
          ? <img src={product.imageUrl} alt={`${product.name} · ${product.color}`} loading="lazy" onError={() => setFailed(true)} />
          : <div className={`store-product-placeholder placeholder-${product.category}`} aria-hidden="true"><span>CREWWW</span><i>{product.category.toUpperCase()}</i></div>}
      </Link>
      {product.isPreviewData && <span className="preview-tag">SAMPLE</span>}
      {product.isNew && <span className="store-product-tag">NEW</span>}
      <button className={`store-wishlist${saved ? ' is-saved' : ''}`} type="button" aria-label={`${saved ? 'Remove' : 'Add'} ${product.name} ${saved ? 'from' : 'to'} wishlist`} aria-pressed={saved} onClick={() => { if (API_MODE && !user) { showNotice('Sign in to save pieces to your wishlist.'); navigate('/login'); return; } toggleWishlist(product.id); showNotice(saved ? 'Removed from your wishlist.' : 'Saved to your wishlist.'); }}>{saved ? '♥' : '♡'}</button>
    </div>
    <div className="store-product-copy">
      <p>{product.collection.replace('CREWWW / ', '')}</p>
      <div><Link to={`/products/${product.slug}`}>{product.name}</Link><span>{formatCurrency(product.salePrice ?? product.price, product.currency)}</span></div>
      {product.salePrice && <small className="sale-price">WAS {formatCurrency(product.price, product.currency)}</small>}
      {product.fit && <small>{product.fit} · {product.wash}</small>}
    </div>
    <button className="quick-add" type="button" onClick={quickAdd}>QUICK ADD <span>↗</span></button>
  </article>;
}
