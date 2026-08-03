---
name: generate-product
description: Propose exactly one new t-shirt product (concept, copy, price, SVG design) in the shop's nature/outdoors house style, stage it as a draft, validate it, and open a PR for human review. Never writes to catalog/products.json or master directly.
---

# Generate a new product

You are the "AI agent" in this store's automated product pipeline (see
[docs/automated-product-pipeline.md](../../../docs/automated-product-pipeline.md)
for the full picture). Your job each run is to propose **exactly one** new
t-shirt, stage it as a draft, validate it, and hand it off for human review
via a PR. You never edit `catalog/products.json` directly and you never
push to `master`.

## 1. Understand the brand before inventing anything

Read `catalog/products.json` and skim the SVGs in `public/products/` (and
anything already sitting in `catalog/drafts/`) so you don't propose a
duplicate or off-brand concept. The house style is:

- Nature/outdoors motifs — the existing line is Mountain, Wave, and Forest.
  Stay in that family (ridgelines, rivers, canyons, alpine lakes, desert
  mesas, storms, constellations — anything that reads as "outdoors line
  art"), or make a deliberate, clearly-reasoned case for branching out.
- Price in the same range as the existing catalog (2500–2700 cents /
  $25–$27) unless you have a specific reason to differ.
- Sizes `["S", "M", "L", "XL"]` unless the concept genuinely calls for
  something else.
- Description: one sentence, matches the tone of the existing three
  (material + fit + what the print depicts).

## 2. Pick an id and check for collisions

Slug format: lowercase, hyphenated, e.g. `tee-ridge-runner`. Check it isn't
already used in `catalog/products.json` or `catalog/drafts/*.json`.

## 3. Draw the SVG in the established technique

All three existing product images share one garment outline — reuse it
verbatim so new tees look like the same product photographed the same way.
Only the interior line-art (the print design) and the background rect
color should change:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" role="img" aria-label="REPLACE ME">
  <rect width="300" height="300" fill="#e6f0ec"/>
  <path d="M90 60 L120 40 L150 60 L180 40 L210 60 L210 90 L235 100 L235 260 L65 260 L65 100 L90 90 Z"
        fill="#f5f5f5" stroke="#c9ced6" stroke-width="3"/>
  <!-- your new interior design goes here, roughly within x:85-215 y:100-220 -->
</svg>
```

Guidelines for the interior design:
- Keep it simple line-art or flat-shape silhouette, like the existing three
  (a mountain ridge + sun dot, wave lines, a layered forest canopy).
- Use colors from the theme palette in `src/styles/global.css`
  (`--color-primary: #1f6f54`, `--color-secondary: #157a9c`, plus muted
  tints of either) so the product tile doesn't clash with the site theme.
- Background rect: a very pale tint related to the design (see the three
  existing examples: `#eef2f7`, `#eef7f7`, `#eef7ef`) — keep it in that
  same pale, low-saturation family.

## 4. Write the draft files

- `catalog/drafts/<id>.json` — a single product object matching
  `catalog/products.schema.json`: `id`, `name`, `description`, `price`,
  `currency: "usd"`, `image: "/products/<id>.svg"`, `sizes`.
- `catalog/drafts/images/<id>.svg` — the SVG from step 3.

## 5. Validate

```sh
node scripts/validate-catalog.mjs catalog/drafts/<id>.json
```

Fix anything it flags before moving on. Do not proceed to step 6 with a
failing draft.

## 6. Open a PR — do not touch master

```sh
git checkout -b add-product-<id>
git add catalog/drafts/<id>.json catalog/drafts/images/<id>.svg
git commit -m "Draft product: <name>"
git push -u origin add-product-<id>   # uses GH_TOKEN, same pattern as other pushes this project uses
gh pr create --title "Draft product: <name>" --body "Proposed by the generate-product skill. Run scripts/promote-draft.mjs catalog/drafts/<id>.json after merge to publish it."
```

**Known gap:** as of this writing, the repo's `GH_TOKEN` only has
`Contents: Read and write` on GitHub — not `Pull requests: Read and
write` — so `gh pr create` will likely fail with a permissions error until
that's added. If it fails, stop after the push and tell the user the
branch is up but the PR needs to be opened manually (or the token scope
extended); do not fall back to pushing straight to master.

## 7. What you must never do

- Never write to `catalog/products.json` directly — that's
  `scripts/promote-draft.mjs`'s job, run after a human merges the PR.
- Never push or merge to `master` from this skill.
- Never propose more than one product in a single run.
- Never remove or edit an existing product's entry.
