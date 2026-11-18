import{settingsSectionLabel}from './settings-section-label.js';
import {standardReminderPreferences} from './notification-invite.js';
import {readDhikrActivity,dhikrAllowedAt} from './dhikr-reminder.js';
import{setForegroundAudio}from './audio-focus.js';
import {createPushReminders} from './push-reminders.js';
import {createNativeBackgroundReminders} from './native-background-reminders.js';
import {commonBeforeMinutes,withBeforeMinutes} from './reminder-before.js';
import {buildReminderEvents,createReminderTracker,normalizeReminders,reminderDefaults,PRAYER_KEYS,PRAYER_NAMES,BEFORE_MINUTES} from './reminder-events.js';
import {esc,setUiMessage,setUiAttribute} from './ui.js';
import {getLanguage,t,subscribeLanguage,translateUi} from './i18n.js';
import {notice,noticeText,noticeMarkup,noticeLeaf,noticeAttr,noticeAttrs} from './notification-ui.js';
import {reminderNotificationText} from './notification-language.js';
export {normalizeReminders};
export const defaults=reminderDefaults;

const AUDIO={
  mansour:{name:'Мансур аз-Захрани',src:'./assets/audio/adhan-mansour.mp3'},
  mishary:{name:'Мишари Рашид аль-Афаси',src:'./assets/audio/adhan-mishary.mp3'},
  fajr:{name:'Мансур аз-Захрани · Фаджр',src:'./assets/audio/adhan-mansour-fajr.mp3'}
};
const SEEN_KEY='salah:reminder-events:v1';
const checked=value=>value?' checked':'';
const disabled=value=>value?' disabled':'';

function readSeen(){try{return JSON.parse(localStorage.getItem(SEEN_KEY)||'{}');}catch{return {};}}
function writeSeen(value){try{localStorage.setItem(SEEN_KEY,JSON.stringify(value));}catch{}}
function notificationAvailable(){return typeof Notification!=='undefined'&&globalThis.isSecureContext===true&&!!globalThis.navigator?.serviceWorker;}

// IndexedDB's unique key also prevents duplicate playback across tabs on
// browsers without Web Locks. The local ledger remains the reload fallback.
let claimsDatabase;
function openClaimsDatabase(){
  if(claimsDatabase)return claimsDatabase;
  claimsDatabase=new Promise(resolve=>{
    if(!globalThis.indexedDB){resolve(null);return;}
    let finished=false;
    const done=value=>{if(!finished){finished=true;clearTimeout(timeout);resolve(value);}else value?.close();};
    const timeout=setTimeout(()=>done(null),2500);
    try{
      const request=indexedDB.open('salah-reminder-claims',1);
      request.onupgradeneeded=()=>{const store=request.result.createObjectStore('delivered',{keyPath:'id'});store.createIndex('at','at');};
      request.onsuccess=()=>done(request.result);
      request.onerror=()=>done(null);
      request.onblocked=()=>done(null);
    }catch{done(null);}
  });
  return claimsDatabase;
}

async function claimEvent(event,now){
  const db=await openClaimsDatabase();
  if(!db)return true;
  return new Promise(resolve=>{
    let duplicate=false;
    try{
      const transaction=db.transaction('delivered','readwrite'),store=transaction.objectStore('delivered');
      const request=store.add({id:event.id,at:event.at});
      request.onerror=()=>{duplicate=request.error?.name==='ConstraintError';};
      if(globalThis.IDBKeyRange){
        const cursor=store.index('at').openCursor(IDBKeyRange.upperBound(now-7*86400000));
        cursor.onsuccess=()=>{const entry=cursor.result;if(entry){entry.delete();entry.continue();}};
      }
      transaction.oncomplete=()=>resolve(true);
      transaction.onabort=()=>resolve(!duplicate);
      transaction.onerror=()=>{};
    }catch{resolve(true);}
  });
}

export function createReminders({getSettings,updateSettings,getContext,toast=()=>{},onChange=()=>{}}){
  const audioOwner={};
  const background=createNativeBackgroundReminders({getSettings,getContext,toast})||createPushReminders({getSettings,toast});
  const tracker=createReminderTracker({read:readSeen,write:writeSeen});
  const audio=typeof Audio==='function'?new Audio():null;
  if(audio)audio.preload='none';
  let mounted=null,jumuahMounted=null,tahajjudMounted=null,player=null,status='',soundReady=false,generation=0,destroyed=false,ticking=false,contextIdentity=null,playAttempt=0,currentTrack=null;
  const preferences=()=>normalizeReminders(getSettings()?.reminders);
  const paintLanguage=()=>{
    for(const root of [mounted,jumuahMounted,tahajjudMounted,player])if(root?.isConnected)translateUi(root);
    for(const key of PRAYER_KEYS){const prayer=t('home.'+key.toLowerCase());for(const[field,label]of [['at','prayerStart'],['before','prayerBefore'],['adhan','prayerAdhan']])setUiAttribute(mounted?.querySelector('[data-reminder-control="'+key+'-'+field+'"]'),'aria-label','notifyUi.'+label,{prayer});}
  };
  const stopLanguage=subscribeLanguage(paintLanguage);

  const say=message=>{if(!destroyed)toast(noticeText(message));};

  function ensurePlayer(){
    if(player||typeof document==='undefined')return player;
    player=document.createElement('aside');
    player.className='reminder-player';player.hidden=true;
    player.setAttribute('data-i18n-aria-label','notifyUi.adhan');player.setAttribute('aria-label',t('notifyUi.adhan'));player.setAttribute('role','region');
    player.innerHTML='<span class="reminder-player-copy"></span><button type="button" class="reminder-player-play" hidden>'+noticeLeaf('listen')+'</button><button type="button" class="reminder-player-stop" '+noticeAttr('stopAdhan')+'>✕</button>';
    player.querySelector('.reminder-player-stop').onclick=stopAudio;
    player.querySelector('.reminder-player-play').onclick=()=>playTrack(currentTrack,true);
    document.body.append(player);return player;
  }

  function showPlayer(text,needsTap=false){
    const el=ensurePlayer();if(!el)return;
    setUiMessage(el.querySelector('.reminder-player-copy'),text);
    el.querySelector('.reminder-player-play').hidden=!needsTap;
    el.hidden=false;
  }

  function stopAudio(){
    setForegroundAudio(audioOwner,false);playAttempt++;
    if(audio){audio.pause();try{audio.currentTime=0;}catch{}}
    if(player)player.hidden=true;
  }

  function selectedTrack(fajr=false){return fajr?AUDIO.fajr:AUDIO[preferences().voice];}

  async function playTrack(track,manual=false){
    if(!track||destroyed)return;
    currentTrack=track;
    if(!audio){status=notice('audioUnsupported');draw();say(status);return;}
    if(!manual&&!soundReady){showPlayer(notice('adhanTrack',{name:track.name}),true);return;}
    const attempt=++playAttempt;
    audio.pause();
    audio.src=new URL(track.src,document.baseURI).href;
    audio.currentTime=0;
    showPlayer(notice('adhanTrack',{name:track.name}));
    try{
      // Call play before awaiting anything so a preview keeps the user gesture.
      setForegroundAudio(audioOwner,true);const playing=audio.play();if(playing?.then)await playing;
      if(attempt!==playAttempt||destroyed)return;
      soundReady=true;status=notice('soundChecked');draw();
    }catch(error){
      if(attempt!==playAttempt||destroyed)return;
      setForegroundAudio(audioOwner,false);const blocked=error?.name==='NotAllowedError';
      if(blocked)soundReady=false;
      status=blocked?notice('tapListen'):notice('audioFailed');
      showPlayer(notice('adhanTrack',{name:track.name}),true);draw();say(status);
    }
  }

  if(audio){
    audio.addEventListener('ended',()=>{setForegroundAudio(audioOwner,false);if(player)player.hidden=true;});
    audio.addEventListener('error',()=>{
      setForegroundAudio(audioOwner,false);
      if(!currentTrack||destroyed||!player||player.hidden)return;
      status=notice('recordingUnavailable');
      showPlayer(notice('adhanTrack',{name:currentTrack.name}),true);draw();
    });
  }

  async function systemNotification(event){
    const token=generation;
    if(background.active()||!preferences().browserNotifications||!notificationAvailable()||Notification.permission!=='granted')return;
    try{
      const registration=await navigator.serviceWorker.getRegistration();
      if(!registration?.active||destroyed||token!==generation||document.visibilityState!=='visible'||Date.now()-event.at>60000)return;
      if(event.kind==='dhikr'&&!dhikrAllowedAt(Date.now(),event.timeZone))return;
      const hash=Array.from(event.id).reduce((value,char)=>Math.imul(value^char.charCodeAt(0),16777619)>>>0,2166136261).toString(36);
      await registration.showNotification('SALAH',{body:reminderNotificationText(event,getLanguage()),tag:'salah-reminder-'+hash,icon:'./icon-192.png',badge:'./icon-192.png',timestamp:event.at,renotify:false,data:{url:['adhkar','dhikr'].includes(event.kind)?'#adhkar':'#home',eventId:event.id}});
    }catch{}
  }

  function reset(){generation++;contextIdentity=null;tracker.reset();stopAudio();}
  function visibilityChanged(){tracker.reset();generation++;}
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibilityChanged);

  function tick(now=Date.now()){
    if(destroyed||ticking)return;
    if(typeof document!=='undefined'&&document.visibilityState!=='visible'){tracker.reset();return;}
    const setting=getSettings()||{},config=normalizeReminders(setting.reminders);
    const context=getContext()||{};
    void background.nativeSync?.();
    const identity=JSON.stringify([context.cityKey,config]);
    if(contextIdentity!==identity){contextIdentity=identity;tracker.reset();generation++;}
    const events=buildReminderEvents(config,{...context,dhikrLastAt:readDhikrActivity(),cityKey:setting.city?context.cityKey:null,timeZone:context.timeZone||setting.city?.timezone});
    const token=generation;
    ticking=true;
    const run=async()=>{
      if(destroyed||token!==generation||document.visibilityState!=='visible')return;
      if(Date.now()<now||Date.now()-now>65000){tracker.reset();return;}
      const due=tracker.tick(now,events);
      for(const event of due){
        if(!await claimEvent(event,now))continue;
        if(destroyed||token!==generation||document.visibilityState!=='visible'||getContext()?.cityKey!==context.cityKey||Date.now()<now||Date.now()-event.at>60000)continue;
        if(event.kind==='dhikr'&&!dhikrAllowedAt(Date.now(),event.timeZone))continue;
        say(reminderNotificationText(event,getLanguage()));
        systemNotification(event);
        if(event.adhan&&!background.nativeAudioActive?.())playTrack(selectedTrack(event.key==='Fajr'));
      }
    };
    let task;
    try{task=navigator.locks?.request?navigator.locks.request('salah-reminder-delivery',run):run();}
    catch{task=run();}
    Promise.resolve(task).catch(()=>{}).finally(()=>{ticking=false;});
  }

  function save(value){
    const saved=updateSettings({reminders:normalizeReminders(value)});if(!saved)say(notice('saveFailed'));
    Promise.resolve(onChange()).catch(()=>{});
    tracker.reset();generation++;contextIdentity=null;
    draw();drawJumuah();drawTahajjud();return saved;
  }

  function drawTahajjud(){
    if(!tahajjudMounted?.isConnected||destroyed)return;
    const p=preferences(),focused=tahajjudMounted.contains(document.activeElement);
    tahajjudMounted.innerHTML='<label class="switch-row" for="tahajjud-reminder"><span>'+noticeLeaf('tahajjudEnable')+'</span><input id="tahajjud-reminder" type="checkbox"'+checked(p.tahajjud.enabled)+disabled(!p.enabled)+'></label>'+(!p.enabled?'<p class="reminder-notice">'+noticeLeaf('enableBelow')+'</p>':'');
    const control=tahajjudMounted.querySelector('input');
    control.onchange=()=>{const next=preferences();next.tahajjud.enabled=control.checked;save(next);};
    if(focused)control.focus({preventScroll:true});
  }

  function drawJumuah(){
    if(!jumuahMounted?.isConnected||destroyed)return;
    const p=preferences(),focused=jumuahMounted.contains(document.activeElement);
    jumuahMounted.innerHTML='<label class="switch-row" for="jumuah-enabled"><span>'+noticeLeaf('everyFriday')+'</span><input id="jumuah-enabled" type="checkbox" '+noticeAttr('jumuahEnable')+''+checked(p.jumuah.enabled)+disabled(!p.enabled)+'></label><p class="reminder-voice-note">'+noticeLeaf('cityTime')+'</p>'+(!p.enabled?'<p class="reminder-notice">'+noticeLeaf('enableSection')+'</p>':'');
    const control=jumuahMounted.querySelector('input');
    control.onchange=()=>{const next=preferences();next.jumuah.enabled=control.checked;save(next);};
    if(focused)control.focus({preventScroll:true});
  }

  function draw(){
    if(!mounted?.isConnected||destroyed)return;
    const oldFocus=mounted.contains(document.activeElement)?document.activeElement.dataset.reminderControl:null;
    const jumuahSection=jumuahMounted?.isConnected?jumuahMounted.closest('details'):null;
    const opened=Array.from(mounted.querySelectorAll('details[open]')).map(element=>element.className);
    const p=preferences(),commonBefore=commonBeforeMinutes(p),canNotify=notificationAvailable(),permission=canNotify?Notification.permission:'unavailable';
    const available=!!getSettings()?.city;
    mounted.innerHTML='<div class="reminder-heading"><div><h2>'+noticeLeaf('title')+'</h2><p class="reminder-subtitle">'+noticeLeaf('subtitle')+'</p></div><label class="reminder-switch"><input type="checkbox" data-reminder-control="enabled"'+checked(p.enabled)+' '+noticeAttr('enable')+'><span aria-hidden="true"></span></label></div>'+
      (!available?'<p class="reminder-notice">'+noticeLeaf('chooseCity')+'</p>':'')+
      '<div class="reminder-body"'+(!p.enabled?' data-muted="true"':'')+'><label class="field reminder-before-all">'+noticeLeaf('beforePrayer')+'<select data-reminder-control="all-before"'+disabled(!p.enabled)+' '+noticeAttr('beforeEach')+'>'+(commonBefore===null?'<option value="custom" selected disabled '+noticeAttrs('perPrayer')+'>'+esc(t('notifyUi.perPrayer'))+'</option>':'')+BEFORE_MINUTES.map(n=>'<option value="'+n+'"'+(commonBefore===n?' selected':'')+' '+noticeAttrs(n?'minutesBefore':'noAdvance',n?{minutes:n}:{})+'>'+esc(t(n?'notifyUi.minutesBefore':'notifyUi.noAdvance',n?{minutes:n}:{}))+'</option>').join('')+'</select></label><div class="reminder-columns" aria-hidden="true"><span>'+noticeLeaf('prayer')+'</span><span>'+noticeLeaf('atStart')+'</span><span>'+noticeLeaf('advance')+'</span><span>'+noticeLeaf('adhan')+'</span></div><div class="reminder-prayers">'+PRAYER_KEYS.map(key=>{
        const row=p.prayers[key];
        return '<div class="reminder-prayer-row"><span data-i18n="home.'+key.toLowerCase()+'">'+esc(t('home.'+key.toLowerCase()))+'</span><label class="reminder-check"><input type="checkbox" data-reminder-control="'+key+'-at"'+checked(row.atTime)+disabled(!p.enabled)+' '+noticeAttr('prayerStart',{prayer:t('home.'+key.toLowerCase())})+'><span aria-hidden="true"></span></label><select data-reminder-control="'+key+'-before"'+disabled(!p.enabled)+' '+noticeAttr('prayerBefore',{prayer:t('home.'+key.toLowerCase())})+'>'+BEFORE_MINUTES.map(minutes=>'<option value="'+minutes+'"'+(minutes===row.beforeMinutes?' selected':'')+' '+noticeAttrs(minutes?'minutes':'none',minutes?{minutes}:{})+'>'+esc(t(minutes?'notifyUi.minutes':'notifyUi.none',minutes?{minutes}:{}))+'</option>').join('')+'</select><label class="reminder-check"><input type="checkbox" data-reminder-control="'+key+'-adhan"'+checked(row.adhan)+disabled(!p.enabled||!row.atTime)+' '+noticeAttr('prayerAdhan',{prayer:t('home.'+key.toLowerCase())})+'><span aria-hidden="true"></span></label></div>';
      }).join('')+'</div><div class="reminder-voice"><label for="reminder-voice">'+noticeLeaf('voice')+'</label><select id="reminder-voice" data-reminder-control="voice">'+['mansour','mishary'].map(key=>'<option value="'+key+'"'+(key===p.voice?' selected':'')+'>'+AUDIO[key].name+'</option>').join('')+'</select><p class="reminder-voice-note">'+noticeLeaf('fajrRecording')+'</p><div class="reminder-preview"><button type="button" data-reminder-preview="ordinary">'+noticeLeaf('listen')+'</button><button type="button" data-reminder-preview="fajr"><span data-i18n="home.fajr">'+esc(t('home.fajr'))+'</span></button></div><p class="reminder-status" role="status">'+noticeMarkup(status||notice('checkSound'))+'</p></div><details class="reminder-adhkar settings-subsection"><summary>'+settingsSectionLabel('adhkar',noticeLeaf('adhkarTitle'))+'</summary>'+['morning','evening'].map(key=>'<div class="reminder-adhkar-row"><label><input type="checkbox" data-reminder-control="'+key+'-enabled"'+checked(p.adhkar[key].enabled)+disabled(!p.enabled)+'> '+noticeLeaf(key==='morning'?'morning':'evening')+'</label><select data-reminder-control="'+key+'-mode"'+disabled(!p.enabled||!p.adhkar[key].enabled)+' '+noticeAttr(key==='morning'?'morningWhen':'eveningWhen')+'><option value="prayer"'+(p.adhkar[key].mode==='prayer'?' selected':'')+' '+noticeAttrs(key==='morning'?'withFajr':'withMaghrib')+'>'+esc(t(key==='morning'?'notifyUi.withFajr':'notifyUi.withMaghrib'))+'</option><option value="time"'+(p.adhkar[key].mode==='time'?' selected':'')+' '+noticeAttrs('manual')+'>'+esc(t('notifyUi.manual'))+'</option></select>'+(p.adhkar[key].mode==='time'?'<input type="time" data-reminder-control="'+key+'-time" value="'+p.adhkar[key].time+'"'+disabled(!p.enabled||!p.adhkar[key].enabled)+' '+noticeAttr(key==='morning'?'morningTime':'eveningTime')+'>':'')+'</div>').join('')+'<p class="reminder-voice-note">'+noticeLeaf('cityTime')+'</p></details><details class="reminder-dhikr settings-subsection"><summary>'+settingsSectionLabel('dhikr',noticeLeaf('dhikrTitle'))+'</summary><label class="switch-row"><span>'+noticeLeaf('switchOn')+'</span><input type="checkbox" data-reminder-control="dhikr-enabled"'+checked(p.dhikr.enabled)+disabled(!p.enabled)+'></label><p class="reminder-voice-note">'+noticeLeaf('dailyDescription')+'</p></details><div data-jumuah-slot></div></div>'+
      '<section class="reminder-background settings-subsection" data-push-settings></section><details class="reminder-help settings-subsection"><summary>'+settingsSectionLabel('sound',noticeLeaf(background.nativeSync?'sound':'iphoneSound'))+'</summary>'+(background.nativeAudioActive?.()?'<p>'+noticeLeaf('nativeAdhan')+'</p>':'<p>'+noticeLeaf('foregroundHelp')+'</p>')+''+(background.nativeSync?'':'<p>'+noticeLeaf('iphoneHelp')+'</p>')+''+(background.nativeSync?'<p>'+noticeLeaf('nativeRecordings')+'</p>':'<p>'+noticeLeaf('webRecordings')+'</p>')+'<div class="reminder-notification">'+(background.nativeSync?'':canNotify?(permission==='granted'?'<label><input type="checkbox" data-reminder-control="browserNotifications"'+checked(p.browserNotifications)+'> '+noticeLeaf('foregroundNotifications')+'</label>':permission==='denied'?'<p>'+noticeLeaf('permissionOff')+'</p>':'<button type="button" data-reminder-permission>'+noticeLeaf('allowNotifications')+'</button><p>'+noticeLeaf('permissionAfterTap')+'</p>'):'<p>'+noticeLeaf('safariHelp')+'</p>')+'</div><p class="reminder-source">'+noticeLeaf('recordings')+' <a href="https://aladhan.com/play" target="_blank" rel="noopener noreferrer">AlAdhan / Islamic Network</a>. <a href="https://community.islamic.network/d/232-request-to-use-your-adhan-audio-in-a-non-commercial-islamic-app" target="_blank" rel="noopener noreferrer">'+noticeLeaf('recordingPermission')+'</a></p></details>';

    if(jumuahSection)mounted.querySelector('[data-jumuah-slot]').append(jumuahSection);
    background.mount(mounted.querySelector('[data-push-settings]'));
    mounted.querySelectorAll('[data-reminder-control]').forEach(control=>control.addEventListener('change',()=>{
      const next=preferences(),key=control.dataset.reminderControl;
      if(key==='enabled')next.enabled=control.checked;
      else if(key==='all-before'){save(withBeforeMinutes(next,Number(control.value)));return;}
      else if(key==='voice'){next.voice=control.value;stopAudio();}
      else if(key==='dhikr-enabled'){next.dhikr.enabled=control.checked;next.dhikr.since=control.checked?Date.now():0;}
      else if(key==='browserNotifications')next.browserNotifications=control.checked&&Notification.permission==='granted';
      else{
        const prayer=PRAYER_KEYS.find(name=>key.startsWith(name+'-'));
        if(prayer){
          const field=key.slice(prayer.length+1);
          if(field==='at')next.prayers[prayer].atTime=control.checked;
          if(field==='before')next.prayers[prayer].beforeMinutes=Number(control.value);
          if(field==='adhan')next.prayers[prayer].adhan=control.checked;
        }else{
          const section=key.startsWith('morning-')?'morning':'evening';
          if(key.endsWith('-enabled'))next.adhkar[section].enabled=control.checked;
          else if(key.endsWith('-mode'))next.adhkar[section].mode=control.value==='time'?'time':'prayer';
          else if(validTime(control.value))next.adhkar[section].time=control.value;
        }
      }
      if(!next.enabled)stopAudio();save(next);
    }));
    mounted.querySelectorAll('[data-reminder-preview]').forEach(button=>button.onclick=()=>playTrack(selectedTrack(button.dataset.reminderPreview==='fajr'),true));
    const permissionButton=mounted.querySelector('[data-reminder-permission]');
    if(permissionButton)permissionButton.onclick=async()=>{
      let result;
      try{result=await Notification.requestPermission();}catch{result='default';}
      if(destroyed)return;
      if(result==='granted'){const next=preferences();next.browserNotifications=true;save(next);say(notice('permissionGranted'));}
      else{status=result==='denied'?notice('permissionDenied'):notice('permissionMissing');draw();}
    };
    for(const name of opened)mounted.querySelector('details.'+name)?.setAttribute('open','');
    if(oldFocus)mounted.querySelector('[data-reminder-control="'+oldFocus+'"]')?.focus({preventScroll:true});
  }

  function mountSettings(container){mounted=container;draw();}
  function mountTahajjud(container){tahajjudMounted=container;drawTahajjud();}
  function mountJumuah(container){jumuahMounted=container;if(container)mounted?.querySelector('[data-jumuah-slot]')?.append(container.closest('details'));drawJumuah();}
  function destroy(){stopLanguage();destroyed=true;generation++;tracker.reset();stopAudio();if(audio){audio.removeAttribute('src');audio.load();}player?.remove();player=null;mounted=null;jumuahMounted=null;tahajjudMounted=null;document.removeEventListener('visibilitychange',visibilityChanged);background.destroy?.();}
  return {mountSettings,mountJumuah,mountTahajjud,tick,reset,destroy,invitationState:background.invitationState,enableStandard({allowDisabled=false}={}){
   const access=background.invitationState();
   if(!access.supported||access.permission==='denied'||!getSettings().city)return {ready:false,message:noticeText(notice('openDeviceSettings')),messageUi:notice('openDeviceSettings')};
   if(access.hasDevice||(getSettings().reminders!==undefined&&!preferences().enabled&&!allowDisabled))return {ready:false,message:noticeText(notice('alreadyChosen')),messageUi:notice('alreadyChosen')};
   if((getSettings().reminders===undefined||(allowDisabled&&!preferences().enabled))&&!save(standardReminderPreferences(getSettings().reminders)))return {ready:false,message:noticeText(notice('saveBeforeConnect')),messageUi:notice('saveBeforeConnect')};
   return background.enable();
  }};
}

function validTime(value){return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);}
