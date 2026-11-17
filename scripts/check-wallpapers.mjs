import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wallpaperChoice,skyObjects,wallpapers,previewClock,skyGeometry,moonAppearance,moonPhasePath} from '../dist/js/wallpapers.js';
import {solarSceneAt,sceneForMode} from '../dist/js/day-night.js';
import {getTimes,getPosition,getMoonTimes,getMoonPosition,getMoonIllumination} from '../dist/js/vendor/suncalc.js';
const store=new Map();globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
const {settings,updateSettings,normalizeSettings}=await import('../dist/js/storage.js');
assert.equal(settings.wallpaper,'mosque');assert.equal(wallpapers.length,3);assert.equal(wallpaperChoice('external-url'),'mosque');assert.throws(()=>normalizeSettings({wallpaper:'external-url'},{strict:true}));
updateSettings({school:0,weather:true,wallpaper:'new-york'});updateSettings({backgroundMode:'dark'});assert.equal(settings.wallpaper,'new-york');assert.equal(settings.school,0);assert.equal(settings.weather,true);assert.equal(normalizeSettings(JSON.parse(store.get('salah:settings'))).wallpaper,'new-york');

updateSettings({wallpaper:'landmark'});assert.equal(settings.school,0);assert.equal(normalizeSettings(JSON.parse(store.get('salah:settings'))).wallpaper,'landmark');

const day=86400000,minute=60000;
const tyumen={latitude:57.15222,longitude:65.52722},nyc={latitude:40.7128,longitude:-74.006},svalbard={latitude:78.2232,longitude:15.6469};
const at=(instant,city=tyumen,times=null)=>skyObjects(typeof instant==='number'?instant:Date.parse(instant),times,'auto',null,city);
const finite=sky=>{
 assert.deepEqual(Object.keys(sky).sort(),['sunX','sunY','sun','moonX','moonY','moon'].sort());
 for(const [key,value] of Object.entries(sky))assert.ok(Number.isFinite(value),key+' must be finite');
 for(const key of ['sunX','moonX'])assert.ok(sky[key]>=8&&sky[key]<=92,key+' must remain in the panorama');
 for(const key of ['sun','moon'])assert.ok(sky[key]>=0&&sky[key]<=1,key+' must have valid opacity');
};

// This waning Moon is high in the morning sky, independently of sunrise.
const morning=at('2026-10-02T06:51:00+05:00');
assert.equal(morning.sun,1);assert.ok(morning.moon>0);
assert.ok(morning.sunX<10&&morning.sunY>56);
assert.ok(morning.moonX>55&&morning.moonX<60&&morning.moonY<29);
assert.ok(Math.abs(morning.sunX-morning.moonX)>30&&Math.abs(morning.sunY-morning.moonY)>25);
const midday=at('2026-10-02T12:00:00+05:00');
assert.equal(midday.sun,1);assert.ok(midday.moon>0);
assert.ok(midday.sunX>morning.sunX&&midday.sunY<morning.sunY);
assert.ok(midday.moonX>morning.moonX&&midday.moonY>morning.moonY);
assert.equal(at('2026-10-02T16:00:00+05:00').moon,0);

// Automatic astronomy ignores Fajr, manual corrections and stale schedules.
const observed=Date.parse('2026-10-02T06:51:00+05:00');
assert.deepEqual(at(observed,tyumen,{Fajr:observed+day,Sunrise:observed+day,Maghrib:observed-day}),morning);
const solar=getTimes(new Date(observed),tyumen.latitude,tyumen.longitude),sunrise=+solar.sunrise,sunset=+solar.sunset;
assert.equal(at(sunrise-2*minute).sun,0);
assert.ok(at(sunrise).sun>0&&at(sunrise).sun<1,'the upper solar limb fades through astronomical sunrise');
assert.equal(at(sunrise+2*minute).sun,1);
assert.equal(at(sunset-2*minute).sun,1);assert.equal(at(sunset+2*minute).sun,0);
const sunAtRise=getPosition(solar.sunrise,tyumen.latitude,tyumen.longitude);
assert.ok(sunAtRise.altitude<0,'sunrise refers to the upper limb, not the center');
assert.ok(sunAtRise.altitude+.266+.09>=0);
const moonEvents=getMoonTimes(new Date(observed),tyumen.latitude,tyumen.longitude,0);
assert.ok(at(+moonEvents.set-2*minute).moon>0);assert.equal(at(+moonEvents.set+5*minute).moon,0);
const moonAtSet=getMoonPosition(moonEvents.set,tyumen.latitude,tyumen.longitude);
const moonUpperLimb=moonAtSet.altitude+.2725*Math.asin(6378.14/moonAtSet.distance)*180/Math.PI+.09;
assert.ok(Math.abs(moonUpperLimb)<.001,'moonset and position share an upper-limb convention');


// Rise/set and the daytime Moon brightness must change continuously.
for(const event of [solar.sunrise,solar.sunset,moonEvents.rise,moonEvents.set])if(Number.isFinite(+event)){
 const before=at(+event-1000),after=at(+event+1000);
 for(const key of ['sun','moon'])assert.ok(Math.abs(before[key]-after[key])<.025,'No visibility flash across '+key+' horizon at '+event.toISOString());
}

// A visible upper limb must stay on the same rise/set arc through the fade.
// A previous-rise/next-set lookup used to teleport a half-visible disc by ~60%.
for(const city of [tyumen,nyc,{latitude:40.2833,longitude:69.6222},{latitude:-33.8688,longitude:151.2093}]){
 for(const date of ['2026-03-20T12:00:00Z','2026-06-21T12:00:00Z','2026-11-05T12:00:00Z','2026-12-21T12:00:00Z']){
  const solar=getTimes(new Date(date),city.latitude,city.longitude),lunar=getMoonTimes(new Date(date),city.latitude,city.longitude,0);
  for(const [body,event]of [['sun',solar.sunrise],['sun',solar.sunset],['moon',lunar.rise],['moon',lunar.set]])if(Number.isFinite(+event)){
   const before=at(+event-2000,city),after=at(+event+2000,city);finite(before);finite(after);
   assert.ok(Math.abs(before[body+'X']-after[body+'X'])<.1,'No horizontal teleport for a visible '+body+' near '+event.toISOString());
   assert.ok(before[body]>0&&after[body]>0,'Retain the genuine horizon fade instead of hiding the regression');
  }
 }
}

// The UTC day sets before it rises: midnight needs the previous day's rise.
const nyMoon=getMoonTimes(new Date('2026-06-21T12:00:00Z'),nyc.latitude,nyc.longitude,0);
assert.ok(+nyMoon.set<+nyMoon.rise);
const nyMidnight=at('2026-06-21T00:00:00Z',nyc);
assert.ok(nyMidnight.moon>0&&nyMidnight.moonX>60&&nyMidnight.moonX<65);
assert.equal(at('2026-06-21T12:00:00Z',nyc).moon,0);
const reentry=at('2026-06-21T17:00:00Z',nyc);
assert.ok(reentry.moon>0&&reentry.moonX<12);
assert.deepEqual(at('2026-06-21T00:00:00Z',nyc),nyMidnight);

// A circumpolar Moon can stay visible without any daily rise/set pair.
assert.equal(getMoonTimes(new Date('2026-10-02T12:00:00Z'),svalbard.latitude,svalbard.longitude,0).alwaysUp,true);
assert.ok(at('2026-10-02T00:00:00Z',svalbard).moon>0);
const polarNight=at('2026-12-21T12:00:00Z',svalbard);
assert.equal(polarNight.sun,0);assert.ok(polarNight.moon>0);
const polarDay=at('2026-06-21T00:00:00Z',svalbard);
assert.equal(polarDay.sun,1);assert.equal(polarDay.moon,0);
for(const city of [tyumen,nyc,svalbard,{latitude:0,longitude:0},{latitude:90,longitude:0},{latitude:-90,longitude:180},{latitude:-36.8485,longitude:174.7633}]){
 for(const date of ['2026-03-20T00:00:00Z','2026-06-21T12:00:00Z','2026-10-02T23:59:59Z','2026-12-21T12:00:00Z'])finite(at(date,city));
}

// Changing cities or dates, including backwards, cannot poison the cache.
const reference=at(observed);at(observed,nyc);at(observed+day,tyumen);at(observed-day,svalbard);
assert.deepEqual(at(observed),reference);
const midnight=Date.parse('2026-10-03T00:00:00Z'),before=at(midnight-1000),after=at(midnight);
assert.ok(before.moon>0&&after.moon>0);
assert.ok(Math.abs(before.moonX-after.moonX)<.01&&Math.abs(before.moonY-after.moonY)<.01,'UTC cache rollover must not abruptly move the Moon');

// One accelerated astronomical clock keeps preview sunrise/set at 5s/15s.
const shiftedTimes={Sunrise:sunrise+2*minute,Maghrib:sunset+30*minute};
assert.ok(Math.abs(previewClock(observed,shiftedTimes,5000,tyumen)-sunrise)<1000);
assert.ok(Math.abs(previewClock(observed,shiftedTimes,15000,tyumen)-sunset)<1000);
assert.equal(previewClock(observed,null,20000,tyumen)-previewClock(observed,null,0,tyumen),day);
for(const elapsed of [0,2500,5000,10000,15000,17500,20000]){
 const simulated=previewClock(observed,null,elapsed,tyumen),preview=skyObjects(observed,null,'auto',elapsed,tyumen);
 finite(preview);assert.deepEqual(preview,at(simulated));
}
for(const mode of ['auto','light','dark'])assert.deepEqual(skyObjects(observed,null,mode,null,tyumen),at(observed),'Lighting choice never changes the real celestial position or visibility');
for(const city of [null,{latitude:91,longitude:0},{latitude:0,longitude:181},{latitude:NaN,longitude:0},{latitude:'57',longitude:65}]){
 for(const mode of ['auto','light','dark']){const sky=skyObjects(observed,null,mode,null,city);finite(sky);assert.equal(sky.sun,0);assert.equal(sky.moon,0);}
}
const invalidTime=skyObjects(NaN,null,'auto',null,tyumen);finite(invalidTime);assert.equal(invalidTime.sun,0);assert.equal(invalidTime.moon,0);

// Projection and occlusion must share the source panorama's cover crop.
const [css,mask]=await Promise.all([readFile(new URL('../dist/day-night.css',import.meta.url),'utf8'),readFile(new URL('../dist/assets/window-sky-mask.svg',import.meta.url),'utf8')]);
assert.deepEqual(skyGeometry,{width:853,height:1844,horizon:1060});
assert.match(mask,/viewBox="0 0 853 1844"/);assert.match(mask,/<path\s[^>]*d="[^\"]*Z"/i,'the skyline needs a closed occluding mask');
assert.match(css,/aspect-ratio:\s*853\s*\/\s*1844/);assert.match(css,/mask-image:url\(['"]?\.\/assets\/window-sky-mask\.svg/);
for(const property of ['sunX','sunY','moonX','moonY'])assert.ok(css.includes('--sky-'+property),'each body needs its own projected coordinates');
assert.match(css,/#home-scene\.sky-reset[^}]*transition:opacity 1\.2s linear/s,'Re-entry resets coordinates without streaking and preserves the visibility fade');
console.log('PASS: wallpaper/settings persistence; real independent daylight Sun/Moon paths; upper-limb rise/set; previous-day lunar arcs; polar/invalid cities; preview clock; cache rollover; panorama mask.');

// Wallpaper preferences never change the prayer city or its calculation.
const place={name:'Тюмень',latitude:57.15222,longitude:65.52722,timezone:'Asia/Yekaterinburg'};
updateSettings({city:place,school:0,landmarkCity:'pamir',wallpaper:'landmark'});
assert.deepEqual(settings.city,{...place,country:''});assert.equal(settings.school,0);
assert.equal(normalizeSettings(JSON.parse(store.get('salah:settings'))).landmarkCity,'pamir');
assert.equal(normalizeSettings({}).landmarkCity,'auto');
assert.throws(()=>normalizeSettings({landmarkCity:'../../private'},{strict:true}));
assert.throws(()=>normalizeSettings({landmarkCity:123},{strict:true}));
// Twilight and the moving Sun use the same astronomical clock.
for(const city of [tyumen,nyc,svalbard,{latitude:-33.8688,longitude:151.2093}]){
 const stamp=Date.parse('2026-10-04T12:00:00Z'),events=getTimes(new Date(stamp),city.latitude,city.longitude);
 for(const event of [events.dawn,events.sunrise,events.sunset,events.dusk])if(Number.isFinite(+event)){
  const a=solarSceneAt(+event-1000,city),b=solarSceneAt(+event+1000,city);
  for(const key of ['day','dawn','dusk']){assert.ok(a[key]>=0&&a[key]<=1);assert.ok(Math.abs(a[key]-b[key])<.01,'No light jump around sunrise/twilight');}
 }
 const frame=solarSceneAt(stamp,city);assert.deepEqual(sceneForMode(stamp,{Fajr:stamp+day,Sunrise:stamp+day,Maghrib:stamp-day},'auto',city),frame,'Manual offsets never change astronomical light');
}
const winter=solarSceneAt(Date.parse('2026-12-21T12:00:00Z'),svalbard);assert.ok(winter.day<.01,'Polar winter can retain a faint midday twilight');
assert.equal(solarSceneAt(Date.parse('2026-06-21T00:00:00Z'),svalbard).day,1);
assert.equal(solarSceneAt(NaN,tyumen),null);assert.equal(solarSceneAt(observed,{latitude:91,longitude:0}),null);
assert.equal(sceneForMode(observed,null,'dark',tyumen).day,0);assert.equal(sceneForMode(observed,null,'light',tyumen).day,1);
console.log('PASS: independent saved landmark city; safe preference validation; astronomical twilight continuity; polar light; explicit modes; prayer offsets do not affect the scene.');

// SunCalc2 azimuth is north=0/east=90/south=180/west=270, never a
// negative south-based v1 value. Dawn must not silently become sunset.
const sydney={latitude:-33.8688,longitude:151.2093};
for(const city of [tyumen,nyc,sydney,{latitude:0,longitude:0}]){
 const events=getTimes(new Date('2026-11-17T12:00:00Z'),city.latitude,city.longitude);
 const rise=solarSceneAt(+events.sunrise,city),set=solarSceneAt(+events.sunset,city);
 assert.ok(rise.dawn>.1&&rise.dusk===0,'Eastern ascending Sun gives dawn in either hemisphere');
 assert.ok(set.dusk>.1&&set.dawn===0,'Western descending Sun gives sunset in either hemisphere');
 const first=at(+events.sunrise+minute,city),last=at(+events.sunset-minute,city);
 assert.ok(city.latitude<0?first.sunX>last.sunX:first.sunX<last.sunX,'Equator-facing SH panorama correctly reverses east/west');
}
// This is a genuine illuminated area, not a scaled crescent photograph.
const pathArea=path=>{const values=[...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(match=>[+match[1],+match[2]]);let twice=0;for(let i=0;i<values.length;i++){const a=values[i],b=values[(i+1)%values.length];twice+=a[0]*b[1]-a[1]*b[0];}return Math.abs(twice)/2;};
for(const fraction of [0,.001,.08,.25,.5,.75,.92,.999,1])assert.ok(Math.abs(pathArea(moonPhasePath(fraction))/(Math.PI/4)-fraction)<.005,'Lunar mask area matches illumination '+fraction);
const degrees=Math.PI/180,vector=p=>[Math.cos(p.altitude*degrees)*Math.sin(p.azimuth*degrees),Math.cos(p.altitude*degrees)*Math.cos(p.azimuth*degrees),Math.sin(p.altitude*degrees)],dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>a.map(x=>x/Math.hypot(...a)),angleDistance=(a,b)=>Math.abs(((a-b+540)%360)-180);
// Independent horizon vectors project the Sun onto the Moon's tangent plane.
// Their bright-limb direction catches reversed degree/sign/hemisphere masks.
for(const city of [tyumen,sydney,{latitude:0,longitude:0}])for(const stamp of ['2026-11-17T12:00:00Z','2026-11-21T12:00:00Z','2026-11-29T12:00:00Z']){
 const date=new Date(stamp),sun=getPosition(date,city.latitude,city.longitude),moon=getMoonPosition(date,city.latitude,city.longitude),m=vector(moon),s=vector(sun),up=unit([0,0,1].map((x,i)=>x-m[2]*m[i])),right=cross(m,up),expected=Math.atan2(-dot(s,up),dot(s,right))/degrees,actual=moonAppearance(+date,city);
 assert.ok(angleDistance(actual.rotation,expected)<3,'The illuminated limb faces the Sun from the observer’s horizon');
 assert.equal(actual.fraction,getMoonIllumination(date).fraction);assert.equal(actual.phase,getMoonIllumination(date).phase);
}
const sameInstant=Date.parse('2026-11-17T00:30:00Z'),northMoon=moonAppearance(sameInstant,tyumen),southMoon=moonAppearance(sameInstant,sydney);
assert.equal(northMoon.fraction,southMoon.fraction);assert.equal(northMoon.phase,southMoon.phase);assert.ok(angleDistance(northMoon.rotation,southMoon.rotation)>20,'Location changes observer tilt, not the global phase');
assert.deepEqual(moonAppearance(NaN,tyumen),{fraction:0,phase:0,rotation:0,textureRotation:0});
// Independently fetched primary reference, UTC to one-minute precision:
// https://aa.usno.navy.mil/api/moon/phases/date?date=2026-11-01&nump=5
// USNO API4.0.1, retrieved2026-11-17. Rendering does not query this service.
for(const [instant,phase,fraction]of [['2026-11-01T20:28:00Z',.75,.5],['2026-11-09T07:02:00Z',0,0],['2026-11-17T11:48:00Z',.25,.5],['2026-11-24T14:53:00Z',.5,1],['2026-12-01T06:08:00Z',.75,.5]]){
 // USNO names geocentric longitude conjunction/opposition. SunCalc's phase
 // is derived from the 3-D illuminated fraction; lunar ecliptic latitude means
 // it need not hit exactly0/.5 at a non-eclipse new/full Moon.
 const actual=moonAppearance(Date.parse(instant),tyumen),distance=Math.abs(actual.phase-phase);assert.ok(Math.min(distance,1-distance)<(fraction===.5?.003:.02),'USNO primary phase at '+instant);assert.ok(Math.abs(actual.fraction-fraction)<.003,'USNO illuminated fraction at '+instant);
}
const waxing=moonAppearance(Date.parse('2026-11-13T12:00:00Z'),tyumen),waning=moonAppearance(Date.parse('2026-11-28T12:00:00Z'),tyumen);assert.ok(waxing.phase>0&&waxing.phase<.5);assert.ok(waning.phase>.5&&waning.phase<1);assert.ok(moonAppearance(Date.parse('2026-11-09T07:02:00Z'),tyumen).fraction<.002,'New Moon has no bright disc or glow');
console.log('PASS: v2 north-clockwise dawn convention, both hemisphere directions, exact lunar illuminated area, independent bright-limb orientation and one global phase at each instant.');

// The reported iPhone screenshot is Tyumen17Nov2026,07:08 local (+05).
// Independent USNO daily data: moonrise14:06, moonset23:38 local.
// https://aa.usno.navy.mil/api/rstt/oneday?date=2026-11-17&coords=57.153%2C65.534&tz=5
const screenshotTime=Date.parse('2026-11-17T07:08:00+05:00');
assert.ok(getPosition(new Date(screenshotTime),tyumen.latitude,tyumen.longitude).altitude<0,'The reported sky is before sunrise');
assert.ok(getMoonPosition(new Date(screenshotTime),tyumen.latitude,tyumen.longitude).altitude<-40,'The Moon is genuinely far below the horizon in the reported dark sky');
for(const mode of ['auto','dark','light'])assert.equal(skyObjects(screenshotTime,null,mode,null,tyumen).moon,0,'A lighting preference cannot fabricate a visible Moon before moonrise');
const screenshotDayEvents=getMoonTimes(new Date('2026-11-17T00:00:00Z'),tyumen.latitude,tyumen.longitude,0);
assert.ok(Math.abs(+screenshotDayEvents.rise-Date.parse('2026-11-17T14:06:00+05:00'))<3*minute,'Moonrise agrees with the independent minute-rounded USNO event');
assert.ok(Math.abs(+screenshotDayEvents.set-Date.parse('2026-11-17T23:38:00+05:00'))<3*minute,'Moonset agrees with the independent minute-rounded USNO event');
assert.ok(at('2026-11-17T14:20:00+05:00').moon>0,'An above-horizon daytime Moon is not hidden simply because the Sun is up');
assert.equal(at('2026-11-17T23:50:00+05:00').moon,0,'Late-night darkness cannot keep the Moon visible after its real set');
console.log('PASS: the07:08 Tyumen dark-sky screenshot has no Moon below the horizon, independently checked daily events, daytime rise and late-night set.');
