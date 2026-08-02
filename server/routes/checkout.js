import { Router } from 'express';
import Stripe from 'stripe';
import { getProduct } from '../catalog.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

router.post('/create-checkout-session', async (req, res) => {
  const { productId, quantity = 1, size } = req.body ?? {};

  const product = getProduct(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return res.status(400).json({ error: 'Quantity must be an integer between 1 and 10' });
  }
  if (size && !product.sizes.includes(size)) {
    return res.status(400).json({ error: `Invalid size for ${product.name}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity,
        },
      ],
      metadata: {
        productId: product.id,
        quantity: String(quantity),
        size: size || '',
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
