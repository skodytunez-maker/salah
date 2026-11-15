import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

// Execute an unchanged copy of the real guard in a disposable repository.
// None of these cases edits the application's real plan or protected sources.
const guard=await fs.readFile(new URL('./check-change-scope.mjs',import.meta.url));
const prefix='salah-change-scope-selftest-';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),prefix));
const protectedPath='dist/js/competition-client.js',generatedPath='dist/data/haramain-schedule.json';
const blobSha=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
let cases=0;

async function put(folder,name,contents){const target=path.join(folder,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,contents);}
async function fixture(){
 const folder=path.join(temp,'case-'+(++cases));await fs.mkdir(folder);
 const files=new Map([
  ['scripts/check-change-scope.mjs',guard],
  ['package.json',Buffer.from('{"type":"module"}\n')],
  ['dist/js/app-release.js',Buffer.from('export const APP_VERSION=502;\n')],
  [protectedPath,Buffer.from('export const protectedCredit="unchanged";\n')],
  [generatedPath,Buffer.from('{"edition":1,"fetchedAt":"2026-11-14T00:00:00Z","rows":[]}\n')]
 ]);
 for(const[name,bytes]of files)await put(folder,name,bytes);
 const plan={schema:1,version:502,baseCommit:'fixture-only',baseTree:'fixture-only',allowed:[{path:'docs/change-scope.json',reason:'This isolated test declares its own small plan.'}],generated:[{path:generatedPath,reason:'The existing official-record build step refreshes this exact snapshot.'}],baseline:[...files].map(([name,bytes])=>({path:name,sha:blobSha(bytes)}))};
 const save=()=>put(folder,'docs/change-scope.json',JSON.stringify(plan));await save();
 return{folder,plan,save};
}
function run(folder){
 let result;
 for(let attempt=0;attempt<3;attempt++){
  result=spawnSync(process.execPath,[path.join(folder,'scripts/check-change-scope.mjs')],{cwd:folder,encoding:'utf8',windowsHide:true,timeout:10000});
  // Retry only the known empty Windows startup fault. A real assertion, timeout
  // or diagnostic must remain a failure rather than being hidden by a retry.
  const emptyWindowsFault=process.platform==='win32'&&[3221225477,-1073741819].includes(result.status)&&!result.stdout&&!result.stderr&&!result.error;
  if(!emptyWindowsFault)break;
 }
 return{...result,output:String(result.stdout||'')+String(result.stderr||'')};
}
function passes(folder,label){const result=run(folder);assert.equal(result.status,0,label+'\n'+(result.output||result.error?.message||'Runtime exited without diagnostics'));assert.match(result.stdout,/PASS: .*unchanged baseline files/);}
function fails(folder,message,label){const result=run(folder);assert.notEqual(result.status,0,label);assert.ok(result.output.includes(message),label+' must fail for the specific scope violation\n'+(result.output||result.error?.message||'Runtime exited without diagnostics'));}

try{
 {
  const f=await fixture();assert.deepEqual(await fs.readFile(path.join(f.folder,'scripts/check-change-scope.mjs')),guard);passes(f.folder,'An unchanged declared repository passes');
 }
 for(const added of ['supabase/migrations/unreviewed.sql','.github/workflows/unreviewed.yml','mobile/native/unreviewed.js','tests/unreviewed.mjs','unreviewed-root.txt','dist/js/unreviewed.js','scripts/unreviewed.mjs','docs/unreviewed.md']){
  const f=await fixture();await put(f.folder,added,'Unreviewed addition\n');fails(f.folder,'Unreviewed added file: '+added,'New '+added);
 }
 {
  const f=await fixture();await put(f.folder,protectedPath,'export const protectedCredit="changed";\n');fails(f.folder,'Outside reviewed scope: '+protectedPath,'A modified protected counter source is rejected');
 }
 {
  const f=await fixture();await fs.unlink(path.join(f.folder,protectedPath));fails(f.folder,'Missing protected file: '+protectedPath,'A removed protected source is rejected');
 }
 {
  const f=await fixture(),added='supabase/functions/reviewed/core.mjs';f.plan.allowed.push({path:added,reason:'An explicit reviewed dependency in this isolated fixture.'});await f.save();await put(f.folder,added,'export const reviewed=true;\n');passes(f.folder,'An explicitly allowed added backend source passes');
 }
 {
  const f=await fixture();f.plan.allowed.push({path:protectedPath,reason:'An explicit reviewed change in this isolated fixture.'});await f.save();await put(f.folder,protectedPath,'export const protectedCredit="reviewed";\n');passes(f.folder,'An explicitly allowed existing-source change passes');
 }
 {
  const f=await fixture();await put(f.folder,'node_modules/dependency/index.js','Installed dependency\n');await put(f.folder,'mobile/node_modules/dependency/index.js','Nested installed dependency\n');await put(f.folder,'.git/HEAD','Git internals\n');passes(f.folder,'Installed package trees and Git internals are ignored');
 }
 {
  const f=await fixture();await put(f.folder,generatedPath,'{"edition":1,"fetchedAt":"2026-11-15T00:00:00Z","rows":[]}\n');passes(f.folder,'Refreshing the exact declared official Haramain snapshot passes');
 }
 console.log('PASS: real scope guard rejects unreviewed backend/workflow/mobile/test/root additions and modified/missing protected files; declared changes, installed dependencies and the actual generated Haramain path pass ('+cases+' isolated cases).');
}finally{
 // Resolve and verify the absolute recursive-delete target stays inside the
 // explicitly created temporary-prefix directory, including on Windows.
 const target=path.resolve(temp),temporaryParent=path.resolve(os.tmpdir());
 if(path.dirname(target)!==temporaryParent||!path.basename(target).startsWith(prefix))throw Error('Refusing cleanup outside the explicit scope-test temporary directory.');
 await fs.rm(target,{recursive:true,force:true,maxRetries:3,retryDelay:50});
}
