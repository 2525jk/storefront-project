/**
 * Printful adapter — implements the interface documented in provider.js.
 *
 * Requires PRINTFUL_API_KEY (Printful dashboard > Stores > select store >
 * API) and a mapping from this catalog's product IDs (plus size, for
 * apparel) to Printful sync variant IDs in printful-catalog-map.json —
 * Printful has no idea what "tee-mountain" / "M" mean on its own. Every
 * entry in that file starts out `null`; fulfillment intentionally throws
 * until each product/size in use has been mapped to a real sync variant ID,
 * rather than silently skipping or guessing.
 *
 * Not exercised against a live Printful account or API key from here — no
 * account was available to test against. Written to match Printful's
 * documented v1 REST API (bearer-token auth, POST /orders), but confirm
 * against https://developers.printful.com/docs/ and run a real test order
 * before trusting this in production.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogMap = JSON.parse(
  readFileSync(path.join(__dirname, 'printful-catalog-map.json'), 'utf-8'),
);

const PRINTFUL_API_BASE = 'https://api.printful.com';

function requireApiKey() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) {
    throw new Error('PRINTFUL_API_KEY is not set — see server/.env.example');
  }
  return key;
}

function resolveVariantId(productId, size) {
  const productMap = catalogMap[productId];
  if (!productMap) {
    throw new Error(
      `No Printful mapping for product "${productId}" — add it to server/pod/printful-catalog-map.json`,
    );
  }
  const key = size || 'default';
  const variantId = productMap[key];
  if (!variantId) {
    throw new Error(
      `No Printful sync variant configured for "${productId}" (size: ${key}) — set it in server/pod/printful-catalog-map.json`,
    );
  }
  return variantId;
}

export async function submitOrder(order) {
  const apiKey = requireApiKey();
  const variantId = resolveVariantId(order.productId, order.size);

  if (!order.shippingAddress?.address1) {
    throw new Error(
      `No shipping address available for session ${order.sessionId} — cannot submit to Printful`,
    );
  }
  const { name, address1, address2, city, state, country, zip } = order.shippingAddress;

  const res = await fetch(`${PRINTFUL_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_id: order.sessionId,
      recipient: {
        name,
        address1,
        address2: address2 || undefined,
        city,
        state_code: state,
        country_code: country,
        zip,
        email: order.customerEmail,
      },
      items: [{ sync_variant_id: variantId, quantity: order.quantity }],
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Printful order submission failed (${res.status}): ${data?.error?.message ?? res.statusText}`,
    );
  }

  return { providerOrderId: String(data.result.id), status: data.result.status };
}

export async function getOrderStatus(providerOrderId) {
  const apiKey = requireApiKey();
  const res = await fetch(`${PRINTFUL_API_BASE}/orders/${providerOrderId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      `Printful status lookup failed (${res.status}): ${data?.error?.message ?? res.statusText}`,
    );
  }

  return { status: data.result.status };
}
