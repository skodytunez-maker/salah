import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import{gzipSync}from 'node:zlib';
import{spawnSync}from 'node:child_process';
import{acousticLandmarks,RECOGNITION_RATE}from '../dist/js/quran-recognition-core.js';
import{normalizeTimings}from '../dist/js/quran-timing.js';
const [sourceDir,ffmpeg,outputDir]=process.argv.slice(2);if(!sourceDir||!ffmpeg||!outputDir)throw Error('Usage: node scripts/build-quran-recognition.mjs <reference-dir> <ffmpeg> <output-dir>');
const sources=JSON.parse(await fs.readFile(path.join(sourceDir,'sources.json'),'utf8')),index=JSON.parse(await fs.readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const tracks=[],pairs=[],rejected=[];
for(const source of sources){
 try{
 const bytes=await fs.readFile(path.join(sourceDir,source.stem+'.mp3')),raw=await fs.readFile(path.join(sourceDir,source.stem+'.json'));
 const timings=normalizeTimings(JSON.parse(raw),index.surahs[source.surah-1].ayahs);if(!timings)throw Error('Incomplete or invalid timing table');
 const decoded=spawnSync(ffmpeg,['-v','error','-i',path.join(sourceDir,source.stem+'.mp3'),'-ac','1','-ar',String(RECOGNITION_RATE),'-f','f32le','pipe:1'],{maxBuffer:80*1024*1024,windowsHide:true});
 if(decoded.status!==0||decoded.stderr?.length||decoded.stdout.length%4)throw Error('Audio could not be decoded completely');
 const audio=new Float32Array(decoded.stdout.buffer.slice(decoded.stdout.byteOffset,decoded.stdout.byteOffset+decoded.stdout.byteLength)),duration=audio.length/RECOGNITION_RATE;
 if(duration<3||duration>40*60||timings.at(-1).end>duration+1.5||duration-timings.at(-1).end>20)throw Error('Audio duration disagrees with timing table');
 const marks=acousticLandmarks(audio),id=tracks.length;if(id>=256)throw Error('Track limit');
 if(marks.length<20)throw Error('Not enough landmarks');
 tracks.push({reciter:source.reciter,surah:source.surah,duration,timings,audio:source.audio,timing:source.timing,audioSha256:crypto.createHash('sha256').update(bytes).digest('hex'),timingSha256:crypto.createHash('sha256').update(raw).digest('hex')});
 for(const [hash,time]of marks)pairs.push([hash,((id<<24)|time)>>>0]);
 console.log(source.stem+' '+Math.round(duration)+'s '+marks.length+' landmarks');
 }catch(error){rejected.push({stem:source.stem,error:error.message});console.log('SKIP '+source.stem+': '+error.message);}
}
pairs.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const bytes=Buffer.alloc(pairs.length*8);pairs.forEach(([hash,code],i)=>{bytes.writeUInt32LE(hash,i*8);bytes.writeUInt32LE(code,i*8+4);});
const packed=gzipSync(bytes,{level:9});const meta={packedBytes:packed.length,packedSha256:crypto.createHash('sha256').update(packed).digest('hex'),schema:1,algorithm:'salah-landmarks-v1',rate:RECOGNITION_RATE,hop:256,created:'2026-10-18',fingerprints:'fingerprints-v1.bin.gz',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),tracks};
await fs.mkdir(outputDir,{recursive:true});await fs.writeFile(path.join(outputDir,'fingerprints-v1.bin.gz'),packed);await fs.writeFile(path.join(outputDir,'catalog-v1.json'),JSON.stringify(meta));await fs.writeFile(path.join(sourceDir,'rejected.json'),JSON.stringify(rejected,null,2));console.log(JSON.stringify({tracks:tracks.length,bytes:bytes.length,rejected:rejected.length}));
