import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

// Link the real browser module graph without evaluating browser-only code.
// Syntax checks alone cannot detect a named import removed from a dependency.
if (!vm.SourceTextModule) {
 let result,attempts=0;
 do{result=spawnSync(process.execPath,['--experimental-vm-modules',fileURLToPath(import.meta.url)],{encoding:'utf8',windowsHide:true});attempts++;}
 while(process.platform==='win32'&&[3221225477,-1073741819].includes(result.status)&&!result.stdout&&!result.stderr&&attempts<3);
 process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');
 if(result.error)console.error(result.error);
 process.exit(result.status??1);
}
const dist=new URL('../dist/',import.meta.url),entries=new Set(),modules=new Map();
for(const name of await fs.readdir(dist)){
 if(!name.endsWith('.html'))continue;
 const html=await fs.readFile(new URL(name,dist),'utf8');
 for(const [script] of html.matchAll(/<script\b[^>]*>/gi)){
  if(!/\btype\s*=\s*["']module["']/i.test(script))continue;
  const src=script.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  if(src)entries.add(new URL(src,dist).href);
 }
}
assert.ok(entries.has(new URL('js/app.js',dist).href),'The actual app entry must be linked');
function load(url){
 assert.ok(url.startsWith(dist.href),'A browser module must stay inside dist: '+url);
 if(!modules.has(url))modules.set(url,fs.readFile(new URL(url),'utf8').then(source=>new vm.SourceTextModule(source,{identifier:url})));
 return modules.get(url);
}
for(const url of entries){
 const entry=await load(url);
 if(entry.status==='unlinked')await entry.link((specifier,ref)=>{
  assert.ok(specifier.startsWith('.'),'Resolve only bundled browser imports: '+specifier);
  return load(new URL(specifier,ref.identifier).href);
 });
}
console.log('PASS: '+entries.size+' browser entries and '+modules.size+' modules link with all named exports available.');
