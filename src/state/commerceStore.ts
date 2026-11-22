import { create } from 'zustand';
import type { CartLine } from '../domain/commerce';

const CART_KEY = 'arcfield-bag'; // Retained for backward compatibility with the M2.1 Crewww showroom.
const WISHLIST_KEY = 'arcfield-wishlist';

function readArray<T>(key: string, guard: (value: unknown) => value is T): T[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter(guard) : [];
  } catch { return []; }
}

const isLine = (value: unknown): value is CartLine => Boolean(
  value && typeof value === 'object' &&
  typeof (value as CartLine).productId === 'string' &&
  typeof (value as CartLine).size === 'string' &&
  typeof (value as CartLine).color === 'string' &&
  Number.isInteger((value as CartLine).quantity) && (value as CartLine).quantity > 0,
);

function persistCart(lines: CartLine[]) {
  try { window.localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* keep the in-memory bag usable */ }
  window.dispatchEvent(new CustomEvent('arcfield:bag-updated', { detail: lines.reduce((total, line) => total + line.quantity, 0) }));
}

function persistWishlist(items: string[]) {
  try { window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items)); } catch { /* keep the in-memory list usable */ }
}

type CommerceState = {
  cartLines: CartLine[];
  wishlist: string[];
  addCartLine: (line: CartLine) => void;
  setLineQuantity: (index: number, quantity: number) => void;
  removeCartLine: (index: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  resetForTests: () => void;
};

const initialCart = () => readArray<CartLine>(CART_KEY, isLine);
const initialWishlist = () => readArray<string>(WISHLIST_KEY, (value): value is string => typeof value === 'string');

export const useCommerceStore = create<CommerceState>((set, get) => ({
  cartLines: initialCart(),
  wishlist: initialWishlist(),
  addCartLine: (line) => {
    const items = [...get().cartLines];
    const match = items.findIndex((item) => item.productId === line.productId && item.size === line.size && item.color === line.color);
    if (match >= 0) items[match] = { ...items[match], quantity: items[match].quantity + line.quantity };
    else items.push(line);
    persistCart(items);
    set({ cartLines: items });
  },
  setLineQuantity: (index, quantity) => {
    const items = get().cartLines.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: Math.max(1, Math.floor(quantity)) } : line);
    persistCart(items);
    set({ cartLines: items });
  },
  removeCartLine: (index) => {
    const items = get().cartLines.filter((_, lineIndex) => lineIndex !== index);
    persistCart(items);
    set({ cartLines: items });
  },
  clearCart: () => { persistCart([]); set({ cartLines: [] }); },
  toggleWishlist: (productId) => {
    const items = get().wishlist.includes(productId) ? get().wishlist.filter((id) => id !== productId) : [...get().wishlist, productId];
    persistWishlist(items);
    set({ wishlist: items });
  },
  resetForTests: () => { persistCart([]); persistWishlist([]); set({ cartLines: [], wishlist: [] }); },
}));
