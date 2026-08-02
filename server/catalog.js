import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '..', 'catalog', 'products.json');

const products = JSON.parse(readFileSync(catalogPath, 'utf-8'));

export function getCatalog() {
  return products;
}

export function getProduct(id) {
  return products.find((product) => product.id === id);
}
