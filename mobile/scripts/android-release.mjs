import fs from 'node:fs/promises';
import path from 'node:path';
export function verifiedSigningCertificates(output){
 // apksigner emits platform-dependent line endings and may label v3.1 signers by SDK range.
 return [...new Set(output.split(/\r?\n/).map(line=>line.trim().match(/^Signer (?:#\d+|\(minSdkVersion=.+\)) certificate SHA-256 digest:\s*([a-f0-9]{64})$/i)?.[1]?.toLowerCase()).filter(Boolean))];
}
export function androidReleaseVersion(source){
 const version=Number(source.match(/export const APP_VERSION=(\d+);/)?.[1]);
 if(!Number.isSafeInteger(version)||version<1||version>2100000000)throw Error('Invalid SALAH release version');
 return {versionCode:version,versionName:String(version)};
}
export function configureAndroidVersion(gradle,release){
 const codes=[...gradle.matchAll(/^\s*versionCode\s+\d+\s*$/gm)],names=[...gradle.matchAll(/^\s*versionName\s+"[^"]*"\s*$/gm)];
 if(codes.length!==1||names.length!==1)throw Error('Unrecognized Android version fields; refusing to overwrite build configuration');
 return gradle.replace(/^(\s*versionCode\s+)\d+(\s*)$/gm,(_,before,after)=>before+release.versionCode+after).replace(/^(\s*versionName\s+)"[^"]*"(\s*)$/gm,(_,before,after)=>before+'"'+release.versionName+'"'+after);
}
export async function syncAndroidVersion(mobileRoot){
 const release=androidReleaseVersion(await fs.readFile(path.resolve(mobileRoot,'../dist/js/app-release.js'),'utf8'));
 const file=path.join(mobileRoot,'android/app/build.gradle'),source=await fs.readFile(file,'utf8'),next=configureAndroidVersion(source,release);
 if(source!==next)await fs.writeFile(file,next);
 console.log('SALAH Android versionCode='+release.versionCode+' versionName='+release.versionName);
 return release;
}
export function compareAndroidUpdate(installed,candidate){
 const valid=m=>m&&typeof m.applicationId==='string'&&Number.isSafeInteger(m.versionCode)&&m.versionCode>0&&Array.isArray(m.signingCertificateSha256)&&m.signingCertificateSha256.length>0&&m.signingCertificateSha256.every(x=>/^[a-f0-9]{64}$/i.test(x));
 if(!valid(installed)||!valid(candidate))return {compatible:false,reason:'missing_metadata'};
 if(installed.applicationId!==candidate.applicationId)return {compatible:false,reason:'different_application'};
 const certs=m=>[...new Set(m.signingCertificateSha256.map(x=>x.toLowerCase()))].sort().join(',');
 if(certs(installed)!==certs(candidate))return {compatible:false,reason:'different_signing_certificate'};
 if(candidate.versionCode<=installed.versionCode)return {compatible:false,reason:'version_not_newer'};
 return {compatible:true,reason:'same_application_and_certificate_newer_version'};
}
