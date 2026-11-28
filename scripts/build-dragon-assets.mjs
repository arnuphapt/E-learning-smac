import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TextureAtlas, AtlasAttachmentLoader, SkeletonBinary } from '@esotericsoftware/spine-core';
import { NATIVE_ATTRACTION_PARTICLES } from '../lib/dragon/generated/native-attraction-particles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SRC = path.resolve(REPO_ROOT, '../_ref/hatch-dragons-base');
const OUT_ROOT = path.join(REPO_ROOT, 'public', 'dragon');
const ALLOWED_SETS = new Set(['S001', 'S002', 'S003']);
const SIZE_GATE_BYTES = 52_428_800; // 50 MB
const SOURCE_COMMIT = '4307016b';
const WEBP_OPTIONS = { quality: 90, alphaQuality: 100 };

const srcArg = process.argv[2];
const SRC_ROOT = srcArg ? path.resolve(process.cwd(), srcArg) : DEFAULT_SRC;

if (!fs.existsSync(SRC_ROOT)) {
  console.error(`Source repo not found: ${SRC_ROOT}`);
  process.exit(1);
}

const filesToCopy = new Set();
const transformedJson = new Map();

function urlToRel(urlPath) {
  return decodeURIComponent(urlPath.replace(/^\/+/, ''));
}

function toSrcPngRel(rel) {
  return rel.replace(/\.webp$/i, '.png');
}

function addUrl(urlPath) {
  if (!urlPath || typeof urlPath !== 'string' || !urlPath.startsWith('/')) return;
  filesToCopy.add(toSrcPngRel(urlToRel(urlPath)));
}

function addTextureName(name) {
  if (!name) return;
  filesToCopy.add(toSrcPngRel(path.posix.join('assets/Texture2D', name)));
}

function readSrcJson(urlPath) {
  const rel = urlToRel(urlPath);
  return JSON.parse(fs.readFileSync(path.join(SRC_ROOT, rel), 'utf8'));
}

function rewritePngRefsInJson(value) {
  if (typeof value === 'string') {
    return value.replace(/\.png(?=$|[?#])/gi, '.webp');
  }
  if (Array.isArray(value)) {
    return value.map(rewritePngRefsInJson);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const newKey = k.replace(/\.png$/i, '.webp');
      out[newKey] = rewritePngRefsInJson(v);
    }
    return out;
  }
  return value;
}

function rewriteAtlasPages(atlasText) {
  const lines = atlasText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const next = (lines[i + 1] ?? '').trim();
    if (next.startsWith('size:')) {
      lines[i] = lines[i].replace(/\.png(\s*)$/i, '.webp$1');
    }
  }
  return lines.join('\n');
}

// 1. Engine core JSONs
const engineJsonUrls = [
  '/data/source-map.json',
  '/generated/manifest.json',
  '/data/base-config.json',
  '/generated/wind-profiles.json',
  '/data/rendering-profile.json',
  '/generated/expansions.json',
  '/generated/dragon-colliders.json',
];
for (const u of engineJsonUrls) addUrl(u);

// 2. Manifest textures & fixedEntities
const manifest = readSrcJson('/generated/manifest.json');
for (const t of Object.values(manifest.textures || {})) {
  if (t?.url) addUrl(t.url);
}
for (const entity of manifest.fixedEntities || []) {
  if (!entity?.animationUrl) continue;
  addUrl(entity.animationUrl);
  const animData = readSrcJson(entity.animationUrl);
  for (const shape of animData.shapes || []) {
    const pageName = animData.pages?.[shape.page];
    addTextureName(pageName);
  }
}

// 3. Expansions cover, hintSprites (drop unused audio)
const expansions = readSrcJson('/generated/expansions.json');
const { audio: _droppedAudio, ...expansionsWithoutAudio } = expansions;
transformedJson.set('generated/expansions.json', expansionsWithoutAudio);
if (expansions.cover?.texture) addTextureName(expansions.cover.texture);
for (const g of Object.values(expansions.hintSprites || {})) {
  if (g?.texture) addTextureName(g.texture);
}

// 4. NPC mixer
addUrl('/assets/TextAsset/Elf.atlas.txt');
addUrl('/assets/TextAsset/Elf.skel.bytes');
addUrl('/data/npc-animation-config.json');

// 5. Hatchery catalog (species cut to S001, S002, S003)
addUrl('/generated/hatching/catalog.json');
const sourceCatalog = readSrcJson('/generated/hatching/catalog.json');
const keptSpecies = sourceCatalog.species.filter((s) => ALLOWED_SETS.has(s.region));
const keptSpeciesIds = new Set(keptSpecies.map((s) => s.id));
const keptBabyFamilies = new Set(keptSpecies.map((s) => s.family));
const keptAdultFamilies = new Set(keptSpecies.map((s) => s.adultFamily));

const filteredPools = [];
for (const poolObj of sourceCatalog.pools || []) {
  const entries = (poolObj.pool || []).filter(
    (entry) => entry.key === 'new' || entry.key === 'dupe' || keptSpeciesIds.has(entry.key)
  );
  if (entries.length > 0) {
    filteredPools.push({ ...poolObj, pool: entries });
  }
}

const filteredFeedingFamilies = {};
for (const fam of keptBabyFamilies) {
  if (sourceCatalog.feeding?.families?.[fam]) {
    filteredFeedingFamilies[fam] = sourceCatalog.feeding.families[fam];
  }
}

const filteredAdultFamilies = {};
for (const fam of keptAdultFamilies) {
  if (sourceCatalog.adult?.families?.[fam]) {
    filteredAdultFamilies[fam] = sourceCatalog.adult.families[fam];
  }
}

const trimmedCatalog = {
  ...sourceCatalog,
  normalSets: sourceCatalog.normalSets.filter((id) => ALLOWED_SETS.has(id)),
  species: keptSpecies,
  pools: filteredPools,
  feeding: {
    ...sourceCatalog.feeding,
    families: filteredFeedingFamilies,
  },
  adult: {
    ...sourceCatalog.adult,
    families: filteredAdultFamilies,
  },
};
transformedJson.set('generated/hatching/catalog.json', trimmedCatalog);

// Summoning assets & attraction particles
if (trimmedCatalog.summoning?.buttonImage) addUrl(trimmedCatalog.summoning.buttonImage);
if (trimmedCatalog.summoning?.moveButtonImage) addUrl(trimmedCatalog.summoning.moveButtonImage);
if (trimmedCatalog.summoning?.effectsUrl) {
  addUrl(trimmedCatalog.summoning.effectsUrl);
  const summonAssets = readSrcJson(trimmedCatalog.summoning.effectsUrl);
  for (const t of Object.values(summonAssets.textures || {})) {
    if (t?.url) addUrl(t.url);
  }
}
for (const emitter of NATIVE_ATTRACTION_PARTICLES.emitters || []) {
  if (emitter?.head?.texture) addTextureName(emitter.head.texture);
}

// Feeding food texture & Spine families (baby + adult)
if (trimmedCatalog.feeding?.food?.texture) {
  addTextureName(trimmedCatalog.feeding.food.texture);
}

function addUsedSpinePages(fam, speciesIds, includeMax) {
  if (!fam?.atlasUrl || !fam?.binaryUrl) return;
  addUrl(fam.atlasUrl);
  addUrl(fam.binaryUrl);
  const atlasText = fs.readFileSync(path.join(SRC_ROOT, urlToRel(fam.atlasUrl)), 'utf8');
  const atlas = new TextureAtlas(atlasText);
  const binary = new Uint8Array(fs.readFileSync(path.join(SRC_ROOT, urlToRel(fam.binaryUrl))));
  const skelData = new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(binary);

  const skins = [];
  if (skelData.defaultSkin) skins.push(skelData.defaultSkin);
  for (const id of speciesIds) {
    const base = skelData.findSkin(id);
    if (base) skins.push(base);
    if (includeMax) {
      const max = skelData.findSkin(`${id}Max`);
      if (max) skins.push(max);
    }
  }
  for (const skin of skins) {
    for (const entry of skin.getAttachments()) {
      const pageName = entry.attachment?.region?.page?.name;
      if (!pageName) continue;
      const mapped = fam.pages?.[pageName] ?? pageName;
      addTextureName(mapped);
    }
  }
}

for (const [famName, fam] of Object.entries(filteredFeedingFamilies)) {
  const ids = keptSpecies.filter((s) => s.family === famName).map((s) => s.id);
  addUsedSpinePages(fam, ids, false);
}
for (const [famName, fam] of Object.entries(filteredAdultFamilies)) {
  const ids = keptSpecies.filter((s) => s.adultFamily === famName).map((s) => s.id);
  addUsedSpinePages(fam, ids, true);
}

// Per-species hatching JSON + textures
for (const sp of keptSpecies) {
  if (sp.url) {
    addUrl(sp.url);
    const packData = readSrcJson(sp.url);
    for (const shape of packData.shapes || []) {
      addTextureName(packData.pages?.[shape.page]);
    }
  }
}

// 6. Native UI JSONs, sprite art, and fonts
// ponytail: explicit keep-lists of sprites that can render in active adult/baby status panels
const nativeUiPanels = [
  {
    jsonUrl: '/generated/native-adult-status.json',
    artDir: 'generated/native-adult-status-art',
    keepSprites: new Set([
      'Panel_Header',
      'Coin_Small',
      'clock',
      'EntityStatus_Decor1',
      'EntityStatus_Decor2',
    ]),
  },
  {
    jsonUrl: '/generated/native-baby-status.json',
    artDir: 'generated/native-baby-status-art',
    keepSprites: new Set([
      'Panel_Header',
      'lvl-progress-outer',
      'lvl-progress-fill',
      'EntityStatus_Decor1',
      'EntityStatus_Decor2',
      'Button_Default',
      'Inlay_Move',
    ]),
  },
];
for (const panel of nativeUiPanels) {
  addUrl(panel.jsonUrl);
  const uiJson = readSrcJson(panel.jsonUrl);
  const keptSprites = {};
  for (const spriteName of Object.keys(uiJson.sprites || {})) {
    if (!panel.keepSprites.has(spriteName)) continue;
    keptSprites[spriteName] = uiJson.sprites[spriteName];
    filesToCopy.add(path.posix.join(panel.artDir, `${spriteName}.png`));
  }
  const prunedImages = (uiJson.images || []).map((img) =>
    img?.sprite && !panel.keepSprites.has(img.sprite)
      ? { ...img, sprite: '', enabled: false }
      : img
  );
  transformedJson.set(urlToRel(panel.jsonUrl), {
    ...uiJson,
    sprites: keptSprites,
    images: prunedImages,
  });
  for (const font of Object.values(uiJson.fonts || {})) {
    if (font?.url) addUrl(font.url);
  }
}

// 7. Wipe and rebuild public/dragon/
fs.rmSync(OUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUT_ROOT, { recursive: true });

const sourceList = [...filesToCopy].sort();
const outputList = [];
const folderStats = new Map();
let grandTotalBytes = 0;
let pngBytesBefore = 0;
let webpBytesAfter = 0;
let convertedPngCount = 0;
const sampleTargets = new Set([
  'assets/Texture2D/Babies_1.png',
  'assets/Texture2D/Wyvern_2.png',
  'assets/Texture2D/sactx-0-2048x2048-ASTC 6x6-HUD-f3fe5c6e.png',
]);
const sampleStats = [];

for (const rel of sourceList) {
  const isPng = rel.toLowerCase().endsWith('.png');
  const outRel = isPng ? rel.replace(/\.png$/i, '.webp') : rel;
  const dstPath = path.join(OUT_ROOT, outRel);
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });

  let bytes;
  if (transformedJson.has(rel)) {
    const rewritten = rewritePngRefsInJson(transformedJson.get(rel));
    const content = JSON.stringify(rewritten);
    fs.writeFileSync(dstPath, content, 'utf8');
    bytes = Buffer.byteLength(content, 'utf8');
  } else {
    const srcPath = path.join(SRC_ROOT, rel);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing reachable source file: ${srcPath}`);
    }
    if (isPng) {
      const beforeBytes = fs.statSync(srcPath).size;
      await sharp(srcPath).webp(WEBP_OPTIONS).toFile(dstPath);
      bytes = fs.statSync(dstPath).size;
      pngBytesBefore += beforeBytes;
      webpBytesAfter += bytes;
      convertedPngCount += 1;
      if (sampleTargets.has(rel)) {
        sampleStats.push({ rel: outRel, beforeBytes, afterBytes: bytes });
      }
    } else if (rel.toLowerCase().endsWith('.json')) {
      const rawJson = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
      const content = JSON.stringify(rewritePngRefsInJson(rawJson));
      fs.writeFileSync(dstPath, content, 'utf8');
      bytes = Buffer.byteLength(content, 'utf8');
    } else if (rel.toLowerCase().endsWith('.atlas.txt')) {
      const rawAtlas = fs.readFileSync(srcPath, 'utf8');
      const content = rewriteAtlasPages(rawAtlas);
      fs.writeFileSync(dstPath, content, 'utf8');
      bytes = Buffer.byteLength(content, 'utf8');
    } else {
      fs.copyFileSync(srcPath, dstPath);
      bytes = fs.statSync(dstPath).size;
    }
  }

  outputList.push(outRel);
  const topFolder = outRel.split('/')[0];
  const stat = folderStats.get(topFolder) ?? { count: 0, bytes: 0 };
  stat.count += 1;
  stat.bytes += bytes;
  folderStats.set(topFolder, stat);
  grandTotalBytes += bytes;
}

// 8. Generate public/dragon/CREDITS.md
const creditsLines = [
  '# Dragon Assets Credits',
  '',
  `Source: Dice's game \`hatch-dragons-base\` at commit \`${SOURCE_COMMIT}\`.`,
  `Species sets included: ${[...ALLOWED_SETS].join(', ')} (${keptSpecies.length} species).`,
  `Images converted to WebP (sharp quality=${WEBP_OPTIONS.quality}, alphaQuality=${WEBP_OPTIONS.alphaQuality}).`,
  `Total files: ${outputList.length} (${(grandTotalBytes / (1024 * 1024)).toFixed(2)} MB).`,
  '',
];

if (outputList.length > 300) {
  creditsLines.push('## Folders (file count > 300; grouped by top-level folder)', '');
  for (const [folder, stat] of [...folderStats.entries()].sort()) {
    creditsLines.push(`- \`${folder}/\` — ${stat.count} files (${stat.bytes.toLocaleString('en-US')} bytes)`);
  }
} else {
  creditsLines.push('## Files', '');
  for (const rel of outputList) {
    creditsLines.push(`- \`${rel}\``);
  }
}

fs.writeFileSync(path.join(OUT_ROOT, 'CREDITS.md'), creditsLines.join('\n') + '\n', 'utf8');

// 9. Print summary
console.log(`Built public/dragon from ${SRC_ROOT} (${keptSpecies.length} species in ${[...ALLOWED_SETS].join(', ')})`);
console.log(`Converted ${convertedPngCount} PNGs to WebP: ${(pngBytesBefore / (1024 * 1024)).toFixed(2)} MB -> ${(webpBytesAfter / (1024 * 1024)).toFixed(2)} MB`);
for (const s of sampleStats) {
  console.log(`  sample ${s.rel}: ${s.beforeBytes} -> ${s.afterBytes} bytes`);
}
for (const [folder, stat] of [...folderStats.entries()].sort()) {
  const mb = (stat.bytes / (1024 * 1024)).toFixed(2);
  console.log(`  ${folder.padEnd(12)} ${String(stat.count).padStart(4)} files  ${String(stat.bytes).padStart(11)} bytes (${mb} MB)`);
}
const totalMb = (grandTotalBytes / (1024 * 1024)).toFixed(2);
console.log(`  TOTAL        ${String(outputList.length).padStart(4)} files  ${String(grandTotalBytes).padStart(11)} bytes (${totalMb} MB)`);

if (grandTotalBytes > SIZE_GATE_BYTES) {
  console.log(`SIZE GATE EXCEEDED: ${grandTotalBytes} bytes > ${SIZE_GATE_BYTES} bytes (50 MB)`);
} else {
  console.log(`SIZE GATE PASSED: ${grandTotalBytes} bytes <= ${SIZE_GATE_BYTES} bytes (50 MB)`);
}
