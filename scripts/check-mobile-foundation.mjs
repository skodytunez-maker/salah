import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mobile=path.join(root,'mobile');

const pkg=JSON.parse(await fs.readFile(path.join(mobile,'package.json'),'utf8'));
const config=JSON.parse(await fs.readFile(path.join(mobile,'capacitor.config.json'),'utf8'));
const schema=JSON.parse(await fs.readFile(path.join(mobile,'shared/prayer-widget.schema.json'),'utf8'));
const sync=await fs.readFile(path.join(mobile,'scripts/sync-web.mjs'),'utf8');
const readme=await fs.readFile(path.join(mobile,'README.md'),'utf8');

assert.equal(pkg.dependencies['@capacitor/core'],'8.5.2');
for(const name of ['@capacitor/android','@capacitor/cli','@capacitor/ios'])assert.equal(pkg.devDependencies[name],'8.5.2');
assert.equal(config.appName,'SALAH');
assert.match(config.appId,/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/);
assert.equal(config.webDir,'www');
assert.equal(schema.properties.schemaVersion.const,1);
assert.equal(schema.properties.days.maxItems,14);
assert.match(sync,/\.\.\/dist/);
assert.match(sync,/mobile\/www|www/);
assert.match(readme,/Android can be developed and built on Windows\./);
assert.match(readme,/WidgetKit/);
assert.match(readme,/prayer completion history/);

console.log('PASS: cross-platform SALAH mobile foundation, bounded widget contract and Windows/Android path.');
