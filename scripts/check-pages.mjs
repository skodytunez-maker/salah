import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const base=new URL('https://example.github.io/salah/');
async function exists(ref,context=base){
 if(!ref||ref.startsWith('#')||/^(https?:|data:|mailto:)/.test(ref))return;
 const url=new URL(ref,context);assert.equal(url.origin,base.origin);assert.ok(url.pathname.startsWith(base.pathname),'Resource outside Pages project: '+ref);
 const relative=decodeURIComponent(url.pathname.slice(base.pathname.length))||'index.html';
 assert.ok((await fs.stat(path.join(dist,relative))).isFile(),'Missing asset: '+ref);
}
const manifest=JSON.parse(await fs.readFile(path.join(dist,'manifest.json'),'utf8'));
for(const key of ['id','scope'])assert.equal(new URL(manifest[key],base).href,base.href);
assert.equal(new URL(manifest.start_url,base).href,new URL('#home',base).href);
for(const icon of manifest.icons)await exists(icon.src);
assert.ok(Array.isArray(manifest.shortcuts)&&manifest.shortcuts.length>=3,'Install shortcuts missing');
for(const shortcut of manifest.shortcuts){assert.ok(typeof shortcut.name==='string'&&shortcut.name.trim());const target=new URL(shortcut.url,base);assert.equal(target.origin,base.origin);assert.ok(target.pathname.startsWith(base.pathname),'Shortcut outside Pages project: '+shortcut.url);}
const ownerManifest=JSON.parse(await fs.readFile(path.join(dist,'owner-manifest.json'),'utf8'));
assert.notEqual(new URL(ownerManifest.id,base).href,new URL(manifest.id,base).href);
assert.equal(new URL(ownerManifest.start_url,base).href,new URL('owner.html#admin',base).href);
assert.equal(new URL(ownerManifest.scope,base).href,base.href);
const ownerHtml=await fs.readFile(path.join(dist,'owner.html'),'utf8');
assert.match(ownerHtml,/href="\.\/owner-manifest\.json"/);
assert.match(ownerHtml,/src="\.\/js\/owner-entry\.js"/);
for(const match of ownerHtml.matchAll(/(?:src|href)=["']([^"']+)["']/g))await exists(match[1]);
const worker=await fs.readFile(path.join(dist,'sw.js'),'utf8');
const assets=JSON.parse(worker.match(/const ASSETS=(\[[^;]+\]);/)[1]);
for(const asset of assets)await exists(asset);
const html=await fs.readFile(path.join(dist,'index.html'),'utf8');
const styles=document=>[...document.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g)].map(match=>match[1]);
assert.deepEqual(styles(ownerHtml),styles(html),'Both installed launch pages must load the same application styles in the same order');
for(const style of styles(html))assert.ok(assets.includes(style),'Application stylesheet must be available offline: '+style);
assert.match(html,/name="application-name" content="SALAH"/);
assert.match(html,/name="description" content="SALAH — время намаза, Коран, азкары, Кибла и обучение в одном спокойном приложении\."/);
for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g))await exists(match[1]);
async function scan(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);assert.ok(!entry.isSymbolicLink());if(entry.isDirectory())await scan(file);else if(/\.(js|css)$/.test(file)){const text=await fs.readFile(file,'utf8');const context=new URL(path.relative(dist,file).split(path.sep).join('/'),base);if(file.endsWith('.js')){for(const match of text.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g))await exists(match[1],context);}if(file.endsWith('.css'))for(const match of text.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g))await exists(match[1],context);}}}
await scan(dist);
const index=JSON.parse(await fs.readFile(path.join(dist,'data/quran-index.json'),'utf8'));
assert.equal(index.surahs.length,114);
for(const surah of index.surahs){const bytes=await fs.readFile(path.join(dist,'data/quran',surah.number+'.json'));assert.equal(createHash('sha256').update(bytes).digest('hex'),surah.sha256,'Quran integrity: '+surah.number);if(surah.readingSha256){const reading=await fs.readFile(path.join(dist,'data/quran-reading',surah.number+'.json'));assert.equal(createHash('sha256').update(reading).digest('hex'),surah.readingSha256,'Transcription integrity: '+surah.number);assert.equal(reading.length,surah.readingBytes);}}
console.log('PASS: Pages subpath, PWA identity, '+assets.length+' offline assets, relative imports and CSS, all 114 Quran files.');
