import{getPosition,getTimes,getMoonPosition,getMoonTimes,getMoonIllumination}from './vendor/suncalc.js';
export const wallpapers=[
 {id:'mosque',name:'Мечеть',day:'./assets/day-mosque.webp',night:'./assets/night-mosque.webp'},
 {id:'new-york',name:'Нью-Йорк',day:'./assets/window-new-york-day.webp',night:'./assets/window-new-york-night.webp'},
 {id:'landmark',name:'Достопримечательность',day:'./assets/landmark.svg',night:'./assets/landmark.svg'}
];
export const wallpaperChoice=value=>wallpapers.some(item=>item.id===value)?value:'mosque';
const day=86400000,rad=Math.PI/180,clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t)};
// Positions use the selected city. Coordinates are projected into the wallpaper,
// not used as compass bearings; its skyline hides bodies below the visible sky.
export const skyGeometry={width:853,height:1844,horizon:1060};
const emptySky=()=>({sunX:50,sunY:58,sun:0,moonX:50,moonY:58,moon:0});
const validCity=city=>Number.isFinite(city?.latitude)&&Math.abs(city.latitude)<=90&&Number.isFinite(city?.longitude)&&Math.abs(city.longitude)<=180;
const stamp=value=>value instanceof Date&&Number.isFinite(+value)?+value:null;
let eventsCache=null;
function skyEvents(now,city){
 const bucket=Math.floor(now/day),key=[bucket,city.latitude,city.longitude].join(':');
 if(eventsCache?.key===key)return eventsCache;
 const solar=[],lunar=[];
 // UTC buckets avoid depending on the phone's timezone. Neighbouring days cover
 // moonsets after midnight, the lunar day, and date-line cities.
 for(let offset=-2;offset<=2;offset++){
  const date=new Date((bucket+offset)*day+day/2);
  const sun=getTimes(date,city.latitude,city.longitude,0,0),moon=getMoonTimes(date,city.latitude,city.longitude,0);
  for(const [kind,value]of [['rise',sun.sunrise],['set',sun.sunset]]){const time=stamp(value);if(time!==null)solar.push({kind,time})}
  for(const [kind,value]of [['rise',moon.rise],['set',moon.set]]){const time=stamp(value);if(time!==null)lunar.push({kind,time})}
 }
 solar.sort((a,b)=>a.time-b.time);lunar.sort((a,b)=>a.time-b.time);
 return eventsCache={key,solar,lunar};
}
function bodyPoint(now,position,events,northFacing=false){
 // Keep one rise/set arc through the complete horizon fade. Choosing rise
 // before now and set after now independently changes the arc while the disc
 // is still visible, causing a horizontal jump at both ends of the day.
 const arcs=events.filter(event=>event.kind==='rise').map(rise=>{const set=events.find(event=>event.kind==='set'&&event.time>rise.time);return set?{rise:rise.time,set:set.time}:null}).filter(Boolean);
 const active=arcs.find(arc=>arc.rise<=now&&now<=arc.set);
 const nearest=active||arcs.reduce((best,arc)=>{const distance=Math.min(Math.abs(now-arc.rise),Math.abs(now-arc.set));return !best||distance<best.distance?{...arc,distance}:best},null);
 // Circumpolar bodies may have no complete arc in the cached event window.
 const arc=!active&&position.altitude>0?null:nearest;
 const progress=arc?clamp((now-arc.rise)/(arc.set-arc.rise)):null;
 const eastToWest=progress===null?50-42*Math.sin(position.azimuth*rad):8+84*progress;
 return {x:northFacing?100-eastToWest:eastToWest,
  y:skyGeometry.horizon/skyGeometry.height*100-50*Math.max(-2,Math.min(90,position.altitude))/90};
}
export const SCENE_PREVIEW_DURATION=36000;
export const SCENE_PREVIEW_STOPS=Object.freeze([0,6000,10000,16000,22000,27000,31000,SCENE_PREVIEW_DURATION]);
let previewEventsCache=null;
export function previewClock(now,times,elapsed,city){
 const anchor=Number.isFinite(now)?now:0,t=Math.max(0,Math.min(SCENE_PREVIEW_DURATION,Number.isFinite(elapsed)?elapsed:0));
 if(!validCity(city))return anchor+t/SCENE_PREVIEW_DURATION*day;
 const key=[anchor,city.latitude,city.longitude].join(':');
 if(previewEventsCache?.key!==key){
  const sun=getTimes(new Date(anchor),city.latitude,city.longitude),next=getTimes(new Date(anchor+day),city.latitude,city.longitude),rise=stamp(sun.sunrise),set=stamp(sun.sunset),noon=stamp(sun.solarNoon);
  let points=[];
  if(rise!==null&&set!==null&&noon!==null&&rise<noon&&noon<set&&set-rise<day){
   const nightLength=day-(set-rise),before=stamp(sun.nadir)??rise-nightLength/2,followingRise=stamp(next.sunrise),after=Math.min(stamp(next.nadir)??set+nightLength/2,followingRise===null?Infinity:followingRise-1);
   const between=(values,left,right,fallback)=>values.map(stamp).find(value=>value!==null&&value>left&&value<right)??fallback;
   const dawn=between([sun.nauticalDawn,sun.dawn],before,rise,(before+rise)/2),morning=between([sun.goldenHourEnd],rise,noon,(rise+noon)/2),evening=between([sun.goldenHour],noon,set,(noon+set)/2),dusk=between([sun.nauticalDusk,sun.dusk],set,after,(set+after)/2);
   // Short summer nights need not reach nautical twilight. Preserve every
   // available real event and sample the genuine following solar midnight;
   // never advance the Night button into the following morning's daylight.
   points=[dawn,rise,morning,noon,evening,set,dusk,Math.min(dusk+60*60000,after)];
  }
  const complete=points.length===SCENE_PREVIEW_STOPS.length&&points.every((value,i)=>Number.isFinite(value)&&(!i||value>points[i-1]))&&points.at(-1)-points[0]<day;
  previewEventsCache={key,points:complete?points:null};
 }
 const points=previewEventsCache.points;if(!points)return anchor+t/SCENE_PREVIEW_DURATION*day;
 let index=SCENE_PREVIEW_STOPS.findIndex(value=>value>=t);if(index<=0)return points[0];
 const start=SCENE_PREVIEW_STOPS[index-1],end=SCENE_PREVIEW_STOPS[index];return points[index-1]+(points[index]-points[index-1])*(t-start)/(end-start);
}
export function skyObjects(now,times,mode='auto',preview=null,city=null){
 // Manual light/dark changes the photograph's lighting only. Celestial
 // position/visibility must never fabricate an always-visible Sun or Moon.
 if(!Number.isFinite(now)||!validCity(city))return emptySky();
 const instant=Number.isFinite(preview)?previewClock(now,times,preview,city):now;
 const date=new Date(instant),sun=getPosition(date,city.latitude,city.longitude),moon=getMoonPosition(date,city.latitude,city.longitude);
 if(![sun.azimuth,sun.altitude,moon.azimuth,moon.altitude,moon.distance].every(Number.isFinite))return emptySky();
 // The artwork is a schematic equator-facing panorama, not a compass/photo
 // bearing: north/equator looks south (east at left), south looks north (east
 // at right). Never mirror the lunar phase itself; its observer tilt is real.
 const northFacing=city.latitude<0,events=skyEvents(instant,city),s=bodyPoint(instant,sun,events.solar,northFacing),m=bodyPoint(instant,moon,events.lunar,northFacing);
 // Apparent upper-limb horizon convention used by SunCalc's rise/set solver.
 const sunLimb=sun.altitude+.266+.09,moonLimb=moon.altitude+.2725*Math.asin(6378.14/moon.distance)/rad+.09;
 // A half-degree band fades the disc through the horizon without a binary flash.
 // Lunar daylight brightness follows the same continuous solar light curve.
 const sunVisible=smooth((sunLimb+.25)/.5),moonVisible=smooth((moonLimb+.25)/.5),daylight=smooth((sun.altitude+1)/2);
 return {sunX:s.x,sunY:s.y,sun:sunVisible,moonX:m.x,moonY:m.y,moon:moonVisible*(1-.58*daylight)};
}

// The visible area of this object-bounding-box path is exactly the illuminated
// fraction. Its unrotated bright limb points right. Orientation is applied
// separately using the observer's zenith-relative bright-limb position angle.
export function moonPhasePath(fraction){
 const lit=clamp(Number.isFinite(fraction)?fraction:0),points=[],steps=40;
 for(let i=0;i<=steps;i++){const y=-1+2*i/steps;points.push([Math.sqrt(Math.max(0,1-y*y)),y]);}
 for(let i=steps;i>=0;i--){const y=-1+2*i/steps;points.push([(1-2*lit)*Math.sqrt(Math.max(0,1-y*y)),y]);}
 return points.map(([x,y],i)=>(i?'L':'M')+((x+1)/2).toFixed(5)+' '+((y+1)/2).toFixed(5)).join('')+'Z';
}
export function moonAppearance(now,city){
 if(!Number.isFinite(now)||!validCity(city))return{fraction:0,phase:0,rotation:0,textureRotation:0};
 const date=new Date(now),illumination=getMoonIllumination(date),moon=getMoonPosition(date,city.latitude,city.longitude);
 const zenithAngle=illumination.angle-moon.parallacticAngle;
 return{fraction:illumination.fraction,phase:illumination.phase,rotation:-90-zenithAngle,textureRotation:moon.parallacticAngle};
}

// Visual projection follows each artwork's skyline; astronomy above remains unchanged.
const artworkHorizons={tyumen:[.535,.50],omsk:[.59],moscow:[.70],khujand:[.49,.40],dushanbe:[.65],almaty:[.60],astana:[.58],tashkent:[.65],grozny:[.67],makhachkala:[.607],derbent:[.543],pamir:[.445],afghanistan:[.32],badakhshan:[.30],istanbul:[.596],cairo:[.586],'kuala-lumpur':[.557],makkah:[.596,.598],madinah:[.586,.596],uhud:[.56,.58],'al-aqsa':[.561,.518],kaspiysk:[.488],kazan:[.342]};
export function skyProjectionFrame({width,height,wallpaper='mosque',geometry=null,layout=null}={}){
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)return null;
 if(layout)return{left:layout.left,top:layout.top,width:layout.width,height:layout.height,planeLeft:0,planeTop:0};
 const ratio=wallpaper==='mosque'?1.5:853/1844,scale=Math.max(width/ratio,height),photoWidth=scale*ratio,photoHeight=scale;
 const left=(width-photoWidth)*(wallpaper==='mosque'&&width<=600?.85:.5),top=(height-photoHeight)/2;
 return{left,top,width:photoWidth,height:photoHeight,planeLeft:left,planeTop:top};
}
export function projectSkyObjects(sky,{width,height,wallpaper='mosque',landmark=null,geometry=null,layout=null}={}){
 const frame=skyProjectionFrame({width,height,wallpaper,geometry,layout});if(!frame)return{...sky};
 const wide=Number.isFinite(geometry?.width)&&Number.isFinite(geometry?.height)?geometry.width>geometry.height:!!layout&&wallpaper==='new-york';
 const choices=artworkHorizons[landmark],horizon=wallpaper==='mosque'?.55:wallpaper==='new-york'?(wide?.54:.49):choices?.[wide&&choices.length>1?1:0]??.55;
 const left=Math.max(0,-frame.left/frame.width),right=Math.min(1,(width-frame.left)/frame.width),top=Math.max(0,-frame.top/frame.height),bottom=Math.min(1,(height-frame.top)/frame.height);
 const xPad=(right-left)*.07,x0=left+xPad,x1=right-xPad,ceiling=top+(bottom-top)*.07;
 const floor=Math.max(ceiling+.04,Math.min(horizon,bottom-(bottom-top)*.16));
 const output={...sky,horizonY:floor*100};
 for(const body of ['sun','moon']){const progress=clamp((sky[body+'X']-8)/84),altitude=(skyGeometry.horizon/skyGeometry.height*100-sky[body+'Y'])/100;
  output[body+'X']=(x0+(x1-x0)*progress)*100;output[body+'Y']=Math.max(ceiling,Math.min(floor+.012,floor-altitude))*100;}
 return output;
}
