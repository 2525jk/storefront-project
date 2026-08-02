import { useEffect, useState } from 'react';
import { getCartCount, subscribeToCart } from '../lib/cart';

interface CartBadgeProps {
  href: string;
}

export default function CartBadge({ href }: CartBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCartCount());
    return subscribeToCart(() => setCount(getCartCount()));
  }, []);

  return (
    <a href={href} className="cart-link" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="21" r="1.4" fill="currentColor" />
        <circle cx="17" cy="21" r="1.4" fill="currentColor" />
      </svg>
      {count > 0 && <span className="badge cart-badge">{count}</span>}
    </a>
  );
}
