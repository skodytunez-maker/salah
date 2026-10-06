import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const catalog = JSON.parse(await fs.readFile(path.join(dist, 'wallpapers/catalog.json'), 'utf8'));
const credits = JSON.parse(await fs.readFile(path.join(dist, 'wallpapers/credits.json'), 'utf8'));
const mediaRegister = JSON.parse(await fs.readFile(path.join(root, 'docs/media-rights-register.json'), 'utf8'));
assert.ok(Array.isArray(catalog.cities) && catalog.cities.length, 'Wallpaper city catalog is empty');
assert.ok(Array.isArray(credits), 'Wallpaper credits must be an array');

const cities = new Map();
for (const city of catalog.cities) {
  assert.ok(city.id && !cities.has(city.id), `Missing or duplicate city id: ${city.id}`);
  cities.set(city.id, city);
  for (const asset of [city.day, city.night, city.mask]) {
    assert.ok(asset && !path.isAbsolute(asset), `${city.id}: expected a relative wallpaper asset path`);
    const resolved = path.resolve(dist, asset);
    assert.ok(resolved.startsWith(dist + path.sep), `${city.id}: wallpaper asset escapes dist: ${asset}`);
    assert.ok((await fs.stat(resolved)).isFile(), `${city.id}: missing wallpaper asset ${asset}`);
  }
}

const creditIds = new Set();
for (const credit of credits) {
  assert.ok(credit.id && !creditIds.has(credit.id), `Missing or duplicate credit id: ${credit.id}`);
  creditIds.add(credit.id);
  assert.ok(cities.has(credit.id), `Credits entry has no catalog city: ${credit.id}`);
  assert.ok(['needs-review', 'cleared-with-evidence'].includes(credit.rightsReviewStatus), `${credit.id}: unknown rights-review status`);
  if (credit.rightsReviewStatus === 'cleared-with-evidence') {
    assert.ok(credit.rightsEvidence?.trim(), `${credit.id}: cleared status requires a rights-evidence reference`);
  }
  assert.ok(credit.creation?.trim(), `${credit.id}: missing creation note`);
}

for (const id of cities.keys()) assert.ok(creditIds.has(id), `Wallpaper city is missing a credits entry: ${id}`);
const pending = credits.filter(credit => credit.rightsReviewStatus === 'needs-review').length;
const rasterAssets = new Set();
async function scanAssets(directory) {
  for (const entry of await fs.readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await scanAssets(file);
    else if (/\.(png|jpe?g|webp)$/i.test(entry.name)) rasterAssets.add(path.relative(root, file).split(path.sep).join('/'));
  }
}
await scanAssets(path.join(dist, 'assets'));
assert.ok(Array.isArray(mediaRegister.assets), 'Supplemental media register must be an array');
const registeredMedia = new Set();
for (const asset of mediaRegister.assets) {
  assert.ok(!registeredMedia.has(asset.path), `Duplicate supplemental media entry: ${asset.path}`);
  registeredMedia.add(asset.path);
  assert.ok(rasterAssets.has(asset.path), `Registered media file is missing: ${asset.path}`);
  assert.ok(['needs-review', 'cleared-with-evidence'].includes(asset.rightsReviewStatus), `${asset.path}: unknown rights-review status`);
  if (asset.rightsReviewStatus === 'cleared-with-evidence') assert.ok(asset.rightsEvidence?.trim(), `${asset.path}: cleared status requires evidence`);
  assert.ok(asset.note?.trim(), `${asset.path}: missing review note`);
}
for (const file of rasterAssets) assert.ok(registeredMedia.has(file), `Unregistered raster asset in dist/assets: ${file}`);
const pendingMedia = mediaRegister.assets.filter(asset => asset.rightsReviewStatus === 'needs-review').length;
console.log(`PASS: ${cities.size} wallpaper entries map to existing day/night/mask files; ${rasterAssets.size} supplemental raster assets are registered.`);
if (pending || pendingMedia) console.log(`REVIEW REQUIRED: ${pending} city wallpaper sets and ${pendingMedia} supplemental images need rights review. This check verifies records, not permission or ownership.`);

