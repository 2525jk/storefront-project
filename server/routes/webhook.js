import { Router } from 'express';
import Stripe from 'stripe';
import { recordOrder } from '../db.js';
import { getProvider } from '../pod/provider.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = Router();

// NOTE: this route relies on req.body being the raw request Buffer, not
// JSON-parsed, so that stripe.webhooks.constructEvent can verify the
// signature against the exact bytes Stripe signed. See server/index.js,
// where express.raw() is mounted only for this path, ahead of the global
// express.json() parser.
router.post('/webhooks/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};

    const isNewOrder = recordOrder({
      sessionId: session.id,
      productId: metadata.productId,
      quantity: Number(metadata.quantity) || 1,
      size: metadata.size || null,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? null,
    });

    if (isNewOrder) {
      const provider = getProvider();
      provider
        .submitOrder({
          sessionId: session.id,
          productId: metadata.productId,
          quantity: Number(metadata.quantity) || 1,
          size: metadata.size || undefined,
          customerEmail: session.customer_details?.email ?? undefined,
        })
        .catch((err) => {
          console.error('[pod] fulfillment submission failed:', err.message);
        });
    } else {
      console.log(`Duplicate webhook delivery for session ${session.id}, order already recorded`);
    }
  }

  res.json({ received: true });
});

export default router;
