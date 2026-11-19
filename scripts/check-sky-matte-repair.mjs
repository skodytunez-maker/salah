import assert from 'node:assert/strict';
import {readFile}from 'node:fs/promises';
import {createHash}from 'node:crypto';
import {Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {SKY_MATTE_ATLAS,SKY_MATTE_REVISION}from '../dist/js/sky-matte-data.js';
import {decodeForegroundAlpha}from '../dist/js/sky-matte.js';
const proof=JSON.parse(await readFile(new URL('../docs/sky-matte-repair-544.json',import.meta.url),'utf8'));
const hash=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex'),prior=Buffer.from(proof.previousAtlasSource);
assert.equal(proof.previousAtlasGitSha,'f98594adcee46dbf9354b904f559ddce929264d4','Exact published543atlas provenance');
assert.equal(hash(Buffer.concat([Buffer.from('blob '+prior.length+'\0'),prior]),'sha1'),proof.previousAtlasGitSha,'Prior masks must match their frozen source fingerprint');
const beforeAtlas=JSON.parse(proof.previousAtlasSource.match(/SKY_MATTE_ATLAS=Object\.freeze\((\{[\s\S]*\})\);/)[1]);
assert.equal(SKY_MATTE_REVISION,544);assert.equal(proof.reviews.length,63);assert.equal(Object.keys(beforeAtlas).length,63);
const current=new Map(),before=new Map();let added=0,removed=0,changedSources=0,protectedChecks=0;
const within=(x,y,l,t,r,b)=>x>=l&&y>=t&&x<r&&y<b;
const manualRemoval=(key,x,y)=>key==='assets/window-new-york-night-tablet-v1.webp'&&(within(x,y,20,0,984,351)||within(x,y,984,0,1036,241)||within(x,y,1035,0,1518,366))||key==='wallpapers/madinah/day-phone-v1.webp'&&within(x,y,346,820,348,822);
function broadSupport(alpha,w,h,x,y){for(let cy=Math.max(3,y-4);cy<=Math.min(h-4,y+4);cy++)for(let cx=Math.max(3,x-4);cx<=Math.min(w-4,x+4);cx++){let full=true;for(let dy=-3;dy<=3&&full;dy++)for(let dx=-3;dx<=3;dx++)if(!alpha[(cy+dy)*w+cx+dx]){full=false;break;}if(full)return true;}return false;}
for(const row of proof.reviews){
 const key=row.source,e=SKY_MATTE_ATLAS[key],oldEntry=beforeAtlas[key];assert.ok(e&&oldEntry);assert.equal(e.sourceSha256,oldEntry.sourceSha256);assert.equal(e.sourceSha256,row.sourceSha256);assert.deepEqual([e.width,e.height,e.maskWidth,e.maskHeight],[oldEntry.width,oldEntry.height,oldEntry.maskWidth,oldEntry.maskHeight]);
 const old=decodeForegroundAlpha(oldEntry),next=decodeForegroundAlpha(e);before.set(key,old);current.set(key,next);assert.equal(hash(old.map(v=>v/255)),row.previousMaskSha256);assert.equal(hash(next.map(v=>v/255)),row.maskSha256);
 let plus=0,minus=0;
 for(let i=0;i<next.length;i++)if(next[i]!==old[i]){
  const x=i%e.width,y=Math.floor(i/e.width);if(next[i])plus++;else minus++;
  if(key.includes('/uhud/')||key==='wallpapers/badakhshan/badakhshan-day.webp')continue;
  if(key.includes('/kuala-lumpur/')&&next[i]){assert.ok(within(x,y,1301,287,1347,549),'Glass restoration stays in the inspected opaque facade');continue;}
  assert.equal(next[i],0,'Other repairs cannot invent foreground');if(manualRemoval(key,x,y))continue;
  let touchesSky=false;for(let dy=-2;dy<=2&&!touchesSky;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<e.width&&y+dy>=0&&y+dy<e.height&&!old[(y+dy)*e.width+x+dx]){touchesSky=true;break;}
  assert.ok(touchesSky,'Unreviewed deep foreground pixels cannot be removed');assert.ok(broadSupport(old,e.width,e.height,x,y),'Fine branches,cables,spires and disconnected leaves are protected');protectedChecks++;
 }
 assert.equal(plus,row.addedForegroundPixels);assert.equal(minus,row.removedSkyPixels);added+=plus;removed+=minus;if(plus+minus)changedSources++;
 if(key.includes('/uhud/'))for(let x=0;x<e.width;x++){let oldTop=0,newTop=0;while(!old[oldTop*e.width+x])oldTop++;while(!next[newTop*e.width+x])newTop++;assert.ok(Math.abs(newTop-oldTop)<=8);for(let y=newTop;y<e.height;y++)assert.equal(next[y*e.width+x],255,'Mountain body is one continuous silhouette,not a colour-selected cutout');}
}
assert.equal(added,proof.addedForegroundPixels);assert.equal(removed,proof.removedSkyPixels);assert.equal(changedSources,proof.changedSources);assert.equal(changedSources,60);assert.ok(protectedChecks>20000);
const pixel=(map,key,x,y)=>map.get(key)[y*SKY_MATTE_ATLAS[key].width+x];
const snow='wallpapers/badakhshan/badakhshan-day.webp';for(const[x,y]of[[30,615],[65,612],[100,645],[390,580],[450,591],[432,589]]){assert.equal(pixel(before,snow,x,y),0,'The old mask reproduces missing real snow/rock');assert.equal(pixel(current,snow,x,y),255,'Source-inspected snow and the saddle remain foreground');}
for(const[x,y]of[[30,600],[65,596],[100,620],[390,559],[450,571],[432,573]])assert.equal(pixel(current,snow,x,y),0,'Real sky above the ridge is not filled');
for(const[key,x,y]of[['wallpapers/uhud/day-phone-v1.webp',300,1041],['wallpapers/uhud/night-phone-v1.webp',300,1039],['wallpapers/uhud/day-v1.webp',500,582],['wallpapers/uhud/night-v1.webp',500,581]]){assert.equal(pixel(before,key,x,y),255);assert.equal(pixel(current,key,x,y),0,'The independently inspected sky rim is removed');assert.equal(pixel(current,key,x,y+5),255,'Actual mountain below the boundary remains');}
const glass='wallpapers/kuala-lumpur/day-v1.webp';assert.equal(pixel(before,glass,1310,480),0);assert.equal(pixel(current,glass,1310,480),255,'Blue/grey opaque glass cannot become a sky hole');assert.equal(pixel(current,glass,1300,430),0,'The real gap beside the facade stays sky');
const windowKey='assets/window-new-york-night-tablet-v1.webp';assert.equal(pixel(before,windowKey,1490,342),255);assert.equal(pixel(current,windowKey,1490,342),0,'Baked cloud remnant is transparent');assert.equal(pixel(current,windowKey,1009,250),255,'The thin real antenna remains');assert.equal(pixel(current,windowKey,1519,340),255,'The real window frame remains');
const crescent='wallpapers/madinah/day-phone-v1.webp';for(const[x,y]of[[346,820],[347,821]]){assert.equal(pixel(before,crescent,x,y),255);assert.equal(pixel(current,crescent,x,y),0);}for(const[x,y]of[[344,820],[349,820],[346,824]])assert.equal(pixel(current,crescent,x,y),255,'Real finial metal is retained');
for(const key of ['wallpapers/badakhshan/badakhshan-night-v1.webp','wallpapers/derbent/day-v1.webp','wallpapers/derbent/night-v1.webp'])assert.deepEqual(current.get(key),before.get(key),'Rejected/unconfident edits are not shipped');
const svg=await readFile(new URL('../dist/assets/updates/sky-matte-544.svg',import.meta.url),'utf8'),w=new Window(),root=w.document.createElement('div');root.innerHTML=svg;const image=root.querySelector('image'),photo=await readFile(new URL('../dist/wallpapers/badakhshan/badakhshan-day.webp',import.meta.url));assert.equal(hash(Buffer.from(image.getAttribute('href').split(',')[1],'base64')),hash(photo),'Feature art embeds exact source bytes,not a fabricated before/after photograph');
for(const[id,map]of[['before',before],['after',current]]){const d=root.querySelector('clipPath[id='+id+'] path').getAttribute('d'),mask=new Uint8Array(150*120);for(const match of d.matchAll(/M(\d+) (\d+)h(\d+)v1H(\d+)z/g)){const x=+match[1],y=+match[2],len=+match[3];assert.equal(x,+match[4]);mask.fill(255,y*150+x,y*150+x+len);}for(let y=0;y<120;y++)for(let x=0;x<150;x++)assert.equal(mask[y*150+x],pixel(map,snow,x,y+585),'Illustrated contour is the actual reviewed crop');}await w.happyDOM.close();
console.log('PASS:63 native masks,60 reviewed corrections;'+added+' real foreground pixels restored,'+removed+' retained sky pixels removed,thin structures/native geometry/unchanged night and sea cases preserved;actual-source feature illustration. No physical phone rendering claim.');
