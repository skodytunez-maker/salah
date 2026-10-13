import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Input and output AAB paths required');
const names=['SALAH_UPLOAD_KEYSTORE_BASE64','SALAH_UPLOAD_KEY_ALIAS','SALAH_UPLOAD_STORE_PASSWORD','SALAH_UPLOAD_KEY_PASSWORD','SALAH_UPLOAD_CERT_SHA256'];
if(names.some(n=>!process.env[n]))throw Error('Upload signing configuration is incomplete');
if(!/^[a-f0-9]{64}$/i.test(process.env.SALAH_UPLOAD_CERT_SHA256)||!/^[-a-z0-9_.]{1,80}$/i.test(process.env.SALAH_UPLOAD_KEY_ALIAS))throw Error('Invalid upload certificate or alias');
if(!process.env.RUNNER_TEMP)throw Error('Protected runner temporary directory required');
const dir=await fs.mkdtemp(path.join(path.resolve(process.env.RUNNER_TEMP),'salah-upload-')),key=path.join(dir,'upload.jks');
try{
 await fs.writeFile(key,Buffer.from(process.env.SALAH_UPLOAD_KEYSTORE_BASE64,'base64'),{mode:0o600});
 const cert=execFileSync('keytool',['-exportcert','-keystore',key,'-alias',process.env.SALAH_UPLOAD_KEY_ALIAS,'-storepass:env','SALAH_UPLOAD_STORE_PASSWORD'],{stdio:['ignore','pipe','pipe'],timeout:30000});
 const digest=createHash('sha256').update(cert).digest('hex');if(digest!==process.env.SALAH_UPLOAD_CERT_SHA256.toLowerCase())throw Error('Certificate mismatch');
 await fs.mkdir(path.dirname(path.resolve(output)),{recursive:true});
 execFileSync('jarsigner',['-keystore',key,'-storepass:env','SALAH_UPLOAD_STORE_PASSWORD','-keypass:env','SALAH_UPLOAD_KEY_PASSWORD','-signedjar',path.resolve(output),path.resolve(input),process.env.SALAH_UPLOAD_KEY_ALIAS],{stdio:['ignore','pipe','pipe'],timeout:60000});
 console.log('Signed bundle with verified upload certificate '+digest);
}catch{throw Error('Upload signing failed; credentials were not logged.');}
finally{await fs.rm(key,{force:true});await fs.rmdir(dir);}
