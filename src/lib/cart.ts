// Client-side cart store, backed by localStorage. Framework-agnostic so both
// Astro's client:load React islands and any plain <script> can share it.
// State changes dispatch a same-window CustomEvent ("storage" only fires in
// *other* tabs, never the tab that made the change) so every subscriber in
// this tab re-renders immediately.

export interface CartItem {
  productId: string;
  name: string;
  price: number; // cents, snapshot for display — server re-prices from the catalog at checkout
  currency: string;
  image: string;
  size: string | null;
  quantity: number;
}

const STORAGE_KEY = 'tee-shop-cart';
const CART_EVENT = 'tee-shop-cart-updated';
const MAX_QUANTITY_PER_LINE = 10;

function isBrowser() {
  return typeof window !== 'undefined';
}

function sameLine(a: { productId: string; size: string | null }, b: { productId: string; size: string | null }) {
  return a.productId === b.productId && (a.size ?? null) === (b.size ?? null);
}

export function getCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1) {
  const items = getCart();
  const existing = items.find((i) => sameLine(i, item));
  if (existing) {
    existing.quantity = Math.min(MAX_QUANTITY_PER_LINE, existing.quantity + quantity);
  } else {
    items.push({ ...item, quantity: Math.min(MAX_QUANTITY_PER_LINE, Math.max(1, quantity)) });
  }
  writeCart(items);
}

export function updateQuantity(productId: string, size: string | null, quantity: number) {
  const items = getCart();
  const target = items.find((i) => sameLine(i, { productId, size }));
  if (!target) return;
  if (quantity <= 0) {
    writeCart(items.filter((i) => i !== target));
    return;
  }
  target.quantity = Math.min(MAX_QUANTITY_PER_LINE, quantity);
  writeCart(items);
}

export function removeFromCart(productId: string, size: string | null) {
  writeCart(getCart().filter((i) => !sameLine(i, { productId, size })));
}

export function clearCart() {
  writeCart([]);
}

export function getCartCount(items = getCart()): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function getCartTotal(items = getCart()): number {
  return items.reduce((sum, i) => sum + i.quantity * i.price, 0);
}

/** Subscribes to cart changes (this tab and others). Returns an unsubscribe function. */
export function subscribeToCart(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}
