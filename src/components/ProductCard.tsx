import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Product } from "../domain/product";
import { API_MODE } from "../config/runtime";
import { useAuthStore } from "../state/authStore";
import { useCommerceStore } from "../state/commerceStore";
import { useUiStore } from "../state/uiStore";
import { formatCurrency } from "../utils/formatCurrency";

export function ProductCard({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const wishlist = useCommerceStore((state) => state.wishlist);
  const toggleWishlist = useCommerceStore((state) => state.toggleWishlist);
  const addCartLine = useCommerceStore((state) => state.addCartLine);
  const showNotice = useUiStore((state) => state.showNotice);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const saved = wishlist.includes(product.id);

  const sizes = product.sizes.length ? product.sizes : ["ONE SIZE"];

  const addSize = (chosenSize: string) => {
    addCartLine({
      productId: product.id,
      size: chosenSize,
      color: product.colors[0]?.name ?? product.color,
      quantity: 1,
    });
    setSizeOpen(false);
    showNotice(`${product.name} · ${chosenSize} added to your preview cart.`);
  };

  // The `+` on the product image is a one-press add. It uses the first
  // in-stock variant (or the first size) so shoppers are never blocked by a
  // size picker just to get a piece into the cart.
  const quickAddToCart = () => {
    const inStock = product.variants?.find((variant) => variant.stockQuantity > 0);
    const chosenSize = inStock?.size ?? sizes[0];
    const chosenColor =
      inStock?.color ?? product.colors[0]?.name ?? product.color;
    addCartLine({
      productId: product.id,
      size: chosenSize,
      color: chosenColor,
      quantity: 1,
    });
    setSizeOpen(false);
    showNotice(`${product.name} · ${chosenSize} added to your cart.`);
  };

  return (
    <article className="store-product-card">
      <div className="store-product-media" data-tilt data-parallax>
        <Link
          to={`/products/${product.slug}`}
          aria-label={`View ${product.name}`}
        >
          {product.imageUrl && !failed ? (
            <img
              src={product.imageUrl}
              alt={`${product.name} · ${product.color}`}
              width={800}
              height={1052}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            <div
              className={`store-product-placeholder placeholder-${product.category}`}
              aria-hidden="true"
            >
              <span>CREWWW</span>
              <i>{product.category.toUpperCase()}</i>
            </div>
          )}
        </Link>
        {product.isPreviewData && <span className="preview-tag">SAMPLE</span>}
        {product.isNew && <span className="store-product-tag">NEW</span>}
        {product.bestSeller && (
          <span className="store-product-favorite">CREW FAVORITE</span>
        )}
        {product.variants &&
          product.variants.length > 0 &&
          product.variants.reduce(
            (total, variant) => total + variant.stockQuantity,
            0,
          ) <= 5 && <span className="store-product-low-stock">LOW STOCK</span>}
        <button
          className={`store-wishlist${saved ? " is-saved" : ""}`}
          type="button"
          aria-label={`${saved ? "Remove" : "Add"} ${product.name} ${saved ? "from" : "to"} wishlist`}
          aria-pressed={saved}
          onClick={() => {
            if (API_MODE && !user) {
              showNotice("Sign in to save pieces to your wishlist.");
              navigate("/login");
              return;
            }
            toggleWishlist(product.id);
            showNotice(
              saved ? "Removed from your wishlist." : "Saved to your wishlist.",
            );
          }}
        >
          {saved ? "♥" : "♡"}
        </button>
        <button
          className="store-quick-add-plus"
          type="button"
          aria-label={`Add ${product.name} to cart`}
          onClick={quickAddToCart}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <div className="store-product-copy">
        <p>{product.collection.replace("CREWWW / ", "")}</p>
        <div>
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
          <span>
            {formatCurrency(
              product.salePrice ?? product.price,
              product.currency,
            )}
          </span>
        </div>
        {product.salePrice && (
          <small className="sale-price">
            WAS {formatCurrency(product.price, product.currency)}
          </small>
        )}
        {product.fit && (
          <small>
            {product.fit} · {product.wash}
          </small>
        )}
      </div>
      <button
        className="quick-add"
        type="button"
        aria-expanded={sizeOpen}
        aria-controls={`quick-add-${product.id}`}
        onClick={() => setSizeOpen((open) => !open)}
      >
        {sizeOpen ? "HIDE SIZES" : "PICK A SIZE"}{" "}
        <span>{sizeOpen ? "−" : "⌄"}</span>
      </button>
      {sizeOpen && (
        <div
          className="quick-add-panel"
          id={`quick-add-${product.id}`}
          aria-label={`Choose a size for ${product.name}`}
        >
          <span>SELECT SIZE</span>
          <div>
            {sizes.map((item) => (
              <button key={item} type="button" onClick={() => addSize(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
