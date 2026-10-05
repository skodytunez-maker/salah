import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {compareAndroidUpdate,verifiedSigningCertificates} from './android-release.mjs';
const [apk,output,installed]=process.argv.slice(2);
if(!apk||!output)throw Error('Usage: node inspect-android-apk.mjs candidate.apk report.json [installed-report.json]');
const sdk=process.env.ANDROID_HOME||process.env.ANDROID_SDK_ROOT;
if(!sdk)throw Error('Android SDK path is required');
const dirs=(await fs.readdir(path.join(sdk,'build-tools'))).filter(x=>/^\d+\.\d+\.\d+$/.test(x)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
const build=path.join(sdk,'build-tools',dirs.at(-1)||'');
const badging=execFileSync(path.join(build,process.platform==='win32'?'aapt.exe':'aapt'),['dump','badging',path.resolve(apk)],{encoding:'utf8',timeout:30000});
const signing=process.platform==='win32'?execFileSync('java',['-jar',path.join(build,'lib/apksigner.jar'),'verify','--print-certs',path.resolve(apk)],{encoding:'utf8',timeout:30000}):execFileSync(path.join(build,'apksigner'),['verify','--print-certs',path.resolve(apk)],{encoding:'utf8',timeout:30000});
const meta=badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m);
if(!meta)throw Error('Cannot read APK package metadata');
const report={applicationId:meta[1],versionCode:Number(meta[2]),versionName:meta[3],apkSha256:createHash('sha256').update(await fs.readFile(apk)).digest('hex'),signingCertificateSha256:verifiedSigningCertificates(signing),buildCommit:process.env.GITHUB_SHA||null,buildType:'debug',checkedAt:new Date().toISOString()};
if(!report.signingCertificateSha256.length){console.error(signing);throw Error('No verified APK signing certificate');}
report.update=installed?compareAndroidUpdate(JSON.parse(await fs.readFile(installed,'utf8')),report):{compatible:false,reason:'installed_package_not_checked'};
await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
