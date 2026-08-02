import { useEffect, useState } from 'react';
import { getCart, getCartTotal, removeFromCart, subscribeToCart, updateQuantity, type CartItem } from '../lib/cart';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';
const base = import.meta.env.BASE_URL;
const withBase = (p: string) => `${base}${p.replace(/^\//, '')}`;

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(getCart());
    setHydrated(true);
    return subscribeToCart(() => setItems(getCart()));
  }, []);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start checkout');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  // Avoid a flash of the empty-cart state before localStorage has been read on mount.
  if (!hydrated) return null;

  if (items.length === 0) {
    return (
      <div className="cart-empty card-surface">
        <p>Your cart is empty.</p>
        <a className="btn btn-primary" href={base}>
          Continue shopping
        </a>
      </div>
    );
  }

  const total = getCartTotal(items);
  const currency = items[0].currency;

  return (
    <div className="cart-view">
      <ul className="cart-list">
        {items.map((item) => (
          <li key={`${item.productId}-${item.size ?? ''}`} className="cart-row card-surface">
            <img src={withBase(item.image)} alt={item.name} className="cart-row-image" />
            <div className="cart-row-info">
              <p className="cart-row-name">{item.name}</p>
              {item.size && <p className="cart-row-size">Size: {item.size}</p>}
              <p className="cart-row-price">{formatMoney(item.price, item.currency)} each</p>
            </div>
            <div className="qty-stepper" role="group" aria-label={`Quantity for ${item.name}`}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="qty-value">{item.quantity}</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <p className="cart-row-subtotal">{formatMoney(item.price * item.quantity, item.currency)}</p>
            <button
              type="button"
              className="cart-row-remove"
              onClick={() => removeFromCart(item.productId, item.size)}
              aria-label={`Remove ${item.name} from cart`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="cart-summary card-surface">
        <div className="cart-summary-row cart-summary-total">
          <span>Subtotal</span>
          <span>{formatMoney(total, currency)}</span>
        </div>
        <p className="cart-summary-note">Shipping and taxes calculated at checkout.</p>
        <button type="button" className="btn btn-primary btn-block" onClick={handleCheckout} disabled={loading}>
          {loading ? 'Redirecting…' : 'Proceed to checkout'}
        </button>
        {error && <p className="buy-button-error">{error}</p>}
      </div>
    </div>
  );
}
