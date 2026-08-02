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
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      size TEXT,
      amount_total INTEGER,
      currency TEXT,
      customer_email TEXT,
      status TEXT NOT NULL DEFAULT 'paid',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Inserts a paid order keyed by Stripe Checkout session ID, ignoring the
 * write if that session was already recorded (e.g. Stripe retried the
 * webhook). Returns true only when a new row was actually inserted, so
 * callers can tell a fresh order from a duplicate delivery.
 */
export function recordOrder(order) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO orders
      (session_id, product_id, quantity, size, amount_total, currency, customer_email)
    VALUES (@sessionId, @productId, @quantity, @size, @amountTotal, @currency, @customerEmail)
  `);
  const info = stmt.run({
    sessionId: order.sessionId,
    productId: order.productId,
    quantity: order.quantity,
    size: order.size ?? null,
    amountTotal: order.amountTotal ?? null,
    currency: order.currency ?? null,
    customerEmail: order.customerEmail ?? null,
  });
  return info.changes === 1;
}

export function getOrderBySessionId(sessionId) {
  return getDb().prepare('SELECT * FROM orders WHERE session_id = ?').get(sessionId);
}
