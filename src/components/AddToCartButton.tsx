import { useState } from 'react';
import { addToCart } from '../lib/cart';

interface AddToCartButtonProps {
  productId: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  size?: string | null;
  quantity?: number;
}

export default function AddToCartButton({
  productId,
  name,
  price,
  currency,
  image,
  size = null,
  quantity = 1,
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addToCart({ productId, name, price, currency, image, size }, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button type="button" className="btn btn-secondary" onClick={handleAdd}>
      {added ? 'Added ✓' : 'Add to cart'}
    </button>
  );
}
