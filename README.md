# Tee Shop

A print-on-demand t-shirt storefront built to learn Stripe Checkout, webhooks, and
the moving pieces around them. Astro (with a couple of React islands) for the
frontend, Express + SQLite for the backend.

- **Frontend**: Astro, static product pages with React islands (`BuyButton`,
  `OrderStatus`) for anything that needs client-side interactivity.
- **Backend** (`/server`): Express API with a `POST /create-checkout-session`
  endpoint and a signature-verified `POST /webhooks/stripe` handler that writes
  paid orders to SQLite, idempotently keyed by Checkout session ID.
- **Catalog**: 3 hardcoded products in [catalog/products.json](catalog/products.json),
  shared by both the frontend (for display) and the backend (for pricing —
  never trust a price from the client).
- **Fulfillment**: [server/pod/provider.js](server/pod/provider.js) defines a
  small adapter interface for print-on-demand providers. Only a stub
  ([server/pod/printful.js](server/pod/printful.js)) exists so far — it's
  wired into the webhook handler but throws "not implemented" instead of
  actually submitting anything to Printful.

## Prerequisites

- Node.js 22.5+ (this project uses the built-in `node:sqlite` module — no
  native dependencies to compile).
- A free [Stripe account](https://dashboard.stripe.com/register) in **test
  mode**.
- The [Stripe CLI](https://docs.stripe.com/stripe-cli), used to forward
  webhook events to your local machine.

## 1. Install dependencies

The frontend and backend are separate npm projects.

```sh
# from the repo root — installs the Astro frontend
npm install

# backend
cd server
npm install
```

## 2. Configure environment variables

```sh
cd server
cp .env.example .env
```

Fill in `server/.env`:

- `STRIPE_SECRET_KEY` — from the Stripe Dashboard, **Developers > API keys**
  (test mode), starts with `sk_test_`.
- `STRIPE_WEBHOOK_SECRET` — you'll get this from `stripe listen` in step 3
  below, starts with `whsec_`.
- `PORT` — defaults to `3001`.
- `CLIENT_URL` — defaults to `http://localhost:4321` (the Astro dev server).

The frontend doesn't need any env vars for local dev — `BuyButton` and
`OrderStatus` default to calling `http://localhost:3001`. If you want to
override that, copy the root `.env.example` to `.env` and set
`PUBLIC_API_BASE_URL`.

## 3. Forward Stripe webhooks to your machine

Stripe can't reach `localhost` directly, so the Stripe CLI forwards events
from your Stripe account to your local server over an authenticated tunnel.

```sh
stripe login          # one-time, opens a browser to link the CLI to your account
stripe listen --forward-to localhost:3001/webhooks/stripe
```

`stripe listen` prints a webhook signing secret that looks like:

```
> Ready! Your webhook signing secret is whsec_XXXXXXXX (^C to quit)
```

Copy that value into `STRIPE_WEBHOOK_SECRET` in `server/.env`. This secret is
what `stripe.webhooks.constructEvent()` in
[server/routes/webhook.js](server/routes/webhook.js) uses to verify that
incoming webhook requests actually came from Stripe and weren't tampered with
— it rejects anything with a missing or invalid `Stripe-Signature` header.

Leave `stripe listen` running in its own terminal for the rest of local
development; it needs to be up whenever you complete a test checkout, or the
webhook (and therefore the order write) never arrives.

## 4. Run the app

In separate terminals:

```sh
# terminal 1 — backend
cd server
npm run dev

# terminal 2 — frontend
npm run dev
```

Visit `http://localhost:4321`.

## 5. Test a purchase

Click **Buy now** on any product, which POSTs to `/create-checkout-session`
and redirects to Stripe's hosted Checkout page. Use a
[Stripe test card](https://docs.stripe.com/testing#cards):

- Card number: `4242 4242 4242 4242`
- Expiry: any future date
- CVC: any 3 digits
- ZIP: any 5 digits

On success you're redirected back to `/success?session_id=...`, which polls
`GET /orders/:sessionId` until the webhook has written the order (this
confirms the whole loop — Checkout → webhook → SQLite — actually worked).
Check the `stripe listen` terminal to see the forwarded event, and the backend
terminal to see it logged as recorded (or skipped, if it's a duplicate
delivery).

## How the pieces fit together

```
Browser --POST /create-checkout-session--> Express --> Stripe Checkout Session created
Browser <--redirect to session.url-------- Express
Browser --------------------------------------------> Stripe-hosted Checkout page
Stripe  --checkout.session.completed event----------> stripe listen --> Express /webhooks/stripe
Express: verify signature -> INSERT OR IGNORE order (keyed by session id) -> call pod provider (stub)
```

### Idempotent order writes

Stripe may deliver the same webhook event more than once (retries, at-least-once
delivery). [server/db.js](server/db.js) has a `UNIQUE` constraint on
`session_id` and uses `INSERT OR IGNORE`, so a duplicate delivery is a no-op
instead of a duplicate order or a duplicate fulfillment request. Only the
insert that actually changed a row (`info.changes === 1`) triggers a call to
the fulfillment provider.

### Print-on-demand adapter

[server/pod/provider.js](server/pod/provider.js) documents the interface every
provider must implement (`submitOrder`, `getOrderStatus`) and exposes
`getProvider()` to look one up by name. Swapping providers, or adding a real
Printful integration later, means implementing that interface in
`server/pod/printful.js` (or a new file) without touching the webhook handler
that calls it.

## Project structure

```
catalog/products.json        shared product catalog (frontend + backend)
src/pages/                   index (catalog), success, cancel
src/components/              BuyButton.tsx, OrderStatus.tsx (React islands)
server/index.js              Express app entry
server/routes/checkout.js    POST /create-checkout-session
server/routes/webhook.js     POST /webhooks/stripe
server/routes/orders.js      GET /orders/:sessionId (used by the success page)
server/db.js                 SQLite setup + idempotent order writes
server/catalog.js            loads the shared catalog on the backend
server/pod/provider.js       fulfillment adapter interface
server/pod/printful.js       stub adapter (not implemented)
```

## Development

When starting the Astro dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and
`astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
