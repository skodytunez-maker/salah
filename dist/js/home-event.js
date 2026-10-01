// Sunrise is a home-screen event; it never becomes an obligatory prayer.
export function homeEvent(now,prayer,sunrise,day){
 if(!Number.isFinite(now))return null;
 const next=prayer&&Number.isFinite(prayer.time)&&prayer.time>now?prayer:null;
 if(Number.isFinite(sunrise)&&sunrise>now&&(!next||sunrise<next.time))return {key:'Sunrise',name:'Восход',time:sunrise,day};
 return next;
}
