import {getLanguage,subscribeLanguage} from './i18n.js';

const preference='salah:chat-translation:';
const MAX_CACHED_MESSAGES=120;
const labels={
 ru:['Автоперевод','Перевести','Оригинал','Перевод','Перевод недоступен'],
 en:['Auto-translate','Translate','Original','Translation','Translation unavailable'],
 ar:['ترجمة تلقائية','ترجمة','النص الأصلي','الترجمة','الترجمة غير متاحة'],
 de:['Automatisch übersetzen','Übersetzen','Original','Übersetzung','Übersetzung nicht verfügbar'],
 az:['Avtomatik tərcümə','Tərcümə et','Orijinal','Tərcümə','Tərcümə əlçatan deyil'],
 kk:['Автоматты аударма','Аудару','Түпнұсқа','Аударма','Аударма қолжетімсіз'],
 tg:['Тарҷумаи худкор','Тарҷума кардан','Матни аслӣ','Тарҷума','Тарҷума дастрас нест'],
 uz:['Avtomatik tarjima','Tarjima qilish','Asl matn','Tarjima','Tarjima mavjud emas'],
};
const label=index=>(labels[getLanguage()]||labels.en)[index];

function language(tag){
 try{
  const locale=new Intl.Locale(tag);
  return locale.language==='zh'&&locale.maximize().script==='Hant'?'zh-Hant':locale.language;
 }catch{return null;}
}
export function chatDeviceLanguage(nav){
 return [nav?.language,...(nav?.languages||[])].map(language).find(code=>code&&code!=='und')||null;
}

export function browserChatTranslator(win){
 const {LanguageDetector,Translator}=win;
 if(typeof LanguageDetector?.create!=='function'||typeof Translator?.create!=='function')return null;
 let detector=null,disposed=false;
 const translators=new Map(),lifetime=new AbortController();
 async function prepare(signal,{interactive=false}={}){
  if(!detector){
   if(!interactive&&await LanguageDetector.availability()!=='available')return false;
   signal.throwIfAborted();
   const pending=LanguageDetector.create({signal:lifetime.signal});detector=pending;
   try{await pending;}catch(error){if(detector===pending)detector=null;throw error;}
  }
  return !disposed;
 }
 async function translate(text,target,{source=null,interactive=false,signal}){
  if(disposed)return null;
  if(!source){
   if(!await prepare(signal))return null;
   const [best]=await (await detector).detect(text,{signal});
   source=language(best?.detectedLanguage);
   if(!source||!Number.isFinite(best.confidence)||best.confidence<.6)return null;
  }
  if(source===target)return null;
  signal.throwIfAborted();
  const key=source+'>'+target;
  let model=translators.get(key);
  if(!model){
   const options={sourceLanguage:source,targetLanguage:target};
   if(!interactive){
    const availability=await Translator.availability(options);
    signal.throwIfAborted();
    if(availability==='unavailable')return null;
    if(availability==='downloadable')return {needsDownload:source};
   }
   if(disposed)return null;
   model=translators.get(key);
   if(!model){
    model=Translator.create({...options,signal:lifetime.signal});translators.set(key,model);
    if(translators.size>2){const oldest=translators.keys().next().value;void translators.get(oldest).then(x=>x.destroy?.(),()=>{});translators.delete(oldest);}
   }
  }
  let translator;
  try{translator=await model;}catch(error){if(translators.get(key)===model)translators.delete(key);throw error;}
  signal.throwIfAborted();
  const result=await translator.translate(text,{signal});
  return typeof result==='string'&&result.trim()&&result!==text?{text:result}:null;
 }
 return {prepare,translate,dispose(){
  disposed=true;lifetime.abort();
  void detector?.then(x=>x.destroy?.(),()=>{});
  for(const model of translators.values())void model.then(x=>x.destroy?.(),()=>{});
  detector=null;translators.clear();
 }};
}

export function mountChatTranslation(log,toolbar,{actorId,isActive=()=>true,createEngine=browserChatTranslator}={}){
 const doc=log?.ownerDocument,win=doc?.defaultView;
 if(!win||!toolbar||typeof actorId!=='string'||!actorId)return null;
 const engine=createEngine(win);if(!engine)return null;
 const preferenceKey=preference+actorId,cache=new Map();
 const enabledButton=doc.createElement('button');
 enabledButton.type='button';enabledButton.className='text-button chat-translation-toggle';
 toolbar.append(enabledButton);
 let messages=[],enabled=false,disposed=false,scope=null,room=null;
 try{enabled=win.localStorage.getItem(preferenceKey)==='1';}catch{}
 const display=()=>{enabledButton.textContent=label(0);enabledButton.setAttribute('aria-pressed',String(enabled));};
 const isCurrent=run=>!disposed&&enabled&&isActive()&&scope===run&&!run.signal.aborted;
 const getCached=(message,target)=>{const saved=cache.get(message.id);return saved?.body===message.body&&saved.target===target?saved:null;};
 function remember(message,target,result){
  const saved={body:message.body,target,result,showOriginal:false};
  cache.delete(message.id);cache.set(message.id,saved);
  if(cache.size>MAX_CACHED_MESSAGES)cache.delete(cache.keys().next().value);
  return saved;
 }
 function reset(){
  scope?.abort();scope=null;
  for(const original of log.querySelectorAll('[data-chat-translation-original]'))original.hidden=false;
  for(const node of log.querySelectorAll('[data-chat-translation-attachment]'))node.remove();
 }
 async function render(run,interactive){
  const target=chatDeviceLanguage(win.navigator);
  if(!target)return;
  const byId=new Map(messages.map(message=>[message.id,message]));let prepared=null;
  for(const row of [...log.querySelectorAll('[data-message]')].reverse()){
   if(!isCurrent(run))return;
   const message=byId.get(row.dataset.message),original=row.querySelector('.staff-bubble > p');
   if(!original||!message||message.redacted||message.author_id===actorId||typeof message.body!=='string'||(message.body.match(/\p{L}/gu)||[]).length<4)continue;
   original.dataset.chatTranslationOriginal='';
   const paint=saved=>{
    const result=saved?.result;
    if(!result||!isCurrent(run)||!row.isConnected)return;
    if(result.needsDownload){
     const button=doc.createElement('button');button.type='button';button.className='text-button chat-translation-action';button.dataset.chatTranslationAttachment='';button.textContent=label(1);
     button.onclick=async()=>{
      if(!isCurrent(run))return;button.disabled=true;
      try{
       const translated=await engine.translate(message.body,target,{source:result.needsDownload,interactive:true,signal:run.signal});
       if(!isCurrent(run))return;
       if(translated?.text){remember(message,target,translated);for(const [id,item] of cache)if(item.result?.needsDownload===result.needsDownload)cache.delete(id);start();}else button.textContent=label(4);
      }catch{if(isCurrent(run))button.textContent=label(4);}
      finally{if(isCurrent(run))button.disabled=false;}
     };
     original.after(button);return;
    }
    const text=doc.createElement('p'),toggle=doc.createElement('button');
    text.dir='auto';text.lang=target;text.textContent=result.text;text.dataset.chatTranslationAttachment='';
    toggle.type='button';toggle.className='text-button chat-translation-action';toggle.dataset.chatTranslationAttachment='';
    const show=translated=>{saved.showOriginal=!translated;original.hidden=translated;text.hidden=!translated;toggle.textContent=label(translated?2:3);};
    show(!saved.showOriginal);toggle.onclick=()=>show(text.hidden);original.after(text,toggle);
   };
   const saved=getCached(message,target);if(saved){paint(saved);continue;}
   try{
    prepared??=engine.prepare(run.signal,{interactive});
    if(!await prepared||!isCurrent(run))return;
    const result=await engine.translate(message.body,target,{signal:run.signal});
    if(!isCurrent(run))return;
    paint(remember(message,target,result));
   }catch{if(!isCurrent(run))return;}
  }
 }
 function start(interactive=false){
  reset();display();
  if(!enabled||disposed||!isActive())return;
  const run=new AbortController();scope=run;
  void render(run,interactive).catch(()=>{if(isCurrent(run)&&interactive)enabledButton.textContent=label(4);});
 }
 enabledButton.onclick=()=>{enabled=!enabled;try{win.localStorage.setItem(preferenceKey,enabled?'1':'0');}catch{}if(!enabled)cache.clear();start(enabled);};
 const off=subscribeLanguage(()=>{display();if(enabled)start();});
 const refresh=()=>start();
 win.addEventListener('languagechange',refresh);
 display();
 return {sync(rows,roomId=null){
  if(room!==roomId){room=roomId;cache.clear();}
  messages=Array.isArray(rows)?rows:[];start();
 },dispose(){
  disposed=true;reset();cache.clear();messages=[];engine.dispose();off();win.removeEventListener('languagechange',refresh);enabledButton.remove();
 }};
}
