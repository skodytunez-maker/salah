export const RETURN_DAYS=[7,14,30];
export const RETURN_COOLDOWN=7*86400000;
export const RETURN_TTL=120000;
export const RETURN_DEFAULT_TEXT='Уделим несколько минут Корану и азкарам? Откройте SALAH.';
export const RETURN_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function returnText(value){return typeof value==='string'&&!/[\u0000-\u001f\u007f]/.test(value)&&value.trim().length>=5&&value.trim().length<=180?value.trim():null;}
export function returnStamp(value){const n=typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(n)&&n>0?n:null;}
export function returnAllowedAt(now,zone){try{if(typeof zone!=='string'||zone.length>80)return false;const hour=Number(new Intl.DateTimeFormat('en',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).find(p=>p.type==='hour')?.value);return hour>=8&&hour<22;}catch{return false;}}
export function returnRecipientReady(row,now){
 if(!row||!RETURN_UUID.test(row.user||'')||!RETURN_UUID.test(row.device||'')||!RETURN_UUID.test(row.id||'')||!['web','native'].includes(row.channel)||!RETURN_DAYS.includes(row.days)||row.confirmed!==true||row.anonymous!==false||row.banned!==false||row.sessionActive!==true||row.deviceEnabled!==true||!returnAllowedAt(now,row.timeZone))return false;
 const last=returnStamp(row.lastVisit),snapshot=returnStamp(row.activityAt),sent=returnStamp(row.lastSent),expires=returnStamp(row.campaignExpires);
 return !!last&&!!snapshot&&!!expires&&expires>now&&now-last>=row.days*86400000&&last<=snapshot&&(!sent||now-sent>=RETURN_COOLDOWN)&&!!returnText(row.body);
}
export function ownerReturnNotice(row,now){
 if(!returnRecipientReady(row,now))return null;
 return{title:'SALAH',body:returnText(row.body),kind:'owner-return',user:row.user,eventId:row.id,timeZone:row.timeZone,at:now,expiresAt:now+RETURN_TTL,tag:'salah-push-owner-return-'+row.id,url:'#home'};
}
