import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import{fileURLToPath}from 'node:url';
import{createHash}from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const media=await read('docs/media-rights-register.json');
const content=await read('docs/content-rights-register.json');
const snapshot=process.argv.includes('--snapshot');
const allowed=new Set(['needs-review','license-recorded','origin-supported','cleared-with-evidence']);
const relative=value=>typeof value==='string'&&value.startsWith('dist/')&&!value.includes('\\')&&!value.split('/').some(p=>p==='..'||p==='.'||p==='')&&!path.isAbsolute(value);
const sha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
function validate(records,inventory){
 assert.equal(records.schemaVersion,2);assert.ok(sha(records.sourceCommit));assert.ok(Array.isArray(records.assets));
 const entries=new Map();
 for(const entry of records.assets){
  assert.ok(relative(entry.path),'Unsafe media path: '+entry.path);
  assert.ok(!entries.has(entry.path),'Duplicate media: '+entry.path);
  assert.ok(inventory.has(entry.path),'Unregistered/missing build file: '+entry.path);
  assert.ok(sha(entry.gitBlobSha),'Missing source fingerprint: '+entry.path);
  assert.ok(allowed.has(entry.rightsReviewStatus),'Unknown status: '+entry.path);
  assert.ok(typeof entry.note==='string'&&entry.note.trim(),'Missing evidence note: '+entry.path);
  if(entry.rightsReviewStatus!=='needs-review')assert.ok(typeof entry.rightsEvidence==='string'&&entry.rightsEvidence.trim(),'Claimed evidence missing: '+entry.path);
  if(entry.rightsReviewStatus==='cleared-with-evidence')assert.ok(entry.permissionScope?.trim(),'Cleared status requires explicit scope: '+entry.path);
  entries.set(entry.path,entry);
 }
 for(const file of inventory.keys())assert.ok(entries.has(file),'Media file has no rights record: '+file);
 const sets=new Set();
 for(const set of records.wallpaperSets){
  assert.ok(set.id&&!sets.has(set.id),'Duplicate wallpaper set');
  sets.add(set.id);assert.ok(allowed.has(set.rightsReviewStatus));
  assert.equal(set.paths.length,3);
  for(const file of set.paths)assert.equal(entries.get(file)?.wallpaperSet,set.id,'Unmapped wallpaper file: '+file);
 }
 assert.equal(sets.size,14,'Update audit when the wallpaper catalogue changes');
 return entries;
}
let inventory,sourceFiles;
if(snapshot){
 const manifest=await read('docs/rights-source-manifest.json');
 assert.equal(manifest.sourceCommit,media.sourceCommit);assert.equal(content.sourceCommit,media.sourceCommit);
 sourceFiles=new Map(manifest.entries.map(entry=>[entry.path,entry]));
 inventory=new Map(manifest.entries.filter(entry=>/^dist\/.*\.(png|jpe?g|webp|svg|ttf|mp3)$/.test(entry.path)).map(entry=>[entry.path,entry]));
}else{
 inventory=new Map();
 async function scan(directory){
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
   const file=path.join(directory,entry.name);if(entry.isDirectory())await scan(file);
   else if(/\.(png|jpe?g|webp|svg|ttf|mp3)$/i.test(entry.name))inventory.set(path.relative(root,file).split(path.sep).join('/'),{});
  }
 }
 await scan(path.join(root,'dist'));
}
validate(media,inventory);
for(const entry of media.assets){
 if(snapshot)assert.equal(sourceFiles.get(entry.path)?.gitBlobSha,entry.gitBlobSha,'Snapshot fingerprint mismatch');
 else await fs.access(path.join(root,entry.path));
}
const components=new Set();
for(const component of content.components){
 assert.ok(component.id&&!components.has(component.id));components.add(component.id);
 assert.equal(component.status,'license-recorded');assert.ok(component.license&&component.conditions&&sha(component.licenseGitBlobSha));
 if(snapshot)assert.equal(sourceFiles.get(component.licenseFile)?.gitBlobSha,component.licenseGitBlobSha,'License fingerprint mismatch');
 else{
  const bytes=await fs.readFile(path.join(root,component.licenseFile));
  const blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  assert.equal(blob,component.licenseGitBlobSha,'License notice changed; recheck '+component.licenseFile);
 }
}
assert.equal(content.project.ownerStatement.externalDevelopersOrDesigners,false);
if(process.argv.includes('--self-test')){
 for(const mutate of [
  value=>value.assets.pop(),
  value=>value.assets.push(value.assets[0]),
  value=>value.assets[0].path='dist/../private.png',
  value=>{value.assets[0].rightsReviewStatus='cleared-with-evidence';delete value.assets[0].rightsEvidence},
  value=>{value.assets[0].rightsReviewStatus='cleared-with-evidence';value.assets[0].rightsEvidence='unscoped claim'}
 ]){
  const changed=structuredClone(media);mutate(changed);assert.throws(()=>validate(changed,inventory));
 }
 console.log('PASS: missing/duplicate media, unsafe paths and unsupported clearance claims are rejected.');
}
console.log('PASS: '+media.assets.length+' media files, '+media.wallpaperSets.length+' wallpaper sets and '+components.size+' component notices ('+(snapshot?'Git source snapshot':'complete build')+').');
console.log('Rights evidence remains a human/document review. This check does not grant permission or issue a certificate.');
