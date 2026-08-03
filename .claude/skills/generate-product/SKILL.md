---
name: generate-product
description: Propose exactly one new product (apparel, mug, or sticker — concept, copy, price, category, SVG design) in the shop's nature/outdoors house style, stage it as a draft, validate it, and open a PR for human review. Never writes to catalog/products.json or master directly.
---

# Generate a new product

You are the "AI agent" in this store's automated product pipeline (see
[docs/automated-product-pipeline.md](../../../docs/automated-product-pipeline.md)
for the full picture). Your job each run is to propose **exactly one** new
product, stage it as a draft, validate it, and hand it off for human review
via a PR. You never edit `catalog/products.json` directly and you never
push to `master`.

## 1. Understand the brand before inventing anything

Read `catalog/products.json` and skim the SVGs in `public/products/` (and
anything already sitting in `catalog/drafts/`) so you don't propose a
duplicate or off-brand concept. The catalog has three categories today —
`apparel`, `mugs`, `stickers` (see `catalog/products.schema.json` for the
authoritative enum) — pick whichever fits your concept, or propose a new
category only with a clearly-reasoned case (it also needs adding to the
schema's enum and the category list in `src/pages/index.astro`, so treat
that as a bigger, separate change).

House style, regardless of category:
- Nature/outdoors motifs — the existing line is Mountain, Wave, Forest, and
  Aurora (apparel), Alpine (mugs), Trailhead (stickers). Stay in that
  family (ridgelines, rivers, canyons, alpine lakes, desert mesas, storms,
  constellations), or make a deliberate, clearly-reasoned case for
  branching out.
- Price fits the existing range for that category: apparel 2500–2700
  cents ($25–$27), mugs around 1400 cents ($14), stickers around 500 cents
  ($5). Stay close unless you have a specific reason to differ, and note
  the schema's hard bounds are 500–20000.
- `sizes`: include `["S", "M", "L", "XL"]` for apparel; omit the field
  entirely for mugs/stickers (it's optional — see `catalog/products.schema.json`).
- Description: one sentence, matches the tone of the existing entries
  (material/format + what the print depicts).

## 2. Pick an id and check for collisions

Slug format: lowercase, hyphenated, and prefixed by category —
`tee-<name>` for apparel, `mug-<name>` for mugs, `sticker-<name>` for
stickers (e.g. `tee-ridge-runner`, `mug-summit`, `sticker-compass`). Check
it isn't already used in `catalog/products.json` or `catalog/drafts/*.json`.

## 3. Draw the SVG in the established technique

Every product image is a 300×300 hand-authored SVG: a pale background
rect, a light garment/object silhouette, and a simple line-art or
flat-shape motif in the theme's greens/blues. Reuse the base shape for
your category verbatim so new products look like the same photography
style — only the interior motif and background tint should change.

**Apparel** — reuse the garment outline from `tee-mountain`/`tee-wave`/
`tee-forest`/`tee-aurora` verbatim:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" role="img" aria-label="REPLACE ME">
  <rect width="300" height="300" fill="#e6f0ec"/>
  <path d="M90 60 L120 40 L150 60 L180 40 L210 60 L210 90 L235 100 L235 260 L65 260 L65 100 L90 90 Z"
        fill="#f5f5f5" stroke="#c9ced6" stroke-width="3"/>
  <!-- your new interior design goes here, roughly within x:85-215 y:100-220 -->
</svg>
```

**Mugs** — reuse the mug body + handle from `mug-alpine.svg` verbatim,
interior motif roughly within x:100-200 y:110-200:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" role="img" aria-label="REPLACE ME">
  <rect width="300" height="300" fill="#eef3f1"/>
  <rect x="85" y="95" width="130" height="140" rx="12" fill="#f5f5f5" stroke="#c9ced6" stroke-width="3"/>
  <path d="M215 125 Q255 125 255 165 Q255 205 215 205" fill="none" stroke="#c9ced6" stroke-width="10" stroke-linecap="round"/>
  <!-- your new interior design goes here -->
</svg>
```

**Stickers** — reuse the circular die-cut from `sticker-trailhead.svg`
verbatim, interior motif roughly within the inner dashed ring (radius 90
around the 150,150 center):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" role="img" aria-label="REPLACE ME">
  <rect width="300" height="300" fill="#eef7f2"/>
  <circle cx="150" cy="150" r="105" fill="#f5f5f5" stroke="#c9ced6" stroke-width="3"/>
  <circle cx="150" cy="150" r="90" fill="none" stroke="#1f6f54" stroke-width="2" stroke-dasharray="4 5"/>
  <!-- your new interior design goes here -->
</svg>
```

Guidelines for the interior design, regardless of category:
- Keep it simple line-art or flat-shape silhouette, like the existing
  products (a mountain ridge + sun dot, wave lines, a layered forest
  canopy, aurora ribbons + stars).
- Use colors from the theme palette in `src/styles/global.css`
  (`--color-primary: #1f6f54`, `--color-secondary: #157a9c`, plus muted
  tints of either) so the product tile doesn't clash with the site theme.
- Background rect: a very pale tint related to the design (see the
  existing examples: `#eef2f7`, `#eef7f7`, `#eef7ef`, `#eef1f7`,
  `#eef3f1`, `#eef7f2`) — keep it in that same pale, low-saturation family.

## 4. Write the draft files

- `catalog/drafts/<id>.json` — a single product object matching
  `catalog/products.schema.json`: `id`, `name`, `description`, `price`,
  `currency: "usd"`, `image: "/products/<id>.svg"`, `category`, and
  `sizes` (apparel only — omit the key entirely for mugs/stickers).
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
```

`GH_TOKEN` now has `Contents`, `Pull requests`, and `Workflows` all set to
`Read and write`, which is enough — but **`gh pr create` itself doesn't
work in this sandbox**: it calls GitHub's GraphQL API, which fails here
with a TLS certificate error (`x509: OSStatus -26276`), unrelated to token
scope. Plain REST calls work fine, so open the PR that way instead:

```sh
curl -s -X POST \
  -H "Authorization: Bearer $GH_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/2525jk/storefront-project/pulls" \
  -d '{"title":"Draft product: <name>","head":"add-product-<id>","base":"master","body":"Proposed by the generate-product skill. Run scripts/promote-draft.mjs catalog/drafts/<id>.json after merge to publish it."}'
```

(Build the JSON body via a small script/heredoc rather than inline shell
quoting if the title/body contain quotes or newlines.) If even the REST
call fails, stop after the push and tell the user the branch is up but the
PR needs to be opened manually; do not fall back to pushing straight to
master.

## 7. What you must never do

- Never write to `catalog/products.json` directly — that's
  `scripts/promote-draft.mjs`'s job, run after a human merges the PR.
- Never push or merge to `master` from this skill.
- Never propose more than one product in a single run.
- Never remove or edit an existing product's entry.
