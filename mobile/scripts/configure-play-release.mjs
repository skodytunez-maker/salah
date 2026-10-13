import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const PLAY_PACKAGE='com.saadikobilov.salah';
export function configurePlayGradle(source){
 if(!/applicationId\s+"com\.saadikobilov\.salah"/.test(source))throw Error('Unexpected release package');
 if(/signingConfig\s+signingConfigs\.debug/.test(source))throw Error('A Play release must not use debug signing');
 const clean=source.replace(new RegExp('\\n// SALAH_PLAY_BEGIN[\\s\\S]*?// SALAH_PLAY_END\\n?','g'),'\n');
 return clean.trimEnd()+"\n\n// SALAH_PLAY_BEGIN\napply from: 'salah-play.gradle'\n// SALAH_PLAY_END\n";
}
export async function configurePlayRelease(mobileRoot){
 const config=JSON.parse(await fs.readFile(path.join(mobileRoot,'capacitor.config.json'),'utf8'));if(config.appId!==PLAY_PACKAGE)throw Error('Release package does not match SALAH');
 const app=path.join(mobileRoot,'android/app'),file=path.join(app,'build.gradle');
 await fs.writeFile(file,configurePlayGradle(await fs.readFile(file,'utf8')));
 await fs.writeFile(path.join(app,'salah-play.gradle'),'// Upload-key signing is a separate protected step.\nandroid { buildTypes { release { debuggable false; minifyEnabled false } } }\n');
 console.log('SALAH Play release configured without debug signing or embedded credentials.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await configurePlayRelease(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
