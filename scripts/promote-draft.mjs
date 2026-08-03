#!/usr/bin/env node
// Usage: node scripts/promote-draft.mjs catalog/drafts/<id>.json
//
// Merges an approved draft into catalog/products.json and moves its staged
// artwork from catalog/drafts/images/ into public/products/. Re-validates
// after the copy (so the "image exists" check in validateProduct is
// meaningful) and rolls the copy back if validation still fails for any
// other reason.
//
// Deliberately does not delete the draft files or commit anything itself —
// that's left as an explicit last step, printed at the end.

import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { validateProduct, REPO_ROOT } from './catalog-validation.mjs';

const draftArg = process.argv[2];
if (!draftArg) {
  console.error('Usage: node scripts/promote-draft.mjs <path-to-draft.json>');
  process.exit(1);
}

const CATALOG_PATH = path.join(REPO_ROOT, 'catalog', 'products.json');
const DRAFT_IMAGES_DIR = path.join(REPO_ROOT, 'catalog', 'drafts', 'images');
const PUBLIC_PRODUCTS_DIR = path.join(REPO_ROOT, 'public', 'products');

const draftPath = path.resolve(draftArg);
const draft = JSON.parse(readFileSync(draftPath, 'utf-8'));
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

if (typeof draft.image !== 'string') {
  console.error('✗ Draft has no "image" field — cannot locate its staged artwork');
  process.exit(1);
}

const imageFilename = path.basename(draft.image);
const stagedImagePath = path.join(DRAFT_IMAGES_DIR, imageFilename);
const publishedImagePath = path.join(PUBLIC_PRODUCTS_DIR, imageFilename);

if (!existsSync(stagedImagePath)) {
  console.error(`✗ Staged artwork not found at catalog/drafts/images/${imageFilename}`);
  process.exit(1);
}

if (existsSync(publishedImagePath)) {
  console.error(`✗ public/products/${imageFilename} already exists — refusing to overwrite`);
  process.exit(1);
}

copyFileSync(stagedImagePath, publishedImagePath);

const errors = validateProduct(draft, { existingIds: catalog.map((p) => p.id) });
if (errors.length > 0) {
  unlinkSync(publishedImagePath);
  console.error(`✗ Draft failed validation (${errors.length} error(s)) — rolled back the image copy:\n`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

catalog.push(draft);
writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');

console.log(`✓ Promoted "${draft.id}" into catalog/products.json`);
console.log(`✓ Copied artwork to public/products/${imageFilename}`);
console.log('\nNext: remove the draft files and commit, e.g.');
console.log(`  rm ${path.relative(REPO_ROOT, draftPath)} ${path.relative(REPO_ROOT, stagedImagePath)}`);
console.log(`  git add catalog/products.json public/products/${imageFilename}`);
console.log(`  git commit -m "Add ${draft.name} to the catalog"`);
