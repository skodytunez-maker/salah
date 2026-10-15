import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {androidReleaseVersion} from './android-release.mjs';
import {PLAY_PACKAGE,NATIVE_PACKAGE} from './configure-play-release.mjs';
export function bundleManifestReport(xml,expected){
 const attribute=(tag,name)=>xml.match(new RegExp('<'+tag+'\\b[^>]*\\b'+name+'="([^"<>]+)"'))?.[1];
 const report={applicationId:attribute('manifest','package'),versionCode:Number(attribute('manifest','android:versionCode')),versionName:attribute('manifest','android:versionName'),targetSdk:Number(attribute('uses-sdk','android:targetSdkVersion')),minSdk:Number(attribute('uses-sdk','android:minSdkVersion')),debuggable:attribute('application','android:debuggable')==='true'};
 if(report.applicationId!==PLAY_PACKAGE||report.versionCode!==expected.versionCode||report.versionName!==expected.versionName)throw Error('Bundle package/version mismatch');
 if(!Number.isInteger(report.targetSdk)||report.targetSdk<36)throw Error('Google Play target SDK 36 is required');
 if(report.debuggable)throw Error('Debuggable bundle cannot be released');
 return report;
}
export async function inspectBundle(bundle,output,{signed=false}={}){
 const jar=process.env.BUNDLETOOL_JAR;if(!jar)throw Error('BUNDLETOOL_JAR is required');
 execFileSync('java',['-jar',jar,'validate','--bundle='+path.resolve(bundle)],{encoding:'utf8',timeout:60000});
 const xml=execFileSync('java',['-jar',jar,'dump','manifest','--bundle='+path.resolve(bundle),'--module=base'],{encoding:'utf8',timeout:30000});
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 const expected=androidReleaseVersion(await fs.readFile(path.join(root,'dist/js/app-release.js'),'utf8'));
 const report=bundleManifestReport(xml,expected);
 const entries=execFileSync('unzip',['-Z1',path.resolve(bundle)],{encoding:'utf8',timeout:30000}).split(/\r?\n/);
 for(const entry of ['base/assets/capacitor.config.json','base/assets/public/js/audience.js','base/assets/public/js/audience-core.js','base/assets/public/js/audience-mode.js','base/assets/public/css/audience.css','base/assets/public/index.html','base/assets/public/js/native-entry.js','base/assets/public/js/app-release.js','base/assets/public/privacy.html','base/assets/public/delete-account.html','base/assets/public/third-party/Android-NOTICES.txt'])if(!entries.includes(entry))throw Error('Required bundle entry missing: '+entry);
 if(entries.some(p=>['.jks','.keystore','.p12','.pfx'].some(ext=>p.toLowerCase().endsWith(ext))||p.split('/').some(part=>part==='.env'||part.startsWith('.env.')||part==='signing-secrets')))throw Error('Private signing material must not enter the bundle');
 const bridge=JSON.parse(execFileSync('unzip',['-p',path.resolve(bundle),'base/assets/capacitor.config.json'],{encoding:'utf8',timeout:30000}));
 if(bridge.appId!==PLAY_PACKAGE||!xml.includes('android:name="'+NATIVE_PACKAGE+'.MainActivity"'))throw Error('Play bridge or launch component mismatch');
 const audience=execFileSync('unzip',['-p',path.resolve(bundle),'base/assets/public/js/audience-mode.js'],{encoding:'utf8',timeout:30000});
 if(!audience.includes('export const FAMILIES_REQUIRED=true;'))throw Error('Play Families guard is not enabled');
 if(!xml.includes('firebase_messaging_auto_init_enabled'))throw Error('FCM auto-initialization policy is missing');
 const packaged=execFileSync('unzip',['-p',path.resolve(bundle),'base/assets/public/js/app-release.js'],{encoding:'utf8',timeout:30000});
 if(JSON.stringify(androidReleaseVersion(packaged))!==JSON.stringify(expected))throw Error('Packaged app version mismatch');
 if(signed){const verified=execFileSync('jarsigner',['-verify',path.resolve(bundle)],{encoding:'utf8',timeout:30000,env:{...process.env,LANG:'C'}});if(!/jar verified\./.test(verified)||/jar is unsigned/i.test(verified)||!entries.some(p=>p.startsWith('META-INF/')&&/\.(RSA|EC|DSA)$/i.test(p)))throw Error('Bundle signature verification failed');}
 const bytes=await fs.readFile(bundle);Object.assign(report,{format:'aab',signed,uploadReady:signed,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,sourceCommit:process.env.GITHUB_SHA||null,checkedAt:new Date().toISOString()});
 await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [bundle,report,...flags]=process.argv.slice(2);if(!bundle||!report)throw Error('Input bundle and report paths required');await inspectBundle(bundle,report,{signed:flags.includes('--signed')});}
