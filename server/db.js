import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'orders.sqlite');

let db;

export function initDb() {
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      amount_total INTEGER,
      currency TEXT,
      customer_email TEXT,
      shipping_name TEXT,
      shipping_address1 TEXT,
      shipping_address2 TEXT,
      shipping_city TEXT,
      shipping_state TEXT,
      shipping_country TEXT,
      shipping_zip TEXT,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      size TEXT
    );
  `);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Inserts a paid order and its line items, keyed by Stripe Checkout session
 * ID, ignoring the write if that session was already recorded (e.g. Stripe
 * retried the webhook). Returns true only when a new order row was actually
 * inserted, so callers can tell a fresh order from a duplicate delivery (and
 * know not to insert the line items — or trigger fulfillment — twice).
 */
export function recordOrder({
  sessionId,
  items,
  amountTotal,
  currency,
  customerEmail,
  shippingAddress,
}) {
  const database = getDb();

  const insertOrder = database.prepare(`
    INSERT OR IGNORE INTO orders (
      session_id, amount_total, currency, customer_email,
      shipping_name, shipping_address1, shipping_address2,
      shipping_city, shipping_state, shipping_country, shipping_zip
    )
    VALUES (
      @sessionId, @amountTotal, @currency, @customerEmail,
      @shippingName, @shippingAddress1, @shippingAddress2,
      @shippingCity, @shippingState, @shippingCountry, @shippingZip
    )
  `);
  const info = insertOrder.run({
    sessionId,
    amountTotal: amountTotal ?? null,
    currency: currency ?? null,
    customerEmail: customerEmail ?? null,
    shippingName: shippingAddress?.name ?? null,
    shippingAddress1: shippingAddress?.address1 ?? null,
    shippingAddress2: shippingAddress?.address2 ?? null,
    shippingCity: shippingAddress?.city ?? null,
    shippingState: shippingAddress?.state ?? null,
    shippingCountry: shippingAddress?.country ?? null,
    shippingZip: shippingAddress?.zip ?? null,
  });

  if (info.changes !== 1) return false;

  const orderId = info.lastInsertRowid;
  const insertItem = database.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, size)
    VALUES (@orderId, @productId, @quantity, @size)
  `);
  for (const item of items) {
    insertItem.run({
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      size: item.size ?? null,
    });
  }

  return true;
}

export function getOrderBySessionId(sessionId) {
  const database = getDb();
  const order = database.prepare('SELECT * FROM orders WHERE session_id = ?').get(sessionId);
  if (!order) return null;

  const items = database
    .prepare('SELECT product_id, quantity, size FROM order_items WHERE order_id = ?')
    .all(order.id);

  return { ...order, items };
}
