import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectMobileLicenses,saveMobileLicenseReport} from './collect-licenses.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const mobileRoot=path.resolve(here,'..');
const source=path.resolve(mobileRoot,'../dist');
const target=path.resolve(mobileRoot,'www');
const runtime=path.join(mobileRoot,'node_modules/@capacitor/core/dist/index.js');

await fs.access(path.join(source,'index.html'));
await fs.access(runtime);
// Validate notices before replacing the previous generated web bundle.
const licenseEvidence=await collectMobileLicenses(mobileRoot);
await fs.rm(target,{recursive:true,force:true});
await fs.mkdir(target,{recursive:true});
await fs.cp(source,target,{recursive:true,force:true});

await fs.mkdir(path.join(target,'js/vendor'),{recursive:true});
await fs.copyFile(runtime,path.join(target,'js/vendor/capacitor-core.js'));
await fs.copyFile(path.join(mobileRoot,'native/native-entry.js'),path.join(target,'js/native-entry.js'));
await fs.copyFile(
  path.join(mobileRoot,'node_modules/@capacitor/core/LICENSE'),
  path.join(target,'js/vendor/capacitor-LICENSE.txt')
);

await fs.mkdir(path.join(target,'third-party'),{recursive:true});
await fs.writeFile(path.join(target,'third-party/Capacitor-NOTICES.txt'),licenseEvidence.nativeNotices);
await saveMobileLicenseReport(mobileRoot,licenseEvidence);

const entry='<script type="module" src="./js/app.js"></script>';
const html=await fs.readFile(path.join(target,'index.html'),'utf8');
if(!html.includes(entry))throw new Error('Unknown SALAH entry point: refusing to create an unregistered native bridge.');
await fs.writeFile(
  path.join(target,'index.html'),
  html.replace(entry,'<script type="module" src="./js/native-entry.js"></script>')
);

console.log('SALAH native bundle copied to mobile/www; explicit Capacitor plugin registration installed.');
