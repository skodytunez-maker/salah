import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const input=process.argv[2];if(!input||!process.env.RUNNER_TEMP)throw Error('Fixture input and runner temp required');
const dir=await fs.mkdtemp(path.join(path.resolve(process.env.RUNNER_TEMP),'salah-sign-test-')),key=path.join(dir,'fixture.p12'),signed=path.join(dir,'signed.aab'),report=path.join(dir,'report.json');
const password=randomBytes(24).toString('base64url'),env={...process.env,SALAH_UPLOAD_KEY_ALIAS:'fixture',SALAH_UPLOAD_STORE_PASSWORD:password,SALAH_UPLOAD_KEY_PASSWORD:password};
const signing=fileURLToPath(new URL('./sign-play-bundle.mjs',import.meta.url)),inspection=fileURLToPath(new URL('./inspect-android-bundle.mjs',import.meta.url));
try{
 execFileSync('keytool',['-genkeypair','-alias','fixture','-keystore',key,'-storetype','PKCS12','-keyalg','RSA','-keysize','2048','-validity','2','-dname','CN=SALAH disposable CI fixture','-storepass:env','SALAH_UPLOAD_STORE_PASSWORD','-keypass:env','SALAH_UPLOAD_KEY_PASSWORD'],{env,stdio:['ignore','pipe','pipe'],timeout:30000});
 const cert=execFileSync('keytool',['-exportcert','-keystore',key,'-alias','fixture','-storepass:env','SALAH_UPLOAD_STORE_PASSWORD'],{env,stdio:['ignore','pipe','pipe'],timeout:30000});
 env.SALAH_UPLOAD_KEYSTORE_BASE64=(await fs.readFile(key)).toString('base64');env.SALAH_UPLOAD_CERT_SHA256='0'.repeat(64);
 const wrong=spawnSync(process.execPath,[signing,input,signed],{env,encoding:'utf8',timeout:60000});if(wrong.status===0)throw Error('Wrong upload fingerprint accepted');
 try{await fs.access(signed);throw Error('Refused signature created output');}catch(error){if(error.code!=='ENOENT')throw error;}
 env.SALAH_UPLOAD_CERT_SHA256=createHash('sha256').update(cert).digest('hex');
 execFileSync(process.execPath,[signing,input,signed],{env,stdio:['ignore','pipe','pipe'],timeout:60000});
 execFileSync(process.execPath,[inspection,signed,report,'--signed'],{env,stdio:['ignore','pipe','pipe'],timeout:90000});
 const result=JSON.parse(await fs.readFile(report,'utf8'));if(!result.signed||result.debuggable)throw Error('Synthetic signed bundle did not verify');
 console.log('PASS: real AAB signing rejects a wrong fingerprint, verifies a disposable signature and keeps all fixture credentials out of artifacts.');
}finally{for(const file of [key,signed,report])await fs.rm(file,{force:true});await fs.rmdir(dir);}
