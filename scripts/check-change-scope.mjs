import fs from 'node:fs/promises';
import path from 'node:path';
import{createHash}from 'node:crypto';
import{fileURLToPath}from 'node:url';
import{APP_VERSION}from '../dist/js/app-release.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const plan=JSON.parse(await fs.readFile(new URL('../docs/change-scope.json',import.meta.url),'utf8'));
if(plan.schema!==1||plan.version!==APP_VERSION||!Array.isArray(plan.allowed)||!Array.isArray(plan.baseline)||!Array.isArray(plan.generated))throw Error('Review the explicit change scope for this release before changing its version.');
const allowed=new Set(plan.allowed.map(row=>row.path));
const safePath=value=>typeof value==='string'&&value.length>0&&!value.split('/').includes('..')&&!value.startsWith('/')&&!value.includes('\\');
for(const group of[plan.allowed,plan.generated]){if(new Set(group.map(row=>row.path)).size!==group.length)throw Error('Duplicate reviewed scope path.');for(const row of group)if(!row.reason||!safePath(row.path))throw Error('Invalid reviewed change scope.');}
if(new Set(plan.baseline.map(row=>row.path)).size!==plan.baseline.length||plan.baseline.some(row=>!safePath(row.path)||!/^[a-f0-9]{40}$/.test(row.sha)))throw Error('Invalid scope baseline.');
const known=new Set(plan.baseline.map(row=>row.path)),generated=new Set(plan.generated.map(row=>row.path)),failures=[];
const gitBlob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
let protectedCount=0;
for(const row of plan.baseline){
 if(allowed.has(row.path)||generated.has(row.path))continue;
 let bytes;try{bytes=await fs.readFile(path.join(root,row.path));}catch{failures.push('Missing protected file: '+row.path);continue;}
 if(gitBlob(bytes)!==row.sha){
  // Repository text writes use UTF-8 without a BOM; accept the same source
  // under a local editor's leading BOM without rewriting its contents.
  const plain=bytes.subarray(0,3).equals(Buffer.from([239,187,191]))?bytes.subarray(3):bytes;
  if(gitBlob(plain)!==row.sha)failures.push('Outside reviewed scope: '+row.path);
 }
 protectedCount++;
}
// Check new source files in every part of the repository, including backend,
// native projects, tests, root documents and workflows. Ignore only Git's own
// internals and installed package trees, never an application source directory.
async function walk(folder){for(const item of await fs.readdir(path.join(root,folder),{withFileTypes:true})){if(item.isDirectory()&&['.git','node_modules'].includes(item.name)||!folder&&item.name==='.git'&&item.isFile())continue;const name=folder?folder+'/'+item.name:item.name;if(item.isDirectory())await walk(name);else if((item.isFile()||item.isSymbolicLink())&&!known.has(name)&&!allowed.has(name)&&!generated.has(name))failures.push('Unreviewed added file: '+name);}}
await walk('');
if(failures.length)throw Error(failures.join('\n'));
console.log('PASS: '+protectedCount+' unchanged baseline files; every changed or added file belongs to the explicitly reviewed release scope.');
