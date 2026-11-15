import{returnAllowedAt}from '../../../dist/js/owner-return-core.js';
import{localTimestamp}from '../../../dist/js/reminder-events.js';
import{notificationLanguage}from '../../../dist/js/notification-language.js';
export const UPDATE_501_VERSION=501;
export const UPDATE_501_UNTIL=Date.parse('2026-11-17T11:59:59Z');
export const UPDATE_501_RECEIPTS_UNTIL=UPDATE_501_UNTIL+7*86400000;
export const UPDATE_501_CAMPAIGN='update-501';
export const UPDATE_501_TTL=120000;
const UPDATE_501_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Fixed release copy only; callers cannot supply a body, URL, version or audience.
export const UPDATE_501_COPY=Object.freeze({
 ru:'Доступна версия SALAH 501. Обновите: Меню → Настройки → Приложение и обновления → Обновить.',
 en:'SALAH 501 is available. To update: Menu → Settings → App and updates → Update.',
 az:'SALAH 501 hazırdır. Yeniləmək üçün: Menyu → Parametrlər → Tətbiq və yeniləmələr → Yenilə.',
 tg:'Нусхаи SALAH 501 дастрас аст. Барои навсозӣ: Меню → Танзимот → Барнома ва навсозиҳо → Навсозӣ.',
 uz:'SALAH 501 tayyor. Yangilash uchun: Menyu → Sozlamalar → Ilova va yangilanishlar → Yangilash.',
 kk:'SALAH 501 қолжетімді. Жаңарту үшін: Мәзір → Баптаулар → Қолданба және жаңартулар → Жаңарту.',
 de:'SALAH 501 ist verfügbar. Zum Aktualisieren: Menü → Einstellungen → App und Updates → Aktualisieren.',
 ar:'يتوفر SALAH 501. للتحديث: القائمة ← الإعدادات ← التطبيق والتحديثات ← تحديث.'
});
export function update501Notice(row,now){
 if(!row||!Number.isFinite(now)||now>=UPDATE_501_UNTIL||!UPDATE_501_UUID.test(row.user||'')||!UPDATE_501_UUID.test(row.device||'')||!['web','native'].includes(row.channel)||!Number.isInteger(row.version)||row.version<1||row.version>=UPDATE_501_VERSION||!returnAllowedAt(now,row.timeZone))return null;
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:row.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const quietAt=localTimestamp(day,'22:00',row.timeZone),expiresAt=Math.min(now+UPDATE_501_TTL,UPDATE_501_UNTIL,quietAt);
 if(!Number.isFinite(expiresAt)||expiresAt<=now)return null;
 const language=notificationLanguage(row.language);
 return{title:'SALAH',body:UPDATE_501_COPY[language],language,kind:'app-update',tag:'salah-push-update-501',url:'#settings',at:now,expiresAt};
}
export async function dispatchUpdate501({db,send,clock=Date.now,nativeReady=true}){
 if(!db.update501Jobs||clock()>=UPDATE_501_UNTIL)return 0;
 const started=clock(),jobs=await db.update501Jobs(started,nativeReady);let sent=0;
 for(const job of jobs.slice(0,100)){
  if(clock()-started>=20000||clock()>=UPDATE_501_UNTIL)break;
  if(job.channel==='native'&&!nativeReady)continue;
  // Claim is final for this user, even if the gateway outcome is unknown. A
  // token refresh, retry, different device or second channel cannot resend it.
  if(!await db.update501Claim(job.user,clock()))continue;
  const current=await db.update501Active(job.user,clock()),event=update501Notice(current,clock());
  if(!event){await db.update501Complete(job.user,'skipped');continue;}
  let state='failed';try{const result=await send(current,event);state=result==='sent'?'sent':result==='expired'?'expired':'failed';}catch{}
  await db.update501Complete(job.user,state);if(state==='sent')sent++;
 }
 return sent;
}
