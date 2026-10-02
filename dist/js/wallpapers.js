import{getPosition,getTimes,getMoonPosition,getMoonTimes}from './vendor/suncalc.js';
export const wallpapers=[
 {id:'mosque',name:'Мечеть',day:'./assets/day-mosque.webp',night:'./assets/night-mosque.webp'},
 {id:'new-york',name:'Нью-Йорк',day:'./assets/window-new-york-day.webp',night:'./assets/window-new-york-night.webp'}
];
export const wallpaperChoice=value=>wallpapers.some(item=>item.id===value)?value:'mosque';
const day=86400000,rad=Math.PI/180,clamp=value=>Math.max(0,Math.min(1,value));
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
function bodyPoint(now,position,events){
 const rise=events.filter(event=>event.kind==='rise'&&event.time<=now+1000).at(-1);
 const set=events.find(event=>event.kind==='set'&&event.time>=now-1000);
 // At polar latitudes a body may stay up for days without a rise/set pair.
 const progress=rise&&set&&set.time>rise.time?clamp((now-rise.time)/(set.time-rise.time)):null;
 return {x:progress===null?50-42*Math.sin(position.azimuth*rad):8+84*progress,
  y:skyGeometry.horizon/skyGeometry.height*100-50*Math.max(-2,Math.min(90,position.altitude))/90};
}
export function previewClock(now,times,elapsed,city){
 if(!Number.isFinite(elapsed)||!Number.isFinite(now)||!validCity(city))return now;
 const sun=getTimes(new Date(now),city.latitude,city.longitude);
 const rise=stamp(sun.sunrise),set=stamp(sun.sunset);
 if(rise===null||set===null||set<=rise||set-rise>=day)return now+clamp(elapsed/20000)*day;
 const t=Math.max(0,Math.min(20000,elapsed)),night=day-(set-rise);
 // Match the existing preview: sunrise at5s, sunset at15s. The Moon is
 // calculated at that same accelerated timestamp, independently of the Sun.
 return t<5000?rise-night/2+night*t/10000:t<15000?rise+(set-rise)*(t-5000)/10000:set+night*(t-15000)/10000;
}
export function skyObjects(now,times,mode='auto',preview=null,city=null){
 if(mode==='light')return {sunX:50,sunY:15,sun:1,moonX:50,moonY:58,moon:0};
 if(mode==='dark')return {sunX:50,sunY:58,sun:0,moonX:68,moonY:18,moon:1};
 if(!Number.isFinite(now)||!validCity(city))return emptySky();
 const instant=Number.isFinite(preview)?previewClock(now,times,preview,city):now;
 const date=new Date(instant),sun=getPosition(date,city.latitude,city.longitude),moon=getMoonPosition(date,city.latitude,city.longitude);
 if(![sun.azimuth,sun.altitude,moon.azimuth,moon.altitude,moon.distance].every(Number.isFinite))return emptySky();
 const events=skyEvents(instant,city),s=bodyPoint(instant,sun,events.solar),m=bodyPoint(instant,moon,events.lunar);
 // Apparent upper-limb horizon convention used by SunCalc's rise/set solver.
 const sunUp=sun.altitude+.266+.09>=0,moonUp=moon.altitude+.2725*Math.asin(6378.14/moon.distance)/rad+.09>=0;
 return {sunX:s.x,sunY:s.y,sun:sunUp?1:0,moonX:m.x,moonY:m.y,moon:moonUp?(sunUp?0.42:1):0};
}
