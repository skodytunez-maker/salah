import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {packZip,crc32,buildWebUpdate} from '../mobile/scripts/build-web-update.mjs';
const fixture=[{name:'index.html',bytes:Buffer.from('SALAH')},{name:'js/app.js',bytes:Buffer.from('console.log("سلام")')}];
const zip=packZip(fixture);let offset=0;
for(const file of fixture){assert.equal(zip.readUInt32LE(offset),0x04034b50);const length=zip.readUInt16LE(offset+26),size=zip.readUInt32LE(offset+18),start=offset+30+length;assert.equal(zip.subarray(offset+30,start).toString(),file.name);assert.deepEqual(inflateRawSync(zip.subarray(start,start+size)),file.bytes);assert.equal(zip.readUInt32LE(offset+14),crc32(file.bytes));offset=start+size;}
assert.equal(zip.readUInt32LE(offset),0x02014b50);
assert.deepEqual(packZip(fixture),zip);
for(const name of ['../outside','/outside','js/../secret','x:y'])assert.throws(()=>packZip([{name,bytes:Buffer.from('x')}]));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'salah-live-update-'));
try{
 const source=path.join(root,'www'),out=path.join(root,'out');
 for(const name of ['index.html','js/native-entry.js','js/app-release.js','js/app.js','js/vendor/capacitor-core.js']){await fs.mkdir(path.dirname(path.join(source,name)),{recursive:true});await fs.writeFile(path.join(source,name),'fixture');}
 const manifest=await buildWebUpdate(source,out,333),bytes=await fs.readFile(path.join(out,manifest.file));
 assert.equal(manifest.sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(manifest.bytes,bytes.length);assert.equal(manifest.minNativeVersion,332);
 await fs.writeFile(path.join(source,'secret.jks'),'private');await assert.rejects(buildWebUpdate(source,out,334));await fs.rm(path.join(source,'secret.jks'));
 await fs.rm(path.join(source,'index.html'));await assert.rejects(buildWebUpdate(source,out,334));
} finally{await fs.rm(root,{recursive:true,force:true});}
console.log('PASS: deterministic valid ZIP, CRC and SHA integrity, native/private-file exclusion, traversal and incomplete bundle rejection.');
