import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import{inflateRawSync}from 'node:zlib';
import{createHash}from 'node:crypto';
import{excludeFromWebBundle,buildWebUpdate}from '../mobile/scripts/build-web-update.mjs';
const legacy=['data/recognition/catalog-v1.json','data/recognition/fingerprints-v1.bin.gz'];
for(const name of legacy){assert.equal(excludeFromWebBundle(name),true);await fs.access(new URL('../dist/'+name,import.meta.url));}
const retained=['data/recognition/catalog-v2.json','data/recognition/fingerprints-v2.bin.gz','data/recognition/fingerprints-v1.bin.gz.backup','data/recognition/catalog-v1.json-extra','assets/recognition/catalog-v1.json','js/quran-recognition-data.js'];
for(const name of retained)assert.equal(excludeFromWebBundle(name),false,name+' must stay in native payloads');
const catalog=await fs.readFile(new URL('../dist/data/recognition/catalog-v2.json',import.meta.url)),binary=await fs.readFile(new URL('../dist/data/recognition/fingerprints-v2.bin.gz',import.meta.url));
assert.equal(createHash('sha256').update(binary).digest('hex'),JSON.parse(catalog).packedSha256);
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'salah-native-recognition501-'));
try{
 const source=path.join(temporary,'dist'),out=path.join(temporary,'updates'),files=new Map([
  ...['index.html','js/native-entry.js','js/app-release.js','js/app.js','js/vendor/capacitor-core.js','js/native-startup-recovery.js'].map(name=>[name,Buffer.from('fixture '+name)]),
  ...legacy.map(name=>[name,Buffer.from('retained repository input '+name)]),
  ['data/recognition/catalog-v2.json',catalog],['data/recognition/fingerprints-v2.bin.gz',binary]
 ]);
 for(const[name,bytes]of files){const target=path.join(source,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
 const manifest=await buildWebUpdate(source,out,501),zip=await fs.readFile(path.join(out,manifest.file)),unpacked=new Map();let at=0;
 while(zip.readUInt32LE(at)===0x04034b50){const compressed=zip.readUInt32LE(at+18),length=zip.readUInt16LE(at+26),extra=zip.readUInt16LE(at+28),name=zip.toString('utf8',at+30,at+30+length),start=at+30+length+extra;unpacked.set(name,inflateRawSync(zip.subarray(start,start+compressed)));at=start+compressed;}
 for(const name of legacy){assert.equal(unpacked.has(name),false);assert.deepEqual(await fs.readFile(path.join(source,name)),files.get(name),'Packaging cannot delete repository/Pages inputs');}
 for(const[name,bytes]of files)if(!legacy.includes(name))assert.deepEqual(unpacked.get(name),bytes,'Current assets and native startup remain byte-identical');
 assert.equal(manifest.minNativeVersion,445);assert.ok(manifest.bytes<100*1024*1024);assert.equal(createHash('sha256').update(zip).digest('hex'),manifest.sha256);
}finally{assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));assert.ok(path.basename(temporary).startsWith('salah-native-recognition501-'));await fs.rm(temporary,{recursive:true,force:true});}
console.log('PASS: exact legacy recognition build inputs omitted only from new native packages; repository sources retained, current pinned v2 bytes/startup and strict 100 MiB limit preserved.');
