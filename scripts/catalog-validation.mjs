// Shared validation logic for catalog/products.json entries and drafts
// awaiting review. Deliberately dependency-free (no ajv) — the schema in
// catalog/products.schema.json is the documentation of these rules; this
// file is the enforcement, kept in sync by hand since the ruleset is small.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, '..');
const DEFAULT_IMAGE_DIR = path.join(REPO_ROOT, 'public', 'products');

const ALLOWED_KEYS = ['id', 'name', 'description', 'price', 'currency', 'image', 'sizes'];
const ALLOWED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_PATTERN = /^\/products\/[a-z0-9-]+\.svg$/;

/**
 * Validates a single product object. Returns an array of human-readable
 * error strings (empty means valid).
 *
 * @param {unknown} product
 * @param {{ existingIds?: string[], imageDir?: string }} [options]
 *   `existingIds`: IDs already in the catalog, for uniqueness-checking a
 *   draft before it's merged in.
 *   `imageDir`: directory the image's basename must actually exist in.
 *   Defaults to `public/products/` (the published location); pass
 *   `catalog/drafts/images/` when validating a not-yet-promoted draft,
 *   whose artwork hasn't moved to `public/products/` yet.
 */
export function validateProduct(product, { existingIds = [], imageDir = DEFAULT_IMAGE_DIR } = {}) {
  if (typeof product !== 'object' || product === null || Array.isArray(product)) {
    return ['Product must be a JSON object'];
  }

  const errors = [];

  for (const key of Object.keys(product)) {
    if (!ALLOWED_KEYS.includes(key)) errors.push(`Unknown field "${key}"`);
  }
  for (const key of ALLOWED_KEYS) {
    if (!(key in product)) errors.push(`Missing required field "${key}"`);
  }
  if (errors.length > 0) return errors; // shape is wrong enough that type checks below aren't meaningful

  const { id, name, description, price, currency, image, sizes } = product;

  if (typeof id !== 'string' || !ID_PATTERN.test(id) || id.length < 3 || id.length > 40) {
    errors.push(`"id" must be a lowercase, hyphenated slug, 3-40 chars (got ${JSON.stringify(id)})`);
  } else if (existingIds.includes(id)) {
    errors.push(`"id" ${JSON.stringify(id)} already exists in the catalog`);
  }

  if (typeof name !== 'string' || name.length < 3 || name.length > 60) {
    errors.push('"name" must be a string, 3-60 chars');
  }

  if (typeof description !== 'string' || description.length < 10 || description.length > 200) {
    errors.push('"description" must be a string, 10-200 chars');
  }

  if (!Number.isInteger(price) || price < 500 || price > 20000) {
    errors.push('"price" must be an integer number of cents between 500 and 20000 ($5-$200)');
  }

  if (currency !== 'usd') {
    errors.push('"currency" must be "usd"');
  }

  if (typeof image !== 'string' || !IMAGE_PATTERN.test(image)) {
    errors.push('"image" must look like "/products/<slug>.svg"');
  } else if (!existsSync(path.join(imageDir, path.basename(image)))) {
    errors.push(`"image" points to ${image}, but no matching file was found in ${path.relative(REPO_ROOT, imageDir)}/`);
  }

  if (!Array.isArray(sizes) || sizes.length === 0) {
    errors.push('"sizes" must be a non-empty array');
  } else {
    const seen = new Set();
    for (const size of sizes) {
      if (!ALLOWED_SIZES.includes(size)) {
        errors.push(`"sizes" contains invalid value ${JSON.stringify(size)} (allowed: ${ALLOWED_SIZES.join(', ')})`);
      }
      if (seen.has(size)) errors.push(`"sizes" has a duplicate value ${JSON.stringify(size)}`);
      seen.add(size);
    }
  }

  return errors;
}

/**
 * Validates a full catalog array, checking each product plus id uniqueness
 * across the set. Returns an array of human-readable error strings.
 *
 * @param {unknown} catalog
 */
export function validateCatalog(catalog) {
  if (!Array.isArray(catalog)) {
    return ['Catalog must be a JSON array'];
  }

  const errors = [];
  const seenIds = [];
  catalog.forEach((product, index) => {
    const label = typeof product?.id === 'string' ? product.id : `index ${index}`;
    for (const err of validateProduct(product, { existingIds: seenIds })) {
      errors.push(`Product ${label}: ${err}`);
    }
    if (typeof product?.id === 'string') seenIds.push(product.id);
  });
  return errors;
}
