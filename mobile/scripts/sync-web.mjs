import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const mobileRoot=path.resolve(here,'..');
const source=path.resolve(mobileRoot,'../dist');
const target=path.resolve(mobileRoot,'www');

await fs.rm(target,{recursive:true,force:true});
await fs.mkdir(target,{recursive:true});
await fs.cp(source,target,{recursive:true,force:true});

console.log('SALAH web bundle copied to mobile/www');
