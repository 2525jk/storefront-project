import { useState } from 'react';

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface BuyButtonProps {
  productId: string;
  sizes?: string[];
}

export default function BuyButton({ productId, sizes }: BuyButtonProps) {
  const [size, setSize] = useState(sizes?.[0] ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1, size }),
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

  return (
    <div className="buy-button">
      {sizes && sizes.length > 0 && (
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          disabled={loading}
          aria-label="Size"
        >
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      <button onClick={handleBuy} disabled={loading}>
        {loading ? 'Redirecting…' : 'Buy now'}
      </button>
      {error && <p className="buy-button-error">{error}</p>}
    </div>
  );
}
