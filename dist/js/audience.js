import{FAMILIES_REQUIRED}from './audience-mode.js';
import{AUDIENCE_KEY,groupForBirthDate,readAudience,saveAudience}from './audience-core.js';
import{esc,modal}from './ui.js';
let chosen=null,boot=null,restrictedInstalled=false,nativeRequired=null;
export const audienceRequired=()=>FAMILIES_REQUIRED||nativeRequired===true||nativeRequired===null&&globalThis.Capacitor?.isNativePlatform?.()===true&&globalThis.Capacitor.getPlatform?.()==='android';
const storage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export const personalDataAllowed=()=>!audienceRequired()||chosen==='adult'&&readAudience(storage())==='adult';
export function restrictedMarkup(title='Личные данные защищены'){
 return '<section class="audience-notice"><h2>'+esc(title)+'</h2><p>В этом режиме аккаунт, фото, публичный рейтинг и облачные сообщения недоступны. Личный прогресс сохраняется только на устройстве.</p><p>Коран, азкары, время намаза и обучение доступны без регистрации.</p><a class="text-button" href="./privacy.html">Конфиденциальность</a></section>';
}
export function showRestrictedFeature(container,title){container.innerHTML=restrictedMarkup(title);}
function installRestrictedPolicy(doc){
 if(restrictedInstalled)return;restrictedInstalled=true;doc.body.classList.add('audience-restricted');
 // Additional CSP only tightens the document's existing policy. No account,
 // signed profile photo, third-party script or embedded frame can load here.
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
 policy.content="script-src 'self'; img-src 'self' data: blob:; frame-src 'none'; connect-src 'self' https://*.mp3quran.net https://ummah.su https://cdn-globecast.akamaized.net https://api.aladhan.com https://api.open-meteo.com https://geocoding-api.open-meteo.com https://cdn.islamic.network https://everyayah.com https://archive.org https://*.archive.org https://www.hisnmuslim.com";
 doc.head.append(policy);
 doc.addEventListener('click',event=>{const link=event.target?.closest?.('a[href]');if(!link)return;let url;try{url=new URL(link.href,doc.baseURI);}catch{return;}if(url.origin===location.origin&&['http:','https:','capacitor:'].includes(url.protocol))return;event.preventDefault();event.stopImmediatePropagation();modal('<div class="modal-head"><h2>Внешняя ссылка</h2><button class="text-button" data-close>Понятно</button></div><p>Переходы на внешние сайты в этом режиме недоступны.</p>');},true);
}
async function applyNativeAudience(group){
 const cap=globalThis.Capacitor;if(cap?.isNativePlatform?.()!==true||cap.getPlatform?.()!=='android')return;
 const plugin=cap.Plugins?.SalahSupportPush;
 try{if(!plugin?.setAudience)throw Error('audience_bridge_unavailable');await plugin.setAudience({adult:group==='adult'});}catch(error){if(audienceRequired())throw Error('Не удалось применить защиту. Закройте и снова откройте SALAH.');}
}
export async function ensureAudienceChoice({doc=globalThis.document,store=storage(),now=()=>new Date()}={}){
 if(boot)return boot;
 boot=(async()=>{
  const cap=globalThis.Capacitor;
  if(cap?.isNativePlatform?.()===true&&cap.getPlatform?.()==='android'){try{nativeRequired=(await cap.Plugins.SalahSupportPush.getStatus()).familiesRequired===true;}catch{nativeRequired=true;}}
  if(!audienceRequired())return 'adult';
  const css=doc.createElement('link');css.rel='stylesheet';css.href='./css/audience.css';doc.head.append(css);
  let group=readAudience(store);
  if(!group)group=await new Promise(resolve=>{
   const panel=doc.createElement('section');panel.className='audience-gate';panel.setAttribute('aria-labelledby','audience-title');
   const today=now(),date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
   panel.innerHTML='<div class="audience-card"><span class="audience-brand">SALAH</span><h1 id="audience-title">Укажите дату рождения</h1><p>Она используется только на устройстве, чтобы выбрать подходящие настройки. Дата не сохраняется и не отправляется на сервер.</p><form autocomplete="off"><label for="audience-birth-date">Дата рождения</label><input type="date" id="audience-birth-date" min="1900-01-01" max="'+date+'" required autocomplete="off"><p class="audience-error" role="status"></p><button class="button" type="submit">Продолжить</button></form><button class="text-button" type="button" data-private>Продолжить без указания</button><a class="text-button" href="./privacy.html">Конфиденциальность</a></div>';
   doc.body.append(panel);const form=panel.querySelector('form'),input=panel.querySelector('input'),status=panel.querySelector('[role=status]');
   const finish=value=>{const saved=saveAudience(store,value);if(!saved&&value==='adult'){status.textContent='Не удалось сохранить настройки. Можно продолжить без указания возраста.';return;}input.value='';panel.remove();resolve(saved?value:'restricted');};
   form.onsubmit=event=>{event.preventDefault();const value=groupForBirthDate(input.value,now());if(!value){status.textContent='Проверьте дату рождения.';return;}finish(value);};
   panel.querySelector('[data-private]').onclick=()=>finish('restricted');
  });
  await applyNativeAudience(group);chosen=group;
  if(group!=='adult')installRestrictedPolicy(doc);
  return group;
 })();try{return await boot;}catch(error){boot=null;const host=doc.getElementById('app');if(host){host.textContent=error.message;const retry=doc.createElement('button');retry.className='button';retry.textContent='Открыть заново';retry.onclick=()=>location.reload();host.append(retry);}throw error;}
}
