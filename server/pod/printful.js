/**
 * Printful adapter — implements the interface documented in provider.js.
 * Not implemented yet: no API calls are made. This exists so the webhook
 * handler has a real fulfillment step to call once Printful integration
 * is built, without needing to change the calling code.
 */

export async function submitOrder(_order) {
  throw new Error('Printful fulfillment is not implemented yet');
}

export async function getOrderStatus(_providerOrderId) {
  throw new Error('Printful fulfillment is not implemented yet');
}
