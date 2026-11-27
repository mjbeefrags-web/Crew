/**
 * Shopping-cart mark used next to cart controls. It is decorative — the
 * adjacent text/aria-label carries the accessible name.
 */
export function CartIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`cart-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9.5" cy="20" r="1.35" />
      <circle cx="17.5" cy="20" r="1.35" />
      <path d="M2.5 3.5h2.3l2.2 10.6a1.6 1.6 0 0 0 1.57 1.28h9.2a1.6 1.6 0 0 0 1.56-1.23L21 7.2H6.1" />
      <path d="M10 11h7.6" />
    </svg>
  );
}
