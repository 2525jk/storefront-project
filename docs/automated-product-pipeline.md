# Automated product pipeline

Goal: an AI agent proposes new t-shirt products (design + copy + price),
and approved ones get built and deployed automatically — without someone
hand-editing `catalog/products.json` for every new item.

This document describes the full pipeline, marks what's built vs. what's a
decision or dependency you still need to supply, and points at the actual
files for the parts that exist today.

## Why this can't be "agent writes straight to master"

This storefront takes real payments through Stripe. An unreviewed AI agent
with direct push/merge access could ship a broken price, a duplicate slug
that breaks checkout, or artwork with IP/trademark problems, straight to a
live store. So the pipeline is **generate → validate → human-reviewed PR →
merge → auto-deploy**, not a direct write. Everything up to "open a PR" can
be fully automated; the merge is a deliberate checkpoint.

## Pipeline stages

```
1. PROPOSE        agent invents a product concept (name, description, price, category, sizes*)
                   (*sizes only for the "apparel" category — mugs/stickers omit it)
                   ↓
2. DESIGN         agent generates the artwork (SVG line-art, in the house style)
                   ↓
3. DRAFT          agent writes catalog/drafts/<id>.json + drafts/images/<id>.svg
                   ↓
4. VALIDATE       scripts/validate-catalog.mjs checks schema + business rules
                   ↓
5. PROPOSE PR     agent opens a branch + PR (never pushes to master directly)
                   ↓
6. CI GATE        .github/workflows/validate-catalog.yml re-runs validation on the PR
                   ↓
7. HUMAN REVIEW   ← you approve/reject/edit the PR like any other change
                   ↓
8. MERGE          scripts/promote-draft.mjs moves draft → catalog/products.json + public/products/
                   ↓
9. DEPLOY         existing deploy-pages.yml builds + publishes on push to master
                   ↓
10. BACKEND PICKUP  server/catalog.js now re-reads the file per request (see below) —
                    no backend restart needed for the new product to be checkout-able
```

Stages 1–4 and 8–10 are built (see "What's built" below). Stage 5 (opening
the PR) is written into the agent's instructions but **needs one thing from
you** — see "What's needed next."

## What's built

| Piece | File | Purpose |
|---|---|---|
| Product schema | [catalog/products.schema.json](../catalog/products.schema.json) | Formal shape/constraints for a product entry |
| Validation logic | [scripts/catalog-validation.mjs](../scripts/catalog-validation.mjs) | Shared checks: schema, id uniqueness, image file exists, size/price bounds |
| CLI validator | [scripts/validate-catalog.mjs](../scripts/validate-catalog.mjs) | `node scripts/validate-catalog.mjs [draft.json]` — validates the full catalog, or one draft against it |
| Promote script | [scripts/promote-draft.mjs](../scripts/promote-draft.mjs) | Merges an approved draft into `catalog/products.json` + moves its image into `public/products/` |
| CI gate | [.github/workflows/validate-catalog.yml](../.github/workflows/validate-catalog.yml) | Runs the validator on any PR touching `catalog/**` or `public/products/**` — merge is blocked on failure |
| Backend fix | [server/catalog.js](../server/catalog.js) | Was cached at process start; now re-reads the file per request so a merged product is checkout-able without a backend restart |
| The agent | [.claude/skills/generate-product/SKILL.md](../.claude/skills/generate-product/SKILL.md) | Instructions a Claude Code session follows to actually propose + draft + validate a product |

The agent in that last row **is** the "AI agent" — it's a Claude Code skill,
so the model doing the design/copywriting is Claude itself, invoked either
by you typing `/generate-product` or by a scheduled routine (see below). No
separate AI microservice to build or host.

## What's needed next (your call)

1. **PR permission on the token.** The `GH_TOKEN` set up earlier only has
   `Contents: Read and write` — enough to push, not enough to open a PR
   (`gh pr create` needs `Pull requests: Read and write` too). Add that
   permission to the existing fine-grained PAT (or issue a new one) before
   the agent can complete stage 5 itself. Until then, everything through
   "draft committed on a branch" works; opening the PR would need to be a
   manual `gh pr create` or a token update.

2. **Scheduled vs. on-demand.** Right now `/generate-product` is something
   you'd run yourself when you want a new product proposed. If you want
   this to happen unattended (e.g. weekly), that's a `schedule`-skill cron
   routine calling `/generate-product` — a one-time setup, your call on
   cadence.

3. **Design fidelity ceiling.** The agent draws new tees as hand-authored
   SVG line-art (same technique as the existing three products) — it
   reuses the exact garment outline path and varies the interior motif and
   background tint. That's deterministic, free, and stays on-brand, but
   it's flat vector art, not photoreal mockups. If you want raster
   photography/renders instead, that's a real image-generation API
   (e.g. an image model + a compositing step to lay the design onto a tee
   photo), which needs: an API key, a network allowlist change (this
   sandbox only permits `github.com` hosts today), and a new compositing
   script. Bigger lift — worth doing only if the flat SVG style stops
   looking acceptable.

4. **Fulfillment is still the real gap.** New products flowing into the
   catalog doesn't change that `server/pod/printful.js` throws
   `not implemented` — an agent-created product can be bought but not
   printed/shipped until that's built (see the earlier conversation about
   this same gap).

5. **Volume/rate limits.** Nothing currently caps how many drafts the
   agent proposes per run or per week. Worth deciding a limit (e.g. "at
   most 1 draft per invocation") before scheduling it — I defaulted the
   skill to propose exactly one product per run for this reason.
