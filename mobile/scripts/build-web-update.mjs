import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {deflateRawSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {APP_VERSION} from '../../dist/js/app-release.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function packZip(files){
 const chunks=[],central=[];let offset=0;
 for(const {name,bytes} of files){
  if(!/^[a-zA-Z0-9_./@ -]+$/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe archive path');
  const filename=Buffer.from(name),compressed=deflateRawSync(bytes,{level:6}),crc=crc32(bytes),header=Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);
  header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(filename.length,26);
  chunks.push(header,filename,compressed);
  const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(8,10);record.writeUInt16LE(33,14);
  record.writeUInt32LE(crc,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(bytes.length,24);record.writeUInt16LE(filename.length,28);record.writeUInt32LE(offset,42);
  central.push(record,filename);offset+=header.length+filename.length+compressed.length;
 }
 const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...chunks,directory,end]);
}
export async function buildWebUpdate(source,out,version=APP_VERSION){
 const files=[];
 async function walk(dir,prefix=''){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  if(entry.isSymbolicLink())throw Error('Symlinks forbidden');const name=prefix+entry.name;
  if(name==='mobile-updates'||name==='third-party/Android-NOTICES.txt')continue;
  if(entry.isDirectory())await walk(path.join(dir,entry.name),name+'/');
  else {if(/[.](apk|aab|dex|jar|class|so|jks|keystore|p12|pfx)$/i.test(name)||entry.name.startsWith('.env'))throw Error('Private/native file forbidden');files.push({name,bytes:await fs.readFile(path.join(dir,entry.name))});}
 }}
 await walk(source);
 for(const name of ['index.html','js/native-entry.js','js/app-release.js','js/app.js','js/vendor/capacitor-core.js'])if(!files.some(f=>f.name===name))throw Error('Incomplete web update: '+name);
 if(files.length>5000||files.reduce((n,f)=>n+f.bytes.length,0)>180*1024*1024)throw Error('Update exceeds native limits');
 const zip=packZip(files);if(zip.length>100*1024*1024)throw Error('Archive too large');
 const sha256=createHash('sha256').update(zip).digest('hex'),file='web-'+version+'-'+sha256+'.zip';
 await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,file),zip);
 const manifest={schema:1,version,minNativeVersion:332,file,sha256,bytes:zip.length};
 await fs.writeFile(path.join(out,'latest.json'),JSON.stringify(manifest)+String.fromCharCode(10));
 return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildWebUpdate(path.join(root,'www'),path.resolve(root,'../dist/mobile-updates'))));
