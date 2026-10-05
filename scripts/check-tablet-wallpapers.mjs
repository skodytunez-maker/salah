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
for(const size of [{width:390,height:844},{width:844,height:390},{width:599,height:900},{width:NaN,height:800},{width:800,height:0}])assert.equal(wallpaperLayout(size),null,'Phone/invalid viewport keeps existing CSS');
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
