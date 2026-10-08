import assert from 'node:assert/strict';
import{readFile,mkdtemp,writeFile,rm}from 'node:fs/promises';
import{tmpdir}from 'node:os';
import{join}from 'node:path';
import{execFileSync}from 'node:child_process';
import{fileURLToPath}from 'node:url';
execFileSync(process.execPath,[fileURLToPath(new URL('./build-push-function.mjs',import.meta.url)),'--check']);
const source=await readFile(new URL('../supabase/functions/background-reminders/index.ts',import.meta.url),'utf8');
assert.doesNotMatch(source,/^import[^\r\n]*from ['"]\./m,'deployed bundle must not require missing local files');
const temp=await mkdtemp(join(tmpdir(),'salah-push-parse-'));
try{const path=join(temp,'bundle.mjs');await writeFile(path,source);execFileSync(process.execPath,['--check',path]);}finally{await rm(temp,{recursive:true,force:true});}
console.log('PASS push bundle is reproducible across line endings, self-contained and parses without duplicate declarations');
