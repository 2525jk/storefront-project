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

    // Line items were stashed as compact {p,q,s} JSON in metadata by
    // /create-checkout-session (see server/routes/checkout.js) since a
    // Checkout Session's own line_items aren't included on this event.
    let items = [];
    try {
      const rawItems = JSON.parse(session.metadata?.items ?? '[]');
      items = rawItems.map((item) => ({
        productId: item.p,
        quantity: Number(item.q) || 1,
        size: item.s || null,
      }));
    } catch (err) {
      console.error(`Could not parse items metadata for session ${session.id}:`, err.message);
    }

    const isNewOrder = recordOrder({
      sessionId: session.id,
      items,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? null,
    });

    if (isNewOrder) {
      const provider = getProvider();
      for (const item of items) {
        provider
          .submitOrder({
            sessionId: session.id,
            productId: item.productId,
            quantity: item.quantity,
            size: item.size ?? undefined,
            customerEmail: session.customer_details?.email ?? undefined,
          })
          .catch((err) => {
            console.error(
              `[pod] fulfillment submission failed for ${item.productId} (session ${session.id}):`,
              err.message,
            );
          });
      }
    } else {
      console.log(`Duplicate webhook delivery for session ${session.id}, order already recorded`);
    }
  }

  res.json({ received: true });
});

export default router;
