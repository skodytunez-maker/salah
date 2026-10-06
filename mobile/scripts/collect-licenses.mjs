import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha256=value=>createHash('sha256').update(value).digest('hex');
const nativePackages=['@capacitor/core','@capacitor/android','@capacitor/ios'];
const noticeName=/^(?:licen[cs]e|unlicen[cs]e|copying|notice)(?:[._-].*)?$/i;
const inside=(root,target)=>{const relative=path.relative(root,target);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)};

function packageName(location){
 if(!/^node_modules\/(?:[^/]+\/)*[^/]+$/.test(location)||location.split('/').some(part=>part==='.'||part==='..')||location.includes('\\'))throw new Error('Unsafe dependency path: '+location);
 return location.slice(location.lastIndexOf('node_modules/')+'node_modules/'.length);
}

async function licenseFiles(directory,modules){
 const names=(await fs.readdir(directory,{withFileTypes:true})).filter(entry=>entry.isFile()&&noticeName.test(entry.name)).map(entry=>entry.name).sort();
 const result=[];
 for(const name of names){
  const absolute=path.join(directory,name);
  if(!inside(modules,await fs.realpath(absolute)))throw new Error('License file escapes node_modules: '+name);
  const bytes=await fs.readFile(absolute);
  if(!bytes.length||bytes.length>1024*1024)throw new Error('Empty or oversized license notice: '+name);
  result.push({file:name,sha256:sha256(bytes),text:bytes.toString('utf8')});
 }
 if(!result.length){
  // Some npm tarballs ship their complete license only in README.md.
  const readme=path.join(directory,'README.md');
  try{
   if(!inside(modules,await fs.realpath(readme)))throw new Error('README escapes node_modules.');
   const bytes=await fs.readFile(readme),source=bytes.toString('utf8');
   const heading=/(?:^|\n)## Licen[cs]e[ \t]*\r?\n/i.exec(source);
   if(heading){
    const start=heading.index+(source[heading.index]==='\n'?1:0);
    const rest=source.slice(start),next=/\n## /.exec(rest);
    const text=next?rest.slice(0,next.index):rest;
    result.push({file:'README.md',section:'License',sha256:sha256(bytes),noticeSha256:sha256(text),text});
   }
  }catch(error){if(error.code!=='ENOENT')throw error}
 }
 return result;
}

// Package declarations and shipped texts are evidence, not a legal clearance.
// Android Maven, Swift packages, build gems and content rights are separate scopes.
export async function collectMobileLicenses(mobileRoot){
 const root=path.resolve(mobileRoot),modules=path.join(root,'node_modules');
 const [manifestText,lockText]=await Promise.all(['package.json','package-lock.json'].map(name=>fs.readFile(path.join(root,name),'utf8')));
 const manifest=JSON.parse(manifestText),lock=JSON.parse(lockText);
 if(lock.lockfileVersion!==3||!lock.packages?.[''])throw new Error('Expected npm lockfile version 3.');
 for(const kind of ['dependencies','devDependencies']){
  if(JSON.stringify(Object.entries(manifest[kind]||{}).sort())!==JSON.stringify(Object.entries(lock.packages[''][kind]||{}).sort()))throw new Error('Package manifest and lockfile disagree: '+kind);
 }
 const realModules=await fs.realpath(modules),packages=[],noticeSections=[],nativeSections=[];
 for(const [location,entry] of Object.entries(lock.packages).filter(([name])=>name).sort(([a],[b])=>a.localeCompare(b,'en'))){
  const name=packageName(location),directory=path.join(root,location);
  if(entry.link)throw new Error('Linked dependency is not supported: '+location);
  if(!entry.version||!entry.integrity||!/^https:\/\/registry\.npmjs\.org\//.test(entry.resolved||''))throw new Error('Dependency lacks registry version/integrity: '+location);
  let actual;
  try{
   if(!inside(realModules,await fs.realpath(directory)))throw new Error('Dependency escapes node_modules: '+location);
   actual=JSON.parse(await fs.readFile(path.join(directory,'package.json'),'utf8'));
  }catch(error){
   if(error.code==='ENOENT'&&entry.optional){packages.push({location,name,version:entry.version,optional:true,status:'not-installed-on-this-platform'});continue}
   throw error;
  }
  if(actual.name!==name||actual.version!==entry.version)throw new Error('Installed dependency does not match lockfile: '+location);
  const files=await licenseFiles(directory,realModules);
  const declaredLicense=typeof actual.license==='string'?actual.license:(actual.license?.type||null);
  packages.push({location,name,version:actual.version,developmentOnly:entry.dev===true,integrity:entry.integrity,resolved:entry.resolved,declaredLicense,licenseFiles:files.map(({text,...file})=>file),status:files.length?'notice-recorded':'needs-review'});
  const text=files.map(file=>file.file+'\nSHA-256: '+file.sha256+'\n\n'+file.text).join('\n\n');
  if(text)noticeSections.push(name+'@'+actual.version+' ('+location+')\n'+text);
  if(nativePackages.includes(name)){
   if(declaredLicense!=='MIT'||!files.some(file=>/Permission is hereby granted, free of charge/.test(file.text)))throw new Error('Expected Capacitor MIT license text is missing: '+name);
   nativeSections.push(name+'@'+actual.version+'\n'+text);
  }
 }
 for(const name of nativePackages)if(!packages.some(item=>item.name===name&&item.status==='notice-recorded'))throw new Error('Required native package license is missing: '+name);
 const report={schemaVersion:1,scope:'Installed npm dependency evidence only; excludes Maven/Gradle, Swift packages, Ruby gems, operating-system SDKs and app content. A notice is not a clearance decision.',lockfileSha256:sha256(lockText),packageCount:packages.length,packages};
 return {report,allNotices:noticeSections.join('\n\n'+'='.repeat(72)+'\n\n')+'\n',nativeNotices:'SALAH native shell — third-party notices\nCapacitor components included in the native shell.\n\n'+nativeSections.join('\n\n'+'='.repeat(72)+'\n\n')+'\n'};
}

export async function saveMobileLicenseReport(mobileRoot,evidence){
 const reports=path.join(path.resolve(mobileRoot),'reports');
 await fs.mkdir(reports,{recursive:true});
 await fs.writeFile(path.join(reports,'npm-licenses.json'),JSON.stringify(evidence.report,null,2)+'\n');
 await fs.writeFile(path.join(reports,'npm-NOTICES.txt'),evidence.allNotices);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mobileRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const evidence=await collectMobileLicenses(mobileRoot);await saveMobileLicenseReport(mobileRoot,evidence);
 console.log('Recorded '+evidence.report.packageCount+' locked npm dependencies; '+evidence.report.packages.filter(item=>item.status==='needs-review').length+' require manual license review.');
}
