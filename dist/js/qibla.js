import{mountQiblaMap}from './qibla-map.js';
import { normalizeAngle, createCompassPresentation, createDirectionTracker } from './qibla-math.js';
import { renderQiblaView } from './qibla-view.js';
import { bearing as qiblaBearing } from './prayers.js';
import { createSensorAccess, createAutomaticSensorAccess, createQiblaLocationController } from './qibla-access.js';
import { magneticDeclination } from './geomagnetism.js';

export const SENSOR_ACCESS_MESSAGE='Для определения направления Киблы требуется доступ к датчикам устройства.';

let sensorAccess;
function sessionAccess(){return sensorAccess||(sensorAccess=createSensorAccess(window.DeviceOrientationEvent));}
// Ask within the click or swipe that opens Qibla, before changing the hash.
export function prepareQiblaAccess(){sessionAccess().request().catch(()=>{});}
export function initQiblaAccess(options={}){
  if(window.isSecureContext===false||typeof window.DeviceOrientationEvent==='undefined')return ()=>{};
  return createAutomaticSensorAccess({access:sessionAccess(),target:document,...options});
}

// Only earth-referenced readings can establish a compass direction.
// With a level screen, absolute alpha runs opposite to compass heading.
export function orientationSample(event,screenAngle=0,declination=0){
  if(!Number.isFinite(declination))return null;
  let heading=null;
  if(Number.isFinite(event.webkitCompassHeading)&&event.webkitCompassHeading>=0&&event.webkitCompassHeading<=360)heading=event.webkitCompassHeading;
  else if(event.absolute===true&&Number.isFinite(event.alpha)&&event.alpha>=0&&event.alpha<=360)heading=360-event.alpha;
  if(heading===null)return null;
  const angle=Number.isFinite(screenAngle)?screenAngle:0;
  const level=Number.isFinite(event.beta)&&Number.isFinite(event.gamma)&&Math.abs(event.beta)<=35&&Math.abs(event.gamma)<=35;
  const accuracy=event.webkitCompassAccuracy;
  const accurate=!Number.isFinite(accuracy)||(accuracy>=0&&accuracy<=25);
  return {heading:normalizeAngle(heading+angle+declination),level,accurate};
}

export function browserSensorEnvironment(){
  return {
    supported:()=>window.isSecureContext!==false&&typeof window.DeviceOrientationEvent!=='undefined',
    requestPermission:options=>sessionAccess().request(options),
    subscribe:listener=>{
      window.addEventListener('deviceorientationabsolute',listener);
      window.addEventListener('deviceorientation',listener);
      return ()=>{
        window.removeEventListener('deviceorientationabsolute',listener);
        window.removeEventListener('deviceorientation',listener);
      };
    },
    watchVisibility:listener=>{
      document.addEventListener('visibilitychange',listener);
      return ()=>document.removeEventListener('visibilitychange',listener);
    },
    watchScreen:listener=>{
      screen.orientation?.addEventListener?.('change',listener);
      window.addEventListener('orientationchange',listener);
      return ()=>{
        screen.orientation?.removeEventListener?.('change',listener);
        window.removeEventListener('orientationchange',listener);
      };
    },
    screenAngle:()=>Number.isFinite(screen.orientation?.angle)?screen.orientation.angle:
      Number.isFinite(window.orientation)?window.orientation:0,
    visible:()=>!document.hidden,
    now:()=>performance.now(),
    setTimer:(fn,ms)=>window.setTimeout(fn,ms),
    clearTimer:id=>window.clearTimeout(id),
    requestFrame:fn=>window.requestAnimationFrame(fn),
    cancelFrame:id=>window.cancelAnimationFrame(id)
  };
}

export function createCompassController({bearing,declination=0,onState,onHaptic=()=>{},environment=browserSensorEnvironment()}){
  const env=environment,tracker=createDirectionTracker();
  let enabled=false,disposed=false,generation=0,sensorOff=null,visibilityOff=null,screenOff=null;
  let timer=null,frame=null,pending=null,lastPaint=-Infinity,recovering=false,reliableSince=null,unreliableReason=null;
  const idle={phase:'idle',hasHeading:false,error:null,intensity:0,aligned:false,
    instruction:'Определяем направление Киблы',message:'Держите телефон ровно.'};

  function emit(value){if(!disposed)onState({...idle,...value});}
  function clearWatch(){if(timer!==null)env.clearTimer(timer);timer=null;}
  function cancelPaint(){if(frame!==null)env.cancelFrame(frame);frame=null;pending=null;}
  function detachSensor(){sensorOff?.();sensorOff=null;clearWatch();cancelPaint();recovering=false;reliableSince=null;unreliableReason=null;}
  function detachAll(){detachSensor();visibilityOff?.();visibilityOff=null;screenOff?.();screenOff=null;}

  function noData(){
    if(!enabled||disposed)return;
    enabled=false;detachAll();
    emit({phase:'unavailable',instruction:'Компас не передаёт направление',message:Number.isFinite(declination)?SENSOR_ACCESS_MESSAGE:'Магнитная поправка для этого места или даты недоступна.'});
  }
  function armWatch(delay){clearWatch();timer=env.setTimer(noData,delay);}
  function paint(time){
    frame=null;
    if(!pending||!enabled||disposed)return;
    if(time-lastPaint<32){frame=env.requestFrame(paint);return;}
    lastPaint=time;
    const value=pending;pending=null;emit(value);
  }
  function onSensor(event){
    if(!enabled||disposed||!env.visible())return;
    const sample=orientationSample(event,env.screenAngle(),declination);
    if(!sample)return;
    armWatch(2500);
    if(!sample.level||!sample.accurate){
      if(!recovering){tracker.reset({rearmHaptic:false});cancelPaint();}
      recovering=true;reliableSince=null;
      const reason=sample.accurate?'tilt':'accuracy';
      if(reason!==unreliableReason){
        unreliableReason=reason;
        emit({phase:'unreliable',instruction:'Для большей точности держите телефон ровно.',
          message:!sample.accurate?'Датчик не даёт точного направления. Уберите телефон от металлических предметов.':
            'Направление появится, когда телефон будет лежать ровно.'});
      }
      return;
    }
    const now=env.now();
    // Require a brief steady interval after tilting instead of flashing the
    // found state each time a noisy sensor crosses its reliability threshold.
    if(recovering){
      if(reliableSince===null)reliableSince=now;
      if(now-reliableSince<160)return;
      recovering=false;reliableSince=null;unreliableReason=null;
    }
    const value=tracker.update(sample.heading,bearing,now);
    if(!value)return;
    if(value.haptic){try{onHaptic();}catch{}}
    const instruction=value.aligned?'Направление Киблы найдено':value.error<10?
      'Вы почти на правильном направлении':value.error<30?
      (value.signedError>0?'Поверните немного правее':'Поверните немного левее'):
      (value.signedError>0?'Поверните правее':'Поверните левее');
    pending={...value,phase:'active',hasHeading:true,instruction,message:'Держите телефон ровно.'};
    if(frame===null)frame=env.requestFrame(paint);
  }
  function attachSensor(){
    if(!enabled||disposed||sensorOff)return;
    emit({phase:'waiting',instruction:'Ожидаем направление телефона',message:'Держите телефон ровно.'});
    sensorOff=env.subscribe(onSensor);armWatch(5000);
  }
  function visibilityChanged(){
    if(!enabled)return;
    if(!env.visible()){
      detachSensor();tracker.reset();lastPaint=-Infinity;
      emit({phase:'paused',instruction:'Компас приостановлен',message:'Вернитесь на экран для определения направления.'});
    }else attachSensor();
  }
  async function enable(options){
    if(disposed)return;
    const token=++generation;
    enabled=false;detachAll();tracker.reset();lastPaint=-Infinity;
    if(!env.supported()){
      emit({phase:'unavailable',instruction:'Компас недоступен',message:SENSOR_ACCESS_MESSAGE});return;
    }
    emit({phase:'permission',instruction:'Запрашиваем доступ к датчикам',message:SENSOR_ACCESS_MESSAGE});
    try{
      const result=await env.requestPermission(options);
      if(disposed||token!==generation)return;
      if(result!=='granted'){
        emit({phase:'denied',instruction:'Разрешите доступ к компасу',
          message:'Доступ к датчикам не разрешён. Включите его в настройках браузера и попробуйте снова.'});return;
      }
      enabled=true;
      visibilityOff=env.watchVisibility(visibilityChanged);
      screenOff=env.watchScreen(()=>{if(enabled&&env.visible()){cancelPaint();tracker.reset();lastPaint=-Infinity;emit({phase:'waiting',instruction:'Ожидаем направление телефона',message:'Держите телефон ровно.'});}});
      if(env.visible())attachSensor();
      else emit({phase:'paused',instruction:'Компас приостановлен'});
    }catch(error){
      if(disposed||token!==generation)return;
      enabled=false;detachAll();
      emit({phase:error?.name==='NotAllowedError'?'permission-required':'denied',instruction:error?.name==='NotAllowedError'?'Коснитесь компаса':'Разрешите доступ к компасу',
        message:error?.name==='NotAllowedError'?'При первом использовании iPhone запросит разрешение на датчики.':
          'Доступ к датчикам не разрешён. Проверьте настройки браузера и коснитесь компаса для повтора.'});
    }
  }
  function stop(){++generation;enabled=false;detachAll();tracker.reset();emit(idle);}
  function destroy(){disposed=true;stop();}
  function setTarget(nextBearing,nextDeclination=0){
    if(disposed||!Number.isFinite(nextBearing))return false;
    bearing=normalizeAngle(nextBearing);declination=nextDeclination;
    cancelPaint();tracker.reset({rearmHaptic:false});lastPaint=-Infinity;
    if(enabled&&env.visible())emit({phase:'waiting',instruction:'Ожидаем направление телефона',message:'Держите телефон ровно.'});
    return true;
  }
  emit(idle);
  return {enable,stop,destroy,setTarget,get enabled(){return enabled}};
}

function setText(element,value){if(element&&element.textContent!==value)element.textContent=value;}

export function mountQibla(container,{city,onChooseCity,haptics=()=>true,environment,createLocation=createQiblaLocationController,locationOptions={},mountMap=mountQiblaMap}={}){
  const cityBearing=qiblaBearing(city?.latitude,city?.longitude),hasCity=Number.isFinite(cityBearing),doc=container.ownerDocument;
  container.innerHTML=renderQiblaView({cityName:city?.name,bearing:cityBearing,hasCity});
  const chooseCity=container.querySelector('#qibla-city');chooseCity?.addEventListener('click',onChooseCity||(()=>{}));
  let controller=null,mapHandle=null,disposed=false,devicePosition=null,lastTarget=null;
  const mapToggle=container.querySelector('#qibla-map-toggle'),compassPanel=container.querySelector('#qibla-compass-panel'),mapPanel=container.querySelector('#qibla-map-panel');
  const stage=container.querySelector('#qibla-stage'),instruction=container.querySelector('#qibla-instruction'),check=container.querySelector('#qibla-check'),error=container.querySelector('#qibla-error'),status=container.querySelector('#sensor-state');
  const locationLabel=container.querySelector('.qibla-location'),locationStatus=container.querySelector('#qibla-location-state'),locate=container.querySelector('#qibla-locate'),bearingLabel=container.querySelector('.qibla-bearing');
  const presentation=createCompassPresentation();let retryAvailable=false;
  const alive=()=>!disposed&&stage.isConnected&&container.querySelector('#qibla-stage')===stage;
  const sensorState=state=>{
    if(!alive())return;
    stage.classList.toggle('has-heading',state.hasHeading);
    stage.classList.toggle('is-aligned',state.aligned);
    check.toggleAttribute('hidden',!state.aligned);
    stage.style.setProperty('--qibla-light',state.intensity.toFixed(4));
    const rotation=presentation.update(state);
    if(rotation){
      stage.style.setProperty('--qibla-rotation',rotation.target+'deg');
      stage.style.setProperty('--compass-rotation',rotation.north+'deg');
    }
    setText(instruction,state.instruction);
    setText(error,state.error===null?'—':state.error.toLocaleString('ru-RU',{maximumFractionDigits:1})+'°');
    setText(status,state.message);
    retryAvailable=['permission-required','denied','unavailable'].includes(state.phase);
    stage.classList.toggle('needs-access',retryAvailable);
    stage.toggleAttribute('aria-hidden',!retryAvailable);
    if(retryAvailable){stage.setAttribute('role','button');stage.setAttribute('tabindex','0');stage.setAttribute('aria-label',state.phase==='unavailable'?'Повторить определение направления':'Разрешить датчики компаса');}
    else{stage.removeAttribute('role');stage.removeAttribute('tabindex');stage.removeAttribute('aria-label');}
  };
  function target(point){
    const bearing=qiblaBearing(point?.latitude,point?.longitude);
    setText(bearingLabel,Number.isFinite(bearing)?Math.round(bearing)%360+'°':'—');
    if(!Number.isFinite(bearing)){controller?.destroy();controller=null;lastTarget=null;retryAvailable=false;stage.classList.remove('has-heading','is-aligned','needs-access');stage.setAttribute('aria-hidden','true');for(const name of ['role','tabindex','aria-label'])stage.removeAttribute(name);check.hidden=true;setText(error,'—');setText(instruction,Number.isFinite(point?.latitude)?'Направление для этой точки не определено':'Определите место или выберите город');setText(status,'Направление появится после определения места.');return;}
    const declination=magneticDeclination(point.latitude,point.longitude),signature=[bearing,declination].join(':');
    if(signature===lastTarget)return;lastTarget=signature;presentation.retarget();
    if(controller)controller.setTarget(bearing,declination);
    else controller=createCompassController({bearing,declination,environment,onState:sensorState,onHaptic:()=>{if(haptics()&&typeof navigator.vibrate==='function'){try{navigator.vibrate(12);}catch{}}}});
    if(mapPanel.hidden&&!controller.enabled)void controller.enable();
  }
  function fallbackLabel(){return hasCity?'Центр выбранного города: '+city.name:'Текущее место не определено';}
  const location=createLocation({...locationOptions,onState:state=>{
    if(!alive())return;
    if(locate)locate.disabled=state.phase==='locating'||state.error?.restricted===true;
    if(state.phase==='locating'){setText(locationStatus,'Определяем текущее местоположение…');return;}
    devicePosition=state.phase==='position'?state.position:null;
    if(devicePosition){
      const metres=devicePosition.coords.accuracy,known=Number.isFinite(metres)&&metres>0,poor=known&&metres>100;
      setText(locationLabel,state.error?'Последнее определённое местоположение':poor?'Приблизительное местоположение устройства':'Ваше местоположение');
      setText(locationStatus,(known?'Точность устройства ±'+Math.ceil(metres)+' м. ':'Точность устройства не указана. ')+(state.error||poor?'Нажмите «Моё место», чтобы уточнить.':'Точка используется только в этом разделе.'));
      if(chooseCity)chooseCity.hidden=true;
      target(devicePosition.coords);mapHandle?.setPosition?.(devicePosition);
    }else{
      setText(locationLabel,fallbackLabel());if(chooseCity)chooseCity.hidden=hasCity;
      const reason=state.error?.restricted?'Определение места недоступно в этом режиме.':state.error?.code===1?'Доступ к местоположению закрыт.':state.error?.code===3?'Не удалось получить свежую точку вовремя.':'Не удалось определить текущее место.';
      setText(locationStatus,reason+' '+(hasCity?'Показан расчёт от центра выбранного города.':'Выберите город для приблизительного расчёта.')+(state.error?.restricted?'':' Можно повторить кнопкой «Моё место».'));
      target(hasCity?city:null);mapHandle?.setPosition?.(null);
    }
  }});
  const startLocation=()=>{if(alive()&&!doc.hidden)void location.start().catch(()=>{});};
  if(locate)locate.onclick=startLocation;
  if(mapToggle)mapToggle.onclick=()=>{
    if(!alive())return;const show=mapPanel.hidden;mapPanel.hidden=!show;compassPanel.hidden=show;mapToggle.dataset.mode=show?'map':'compass';mapToggle.setAttribute('aria-pressed',String(show));mapToggle.setAttribute('aria-label',show?'Вернуться к компасу':'Открыть карту Киблы');mapToggle.querySelector('span').textContent=show?'Компас':'Карта';
    if(show){controller?.stop();mapHandle=mountMap(mapPanel,{city,position:devicePosition,getPosition:()=>location.retry()});}
    else{mapHandle?.destroy();mapHandle=null;void controller?.enable({retry:true});}
  };
  const retry=()=>{if(retryAvailable)void controller?.enable({retry:true});};
  stage.addEventListener('click',retry);
  stage.addEventListener('keydown',event=>{if(retryAvailable&&['Enter',' '].includes(event.key)){event.preventDefault();retry();}});
  const visibility=()=>{if(doc.hidden)location.stop();else startLocation();};doc.addEventListener('visibilitychange',visibility);
  setText(locationLabel,fallbackLabel());target(hasCity?city:null);startLocation();
  return {get controller(){return controller;},destroy(){if(disposed)return;disposed=true;doc.removeEventListener('visibilitychange',visibility);location.destroy();mapHandle?.destroy();controller?.destroy();}};
}
