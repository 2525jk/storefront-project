import { useState } from 'react';
import AddToCartButton from './AddToCartButton';
import BuyButton from './BuyButton';

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  sizes: string[];
}

interface ProductActionsProps {
  product: Product;
  /** "card" (product grid, no quantity stepper) or "detail" (product page, adds a quantity stepper). */
  variant?: 'card' | 'detail';
}

export default function ProductActions({ product, variant = 'card' }: ProductActionsProps) {
  const [size, setSize] = useState(product.sizes?.[0] ?? '');
  const [quantity, setQuantity] = useState(1);

  return (
    <div className={`product-actions product-actions-${variant}`}>
      <div className="product-actions-row">
        {product.sizes && product.sizes.length > 0 && (
          <div className="size-pills" role="group" aria-label={`Size for ${product.name}`}>
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={`size-pill${s === size ? ' size-pill-active' : ''}`}
                aria-pressed={s === size}
                onClick={() => setSize(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {variant === 'detail' && (
          <div className="qty-stepper" role="group" aria-label="Quantity">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="qty-value">{quantity}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="product-actions-row">
        <AddToCartButton
          productId={product.id}
          name={product.name}
          price={product.price}
          currency={product.currency}
          image={product.image}
          size={size || null}
          quantity={quantity}
        />
        <BuyButton productId={product.id} size={size || null} quantity={quantity} />
      </div>
    </div>
  );
}
