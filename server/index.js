// Must run before any other local import: those modules read process.env
// (e.g. `new Stripe(process.env.STRIPE_SECRET_KEY)`) at import time, and
// static imports are hoisted above ordinary statements in ESM, so a plain
// `import dotenv from 'dotenv'; dotenv.config();` here would run too late.
import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import { initDb } from './db.js';
import checkoutRouter from './routes/checkout.js';
import webhookRouter from './routes/webhook.js';
import ordersRouter from './routes/orders.js';

const REQUIRED_ENV_VARS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CLIENT_URL'];
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}. See server/.env.example.`);
    process.exit(1);
  }
}

initDb();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL }));

// The Stripe webhook needs the raw, unparsed request body to verify the
// signature, so it must be mounted before the global express.json() parser.
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(webhookRouter);

app.use(express.json());
app.use(checkoutRouter);
app.use(ordersRouter);

app.listen(PORT, () => {
  console.log(`Storefront API listening on http://localhost:${PORT}`);
});
