#!/usr/bin/env node
// Usage:
//   node scripts/validate-catalog.mjs              validate catalog/products.json
//   node scripts/validate-catalog.mjs <draft.json>  validate one draft against the existing catalog
//
// Exits 1 with the error list on failure — this is what both the CI
// workflow and scripts/promote-draft.mjs gate on.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateCatalog, validateProduct, REPO_ROOT } from './catalog-validation.mjs';

const CATALOG_PATH = path.join(REPO_ROOT, 'catalog', 'products.json');
const draftPath = process.argv[2];

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

if (!draftPath) {
  const catalog = loadJson(CATALOG_PATH);
  const errors = validateCatalog(catalog);
  if (errors.length > 0) {
    console.error(`✗ catalog/products.json failed validation (${errors.length} error(s)):\n`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`✓ catalog/products.json is valid (${catalog.length} product(s))`);
} else {
  const catalog = loadJson(CATALOG_PATH);
  const draft = loadJson(path.resolve(draftPath));
  const draftImageDir = path.join(REPO_ROOT, 'catalog', 'drafts', 'images');
  const errors = validateProduct(draft, { existingIds: catalog.map((p) => p.id), imageDir: draftImageDir });
  if (errors.length > 0) {
    console.error(`✗ ${draftPath} failed validation (${errors.length} error(s)):\n`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log(`✓ ${draftPath} is valid and ready to promote`);
}
