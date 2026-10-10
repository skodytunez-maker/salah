export const COMPETITION_RECITERS=["ar.alafasy","ar.husary","ar.minshawi","ar.mahermuaiqly","ar.badralturki","ar.muhammadalluhaidan","ar.tariqmuhammad","ar.abdurrahmanalsudais","ar.saudalshuraim","ar.abdullahaljuhany","ar.bandarbalilah","ar.salahalbudair","ar.abdulmuhsinalqasim","ar.alialhuthaifi","ar.abdulbarialthubaity","ar.abdullahalbuayjan","ar.khalidalmuhanna","ar.ahmadalhuthaifi","ar.raadalkurdi","ar.hazzaalbalushi","ar.haithamaljadani","ar.haithamaldukhain","ar.abdelazizsheim","ar.ahmedkaseb","ar.obaidamuafaq","ar.abdulrahmanmossad","ar.siratulloraupov","ar.idrisabkar","ar.abubakrshatri","ar.nasseralqatami","ar.yasseraldossaricontinuous","ar.abdulbasitabdussamad","ar.mansouralsalimi"];
export const COMPETITION_PERIODS=['day','week','month','all'];
const competitionUUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const validCompetitionId=value=>typeof value==='string'&&competitionUUID.test(value);
export function competitionDay(value,now=Date.now()){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('invalid_day');
 const time=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value||Math.abs(time-now)>172800000)throw Error('invalid_day');return value;
}
export function competitionSnapshot(body,now=Date.now()){
 if(!body||body.action!=='snapshot'||!validCompetitionId(body.device)||Object.keys(body).some(k=>!['action','device','totals','days','timeZone'].includes(k)))throw Error('invalid_snapshot');
 const totals={},days={},known=new Set(COMPETITION_RECITERS);
 if(!body.totals||Array.isArray(body.totals)||typeof body.totals!=='object'||!body.days||Array.isArray(body.days)||typeof body.days!=='object')throw Error('invalid_snapshot');
 let total=0;for(const[id,n]of Object.entries(body.totals)){if(!known.has(id)||!Number.isSafeInteger(n)||n<0||n>315360000)throw Error('invalid_total');totals[id]=n;total+=n;}if(total>315360000)throw Error('invalid_total');
 if(Object.keys(body.days).length>93)throw Error('invalid_days');
 for(const[day,rows]of Object.entries(body.days)){
  const time=Date.parse(day+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==day||time<now-94*86400000||time>now+86400000||!rows||typeof rows!=='object'||Array.isArray(rows))throw Error('invalid_days');
  days[day]={};let dayTotal=0;for(const[id,n]of Object.entries(rows)){if(!known.has(id)||!Number.isSafeInteger(n)||n<0||n>86400||n>(totals[id]||0))throw Error('invalid_days');days[day][id]=n;dayTotal+=n;}if(dayTotal>86400)throw Error('invalid_days');
 }
 for(const id of Object.keys(totals))if(Object.values(days).reduce((s,rows)=>s+(rows[id]||0),0)>totals[id])throw Error('invalid_days');
 const timeZone=typeof body.timeZone==='string'?body.timeZone:'UTC';if(timeZone.length>100)throw Error('invalid_timezone');try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw Error('invalid_timezone');}
 return {device:body.device,totals,days,timeZone};
}
export function competitionSubscription(value){
 if(!value||typeof value.endpoint!=='string'||value.endpoint.length>4096)throw Error('invalid_subscription');const u=new URL(value.endpoint);
 if(u.protocol!=='https:'||u.port&&u.port!=='443'||u.username||u.password||u.hash||!['web.push.apple.com','fcm.googleapis.com','updates.push.services.mozilla.com'].includes(u.hostname)&&!(/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname)))throw Error('invalid_subscription');
 for(const[key,size]of [['p256dh',65],['auth',16]]){const text=value.keys?.[key];if(typeof text!=='string'||!/^[-\w]+$/.test(text)||text.length>100)throw Error('invalid_subscription');const bytes=Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));if(bytes.length!==size||key==='p256dh'&&bytes[0]!==4)throw Error('invalid_subscription');}
 return{endpoint:u.href,keys:{p256dh:value.keys.p256dh,auth:value.keys.auth}};
}
