import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wallpaperLayout,applyWallpaperLayout} from '../dist/js/wallpaper-layout.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
const points=[{width:853,height:1844},{width:851,height:1847}];
for(const viewport of [{width:600,height:960},{width:900,height:1344},{width:1344,height:900},{width:1024,height:1366},{width:1366,height:1024},{width:1600,height:900},{width:1200,height:800},{width:600,height:600}]) {
 for(const geometry of points)for(const wallpaper of ['landmark','new-york']){
  const p=wallpaperLayout({...viewport,wallpaper,geometry});
  near(p.width/p.height,geometry.width/geometry.height);
  near(p.width/geometry.width,p.scale);near(p.height/geometry.height,p.scale);
  assert.ok(p.scale<=Math.min(viewport.width/geometry.width,viewport.height/geometry.height)/.88+1e-9);
  for(const [x,y]of [[.15,.15],[.85,.85],[.71,.38],[.73,.64]]) {
   assert.ok(p.left+p.width*x>=0&&p.left+p.width*x<=viewport.width,'Important horizontal source point preserved');
   assert.ok(p.top+p.height*y>=0&&p.top+p.height*y<=viewport.height,'Important vertical source point preserved');
  }
  assert.equal(p.needsLandscape,viewport.width>viewport.height);
 }
 const mosque=wallpaperLayout({...viewport,wallpaper:'mosque'});
 near(mosque.width/mosque.height,1.5);
 assert.ok(mosque.left+mosque.width*.65>=-1e-8);
 assert.ok(mosque.left+mosque.width*.95<=viewport.width+1e-8);
 assert.equal(mosque.needsLandscape,false);
}
for(const size of [{width:390,height:844},{width:599,height:900},{width:NaN,height:800},{width:800,height:0}])assert.equal(wallpaperLayout(size),null,'Phone/invalid viewport keeps existing CSS');
const elements=()=>({dataset:{},values:new Map(),writes:0,style:{setProperty(k,v){this.owner.writes++;this.owner.values.set(k,v)},removeProperty(k){this.owner.values.delete(k)}}});
const scene=elements(),weather=elements();scene.style.owner=scene;weather.style.owner=weather;
const portrait={width:900,height:1344,wallpaper:'landmark'},wide={width:1344,height:900,wallpaper:'landmark'};
applyWallpaperLayout(scene,weather,portrait);assert.deepEqual(scene.values,weather.values,'Photo and weather coordinates match');
const writes=scene.writes;for(let i=0;i<60;i++)applyWallpaperLayout(scene,weather,portrait);assert.equal(scene.writes,writes,'No repeat DOM writes on each clock tick');
applyWallpaperLayout(scene,weather,wide);assert.equal(scene.dataset.sceneLayout,'tablet-wide');assert.equal(scene.dataset.needsLandscape,'true');assert.deepEqual(scene.values,weather.values);
applyWallpaperLayout(scene,weather,{width:390,height:844});assert.equal(scene.values.size,0);assert.equal(weather.values.size,0);assert.equal(scene.dataset.sceneLayout,undefined);assert.equal(scene.dataset.needsLandscape,undefined);
const css=await readFile(new URL('../dist/day-night.css',import.meta.url),'utf8');
assert.match(css,/data-scene-layout\^="tablet"/);assert.match(css,/mask-size:100% 100%/);assert.match(css,/scene-sky-plane\{inset:0;left:0;top:0;width:100%;height:100%/);
const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');assert.ok(sw.includes('"./js/wallpaper-layout.js"'),'New geometry module works offline');
console.log('PASS: tablet rotations, portrait aspect ratios, protected skyline, bounded crop, honest landscape fallback, mosque focal area, aligned layers, no repeat writes, phone restoration and offline module.');

// Installed tablets must rotate; the existing phone-only lock still works.
const {initPortraitMode}=await import('../dist/js/orientation.js');
const environment=(width,height,installed=true)=>{
 const events=new Map(),calls=[];
 return {innerWidth:width,innerHeight:height,navigator:{standalone:installed},calls,events,
  screen:{orientation:{lock:async mode=>calls.push(mode),unlock:()=>calls.push('unlock')}},
  document:{hidden:false,addEventListener:(name,fn)=>events.set(name,fn)},
  addEventListener:(name,fn)=>events.set(name,fn)};
};
for(const size of [[900,1344],[1344,900],[600,960]]){
 const e=environment(...size);initPortraitMode(e);await Promise.resolve();
 await e.events.get('pointerup')();await e.events.get('visibilitychange')();
 assert.deepEqual(e.calls,[],'Installed tablet never locks portrait');
}
const phone=environment(390,844);initPortraitMode(phone);await Promise.resolve();
assert.deepEqual(phone.calls,['portrait-primary']);
phone.innerWidth=844;phone.innerHeight=390;await phone.events.get('resize')();
assert.equal(phone.calls.at(-1),'portrait-primary','Phone landscape still attempts the saved portrait preference');
phone.innerWidth=900;phone.innerHeight=1344;await phone.events.get('resize')();
assert.equal(phone.calls.at(-1),'unlock','Only release a lock held by this app');
const browser=environment(390,844,false);initPortraitMode(browser);await Promise.resolve();assert.deepEqual(browser.calls,[]);
console.log('PASS: installed tablets rotate; phone portrait preference, ordinary browser and app-owned unlock remain safe.');

// Wide city scenes fill the viewport, retain proportions and keep the central subject.
for(const viewport of [{width:390,height:844},{width:844,height:390},{width:900,height:1344},{width:1344,height:900}]){
 const geometry={width:1536,height:1024,fitSubject:true};const layout=wallpaperLayout({...viewport,wallpaper:'landmark',geometry});
 assert.ok(layout);near(layout.width/layout.height,1.5);assert.equal(layout.needsLandscape,false);
 assert.ok(layout.left<=0&&layout.top<=0,'Full-screen artwork has no empty top or side bands');
 assert.ok(layout.left+layout.width>=viewport.width&&layout.top+layout.height>=viewport.height,'Artwork covers both viewport dimensions');
 const x=layout.left+layout.width*.5,y=layout.top+layout.height*.5;assert.ok(x>=0&&x<=viewport.width&&y>=0&&y<=viewport.height,'Central subject stays on screen');
}
console.log('PASS: new wide city artwork fills phones and tablets without stretching or empty bands.');

for(const viewport of [{width:600,height:960},{width:900,height:1344},{width:1344,height:900}]){
 const p=wallpaperLayout({...viewport,wallpaper:'landmark',geometry:{width:1536,height:1024,fitSubject:true,focalX:.75}});
 const pylon=p.left+p.width*.75;
 assert.ok(pylon>=0&&pylon<=viewport.width,'Tyumen bridge pylon stays visible in both orientations');
 assert.ok(p.left<=0&&p.left+p.width>=viewport.width,'Focal composition covers the viewport');
}

for(const viewport of [{width:600,height:960},{width:900,height:1344},{width:1344,height:900},{width:1600,height:900}]){
 const p=wallpaperLayout({...viewport,wallpaper:'new-york'});
 near(p.width/p.height,1.5);assert.equal(p.needsLandscape,false);
 assert.ok(p.left<=0&&p.top<=0&&p.left+p.width>=viewport.width&&p.top+p.height>=viewport.height,'Wide New York fills tablet without bands');
 const landmark=p.left+p.width*.655;
 assert.ok(landmark>0&&landmark<viewport.width,'One World Trade Center remains in portrait crop');
}
assert.equal(wallpaperLayout({width:599,height:900,wallpaper:'new-york'}),null,'New York phone retains old geometry');

// Existing narrow city artwork now fills tablets with a shared focal crop.
const {landmarkAssetSet,validateLandmarkCatalog}=await import('../dist/js/landmarks.js');
const catalog=validateLandmarkCatalog(JSON.parse(await readFile(new URL('../dist/wallpapers/catalog.json',import.meta.url),'utf8')));
for(const entry of catalog.filter(e=>!e.tablet&&!e.fitSubject)){
 const selected=landmarkAssetSet(entry,true);
 assert.equal(landmarkAssetSet(entry,false),entry,'Original phone artwork/metadata is untouched');
 assert.equal(selected.day,entry.day,'Existing artwork is reused');
 for(const viewport of [{width:600,height:960},{width:900,height:1344},{width:1344,height:900},{width:1600,height:900}]){
  const size=['afghanistan','badakhshan'].includes(entry.id)?{width:941,height:1672}:{width:853,height:1844};
  const p=wallpaperLayout({...viewport,wallpaper:'landmark',geometry:{...size,fillViewport:selected.fillViewport,focalX:selected.focalX,focalY:selected.focalY}});
  near(p.width/p.height,size.width/size.height);
  assert.ok(p.left<=1e-8&&p.top<=1e-8&&p.left+p.width>=viewport.width-1e-8&&p.top+p.height>=viewport.height-1e-8,'Every remaining city covers tablet edges');
  const y=p.top+p.height*selected.focalY;assert.ok(y>=0&&y<=viewport.height,'Selected city detail stays visible');
  assert.equal(p.needsLandscape,false);
 }
}

// Rotation must never magnify a portrait image to the landscape viewport width.
for(const viewport of [{width:844,height:390},{width:932,height:430},{width:740,height:360}])for(const geometry of [{width:853,height:1844},{width:1536,height:1024,fitSubject:true,focalX:.75},{width:851,height:1847,fillViewport:true,focalY:.7}]){
 const p=wallpaperLayout({...viewport,wallpaper:'landmark',geometry});
 assert.equal(p.mode,'phone-landscape');near(p.width/p.height,geometry.width/geometry.height);
 assert.ok(p.left>=-1e-8&&p.top>=-1e-8&&p.left+p.width<=viewport.width+1e-8&&p.top+p.height<=viewport.height+1e-8,'Whole source rectangle remains visible');
 near(p.scale,Math.min(viewport.width/geometry.width,viewport.height/geometry.height));
 const s=elements(),w=elements();applyWallpaperLayout(s,w,{...viewport,wallpaper:'landmark',geometry});assert.deepEqual(s.values,w.values,'Sky/weather share the uncut photograph');
 applyWallpaperLayout(s,w,{width:390,height:844});assert.equal(s.values.size,0,'Portrait restores existing composition');
}
const weatherSource=await readFile(new URL('../dist/js/weather.js',import.meta.url),'utf8');assert.ok(weatherSource.includes('viewportWidth>viewportHeight'),'Landscape phone requests available wide assets');
assert.match(css,/data-scene-layout="phone-landscape"/);
console.log('PASS: landscape phones preserve every source edge, avoid portrait enlargement, use wide assets and restore portrait.');
