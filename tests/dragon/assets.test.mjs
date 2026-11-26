import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const OUT_ROOT = path.join(REPO_ROOT, 'public', 'dragon');
const SRC_ROOT = path.resolve(REPO_ROOT, '../_ref/hatch-dragons-base');
const ALLOWED_SETS = new Set(['S001', 'S002', 'S003']);

function walkExt(dir, ext) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkExt(full, ext));
    else if (entry.name.toLowerCase().endsWith(ext)) out.push(full);
  }
  return out;
}

function collectRootRelativeUrls(value, urls = []) {
  if (typeof value === 'string') {
    if (value.startsWith('/')) urls.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectRootRelativeUrls(item, urls);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectRootRelativeUrls(v, urls);
  }
  return urls;
}

function collectPngRefs(value, pathPrefix = '', hits = []) {
  if (typeof value === 'string') {
    if (/\.png(?=$|[?#])/i.test(value)) hits.push(`${pathPrefix}=${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((item, idx) => collectPngRefs(item, `${pathPrefix}[${idx}]`, hits));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (/\.png$/i.test(k)) hits.push(`${pathPrefix}.${k} (key)`);
      collectPngRefs(v, `${pathPrefix}.${k}`, hits);
    }
  }
  return hits;
}

test('built catalog has exact 3 sets, expected species count, and no removed species in pools', () => {
  const builtCatalog = JSON.parse(
    fs.readFileSync(path.join(OUT_ROOT, 'generated/hatching/catalog.json'), 'utf8')
  );
  assert.deepEqual(builtCatalog.normalSets, ['S001', 'S002', 'S003']);

  const srcCatalogPath = path.join(SRC_ROOT, 'generated/hatching/catalog.json');
  if (fs.existsSync(srcCatalogPath)) {
    const srcCatalog = JSON.parse(fs.readFileSync(srcCatalogPath, 'utf8'));
    const expectedCount = srcCatalog.species.filter((s) => ALLOWED_SETS.has(s.region)).length;
    console.log(`Expected species count from source catalog (S001/S002/S003): ${expectedCount}`);
    assert.equal(builtCatalog.species.length, expectedCount);
  }

  for (const sp of builtCatalog.species) {
    assert.ok(ALLOWED_SETS.has(sp.region), `Unexpected species region ${sp.region} for ${sp.id}`);
  }

  const keptIds = new Set(builtCatalog.species.map((s) => s.id));
  for (const [poolId, poolObj] of Object.entries(builtCatalog.pools || {})) {
    assert.ok(Array.isArray(poolObj.pool) && poolObj.pool.length > 0, `Pool ${poolId} must not be empty`);
    for (const entry of poolObj.pool) {
      assert.ok(
        entry.key === 'new' || entry.key === 'dupe' || keptIds.has(entry.key),
        `Pool ${poolId} references removed species ${entry.key}`
      );
    }
  }
});

test('every root-relative URL in every JSON under public/dragon/ resolves to an existing file', () => {
  const jsonFiles = walkExt(OUT_ROOT, '.json');
  assert.ok(jsonFiles.length > 0, 'Expected JSON files under public/dragon/');

  const missing = [];
  let checkedUrls = 0;
  for (const file of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const urls = collectRootRelativeUrls(data);
    for (const url of urls) {
      checkedUrls += 1;
      const rel = decodeURIComponent(url.replace(/^\/+/, ''));
      const target = path.join(OUT_ROOT, rel);
      if (!fs.existsSync(target)) {
        missing.push(`${path.relative(OUT_ROOT, file)}: ${url} -> ${rel}`);
      }
    }
  }
  console.log(`Checked ${checkedUrls} root-relative URLs across ${jsonFiles.length} JSON files`);
  assert.deepEqual(missing, [], `Dangling URLs found:\n${missing.join('\n')}`);
});

test('no .png reference remains in any JSON or atlas under public/dragon/', () => {
  const keptPngs = new Set(); // All texture/art PNGs were converted to WebP.
  const jsonFiles = walkExt(OUT_ROOT, '.json');
  const atlasFiles = walkExt(OUT_ROOT, '.atlas.txt');
  const remaining = [];

  for (const file of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const hit of collectPngRefs(data)) {
      if (!keptPngs.has(hit)) remaining.push(`${path.relative(OUT_ROOT, file)}: ${hit}`);
    }
  }
  for (const file of atlasFiles) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (/\.png\b/i.test(line)) {
        remaining.push(`${path.relative(OUT_ROOT, file)}:${idx + 1}: ${line}`);
      }
    });
  }
  assert.deepEqual(remaining, [], `Remaining .png references:\n${remaining.join('\n')}`);
});
