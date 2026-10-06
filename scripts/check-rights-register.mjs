import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const catalog = JSON.parse(await fs.readFile(path.join(dist, 'wallpapers/catalog.json'), 'utf8'));
const credits = JSON.parse(await fs.readFile(path.join(dist, 'wallpapers/credits.json'), 'utf8'));
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
console.log(`PASS: ${cities.size} wallpaper entries map to existing day/night/mask files and have an explicit rights-review status.`);
if (pending) console.log(`REVIEW REQUIRED: ${pending} wallpaper sets remain marked needs-review; this check verifies record completeness, not permission or ownership.`);

