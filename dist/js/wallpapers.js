export const wallpapers=[
 {id:'mosque',name:'Мечеть',day:'./assets/day-mosque.webp',night:'./assets/night-mosque.webp'},
 {id:'new-york',name:'Нью-Йорк',day:'./assets/window-new-york-day.webp',night:'./assets/window-new-york-night.webp'}
];
export const wallpaperChoice=value=>wallpapers.some(item=>item.id===value)?value:'mosque';
const clamp=value=>Math.max(0,Math.min(1,value));
// Decorative east-to-west path; not a lunar ephemeris or a compass bearing.
export function skyObjects(now,times,mode='auto',preview=null){
 let progress=.5,isDay=true;
 if(Number.isFinite(preview)){const elapsed=((preview%20000)+20000)%20000;isDay=elapsed>=5000&&elapsed<15000;progress=isDay?(elapsed-5000)/10000:elapsed<5000?(elapsed+5000)/10000:(elapsed-15000)/10000;}
 else if(mode==='light'){progress=.5;isDay=true;}
 else if(mode==='dark'){progress=.62;isDay=false;}
 else{const rise=times?.Sunrise,set=times?.Maghrib;if(!Number.isFinite(now)||!Number.isFinite(rise)||!Number.isFinite(set)||set<=rise||set-rise>=86400000)return {x:70,y:22,sun:0,moon:1};isDay=now>=rise&&now<set;progress=isDay?(now-rise)/(set-rise):(((now-set)%86400000+86400000)%86400000)/(rise+86400000-set);}
 progress=clamp(progress);const visibility=clamp(Math.min(progress/.04,(1-progress)/.04));return {x:14+72*progress,y:48-44*Math.sin(Math.PI*progress),sun:isDay?visibility:0,moon:isDay?0:visibility};
}
