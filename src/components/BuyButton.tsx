import { useState } from 'react';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface BuyButtonProps {
  productId: string;
  size?: string | null;
  quantity?: number;
}

export default function BuyButton({ productId, size = null, quantity = 1 }: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ productId, quantity, size: size || undefined }] }),
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

  // A Fragment, not a wrapping <div> — this button needs to be a *direct*
  // flex item of .product-actions-row (same as AddToCartButton's) so the
  // `.product-actions-row .btn { flex: 1 }` rule sizes both identically.
  // A div wrapper would absorb that sizing instead of the button itself,
  // leaving Buy now narrower/shorter than Add to cart.
  return (
    <>
      <button type="button" className="btn btn-primary" onClick={handleBuy} disabled={loading}>
        {loading ? 'Redirecting…' : 'Buy now'}
      </button>
      {error && <p className="buy-button-error">{error}</p>}
    </>
  );
}
