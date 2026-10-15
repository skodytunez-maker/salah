import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateFirebaseConfig} from './firebase-android.mjs';
export const PLAY_PACKAGE='com.salah.bysaadi';
export const NATIVE_PACKAGE='com.saadikobilov.salah';
const knownPackage=value=>value===NATIVE_PACKAGE||value===PLAY_PACKAGE;
export function configurePlayAudience(source){
 if(!/^export const FAMILIES_REQUIRED=(?:false|true);$/m.test(source))throw Error('Missing audience guard mode');
 return source.replace(/^export const FAMILIES_REQUIRED=(?:false|true);$/m,'export const FAMILIES_REQUIRED=true;');
}
export function configurePlayGradle(source){
 const ids=[...source.matchAll(/\bapplicationId\s+"([^"]+)"/g)];
 if(ids.length!==1||!knownPackage(ids[0][1]))throw Error('Unexpected release package');
 if(/signingConfig\s+signingConfigs\.debug/.test(source))throw Error('A Play release must not use debug signing');
 const clean=source.replace(/\n\/\/ SALAH_PLAY_BEGIN[\s\S]*?\/\/ SALAH_PLAY_END\n?/g,'\n').replace(/(\bapplicationId\s+)"[^"]+"/,'$1"'+PLAY_PACKAGE+'"');
 return clean.trimEnd()+"\n\n// SALAH_PLAY_BEGIN\napply from: 'salah-play.gradle'\n// SALAH_PLAY_END\n";
}
export function configurePlayCapacitor(source){
 const config=JSON.parse(source);
 if(!knownPackage(config.appId))throw Error('Unexpected native bridge package');
 return JSON.stringify({...config,appId:PLAY_PACKAGE},null,2)+'\n';
}
export function configurePlayStrings(source){
 for(const name of ['package_name','custom_url_scheme']){
  const pattern=new RegExp('(<string name="'+name+'">)([^<]+)(</string>)');
  const match=source.match(pattern);
  if(!match||!knownPackage(match[2]))throw Error('Unexpected native package resource');
  source=source.replace(pattern,(_,before,value,after)=>before+PLAY_PACKAGE+after);
 }
 return source;
}
export function configurePlayManifest(source){
 return source.replace(/android:name="\.([A-Za-z_][\w.$]*)"/g,(_,name)=>'android:name="'+NATIVE_PACKAGE+'.'+name+'"');
}
export async function configurePlayRelease(mobileRoot){
 const rootConfig=JSON.parse(await fs.readFile(path.join(mobileRoot,'capacitor.config.json'),'utf8'));
 if(rootConfig.appId!==NATIVE_PACKAGE)throw Error('Unexpected base native namespace');
 const app=path.join(mobileRoot,'android/app'),main=path.join(app,'src/main');
 const targets=[
  [path.join(app,'build.gradle'),configurePlayGradle],
  [path.join(main,'assets/capacitor.config.json'),configurePlayCapacitor],
  [path.join(main,'res/values/strings.xml'),configurePlayStrings],
  [path.join(main,'AndroidManifest.xml'),configurePlayManifest],
  [path.join(main,'assets/public/js/audience-mode.js'),configurePlayAudience]
 ];
 const prepared=await Promise.all(targets.map(async([file,convert])=>[file,convert(await fs.readFile(file,'utf8'))]));
 const raw=JSON.parse((await fs.readFile(path.join(mobileRoot,'native/android/google-services.json'),'utf8')).replace(/^\uFEFF/,''));
 const firebase=validateFirebaseConfig(raw,PLAY_PACKAGE);
 for(const [file,text] of prepared)await fs.writeFile(file,text);
 await fs.writeFile(path.join(app,'google-services.json'),JSON.stringify(firebase,null,2)+'\n');
 await fs.writeFile(path.join(app,'salah-play.gradle'),'// Upload-key signing is a separate protected step.\nandroid { buildTypes { release { debuggable false; minifyEnabled false } } }\n');
 console.log('SALAH Google Play package '+PLAY_PACKAGE+' configured; base APK and iOS identity retained.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await configurePlayRelease(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
