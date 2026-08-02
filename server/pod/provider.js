/**
 * Print-on-demand fulfillment adapter interface.
 *
 * Every provider module (e.g. printful.js) must export:
 *
 *   submitOrder(order: {
 *     sessionId: string,
 *     productId: string,
 *     quantity: number,
 *     size?: string,
 *     customerEmail?: string,
 *     shippingAddress?: object,
 *   }) => Promise<{ providerOrderId: string, status: string }>
 *
 *   getOrderStatus(providerOrderId: string) => Promise<{ status: string }>
 *
 * Callers should treat submitOrder/getOrderStatus as fallible network calls
 * and never let a fulfillment failure affect whether a Checkout webhook is
 * acknowledged — the order is already durably recorded before either is
 * called.
 */

import * as printful from './printful.js';

const providers = {
  printful,
};

export function getProvider(name = process.env.POD_PROVIDER || 'printful') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown print-on-demand provider: ${name}`);
  }
  return provider;
}
