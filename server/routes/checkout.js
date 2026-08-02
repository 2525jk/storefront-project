import { Router } from 'express';
import Stripe from 'stripe';
import { getProduct } from '../catalog.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

// Stripe caps each metadata value at 500 characters. The order's line items
// are stored as compact JSON in metadata (see below), so this cap keeps that
// comfortably under the limit even with several lines in the cart.
const MAX_CART_ITEMS = 15;

router.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (items.length > MAX_CART_ITEMS) {
    return res
      .status(400)
      .json({ error: `A single order can contain at most ${MAX_CART_ITEMS} line items` });
  }

  const lineItems = [];
  const metadataItems = [];

  for (const rawItem of items) {
    const { productId, quantity = 1, size } = rawItem ?? {};

    const product = getProduct(productId);
    if (!product) {
      return res.status(404).json({ error: `Product not found: ${productId}` });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return res
        .status(400)
        .json({ error: `Quantity must be an integer between 1 and 10 for ${product.name}` });
    }
    if (size && !product.sizes.includes(size)) {
      return res.status(400).json({ error: `Invalid size for ${product.name}` });
    }

    lineItems.push({
      price_data: {
        currency: product.currency,
        product_data: {
          name: product.name,
          description: product.description,
        },
        unit_amount: product.price,
      },
      quantity,
    });

    // Short keys (p/q/s) to leave headroom under Stripe's 500-char metadata
    // value limit as cart sizes grow.
    metadataItems.push({ p: product.id, q: quantity, s: size || '' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata: {
        items: JSON.stringify(metadataItems),
      },
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Failed to create checkout session:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

export default router;
