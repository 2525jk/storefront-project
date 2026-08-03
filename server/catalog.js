import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '..', 'catalog', 'products.json');

// Re-read on every call rather than caching at import time. The catalog is
// a small file, so the cost is negligible, and it means a product merged
// by the automated pipeline (docs/automated-product-pipeline.md) is
// checkout-able immediately — no backend restart required.
function loadCatalog() {
  return JSON.parse(readFileSync(catalogPath, 'utf-8'));
}

export function getCatalog() {
  return loadCatalog();
}

export function getProduct(id) {
  return loadCatalog().find((product) => product.id === id);
}
