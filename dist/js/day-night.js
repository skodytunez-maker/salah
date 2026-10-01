const minute=60000;
const clamp=x=>Math.min(1,Math.max(0,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t)};
const night=()=>({day:0,dawn:0,dusk:0,phase:'night'});
// Use absolute timestamps from the city's original schedule, before manual offsets.
export function sceneAt(now,times){
 const rise=times?.Sunrise,set=times?.Maghrib,fajr=times?.Fajr;
 if(!Number.isFinite(now)||!Number.isFinite(rise)||!Number.isFinite(set)||set<=rise||set-rise>=24*60*minute)return night();
 const width=Math.min(45*minute,(set-rise)/4);
 const hasDawn=Number.isFinite(fajr)&&fajr<rise&&rise-fajr<12*60*minute;
 const morning=hasDawn?smooth((now-fajr)/(rise-fajr)):smooth((now-rise+width)/(2*width));
 const day=morning*(1-smooth((now-set+width)/(2*width)));
 // First light is cool; warm sunlight appears only close to sunrise.
 const warmWidth=hasDawn?Math.min(width,(rise-fajr)/2):width;
 const dawn=hasDawn?smooth((now-rise+warmWidth)/warmWidth)*(1-smooth((now-rise)/width)):clamp(1-Math.abs(now-rise)/width);
 const dusk=clamp(1-Math.abs(now-set)/width);
 const inDawn=hasDawn?now>=fajr&&now<rise+width:dawn>0;
 return {day,dawn,dusk,phase:inDawn?'dawn':dusk>0?'dusk':day>.5?'day':'night'};
}
// A visual-only preview; prayer times and the countdown are never changed.
export function previewScene(elapsed){
 const frames=[night(),{day:.5,dawn:1,dusk:0,phase:'dawn'},{day:1,dawn:0,dusk:0,phase:'day'},{day:.5,dawn:0,dusk:1,phase:'dusk'},night()];
 const position=Math.min(4,Math.max(0,Number.isFinite(elapsed)?elapsed/5000:0)),i=Math.min(3,Math.floor(position)),mix=smooth(position-i),a=frames[i],b=frames[i+1];
 return {day:a.day+(b.day-a.day)*mix,dawn:a.dawn+(b.dawn-a.dawn)*mix,dusk:a.dusk+(b.dusk-a.dusk)*mix,phase:mix<.5?a.phase:b.phase};
}

export function backgroundMode(value,legacyDynamic){return ['dark','light','auto'].includes(value)?value:legacyDynamic===false?'dark':'auto'}
export function sceneForMode(now,times,mode){return mode==='light'?{day:1,dawn:0,dusk:0,phase:'day'}:mode==='dark'?night():sceneAt(now,times)}
