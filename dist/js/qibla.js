import { normalizeAngle, signedAngleDifference, createDirectionTracker } from './qibla-math.js';
import { renderQiblaView } from './qibla-view.js';
import { bearing as qiblaBearing } from './prayers.js';
import { createSensorAccess, createAutomaticSensorAccess } from './qibla-access.js';
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
  let timer=null,frame=null,pending=null,lastPaint=-Infinity,lastEvent=null;
  const idle={phase:'idle',hasHeading:false,error:null,intensity:0,aligned:false,
    instruction:'Определяем направление Киблы',message:'Держите телефон ровно.'};

  function emit(value){if(!disposed)onState({...idle,...value});}
  function clearWatch(){if(timer!==null)env.clearTimer(timer);timer=null;}
  function cancelPaint(){if(frame!==null)env.cancelFrame(frame);frame=null;pending=null;}
  function detachSensor(){sensorOff?.();sensorOff=null;clearWatch();cancelPaint();lastEvent=null;}
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
    lastEvent=event;armWatch(2500);
    if(!sample.level||!sample.accurate){
      tracker.reset();cancelPaint();
      emit({phase:'unreliable',instruction:'Для большей точности держите телефон ровно.',
        message:!sample.accurate?'Датчик не даёт точного направления. Уберите телефон от металлических предметов.':
          'Направление появится, когда телефон будет лежать ровно.'});
      return;
    }
    const value=tracker.update(sample.heading,bearing,env.now());
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
  emit(idle);
  return {enable,stop,destroy,get enabled(){return enabled}};
}

function setText(element,value){if(element&&element.textContent!==value)element.textContent=value;}

export function mountQibla(container,{city,onChooseCity,haptics=()=>true,environment}={}){
  const bearing=qiblaBearing(city?.latitude,city?.longitude);
  const hasCity=Number.isFinite(bearing);
  const declination=hasCity?magneticDeclination(city.latitude,city.longitude):null;
  container.innerHTML=renderQiblaView({cityName:city?.name,bearing,hasCity});
  container.querySelector('#qibla-city')?.addEventListener('click',onChooseCity||(()=>{}));
  if(!hasCity)return {destroy(){}};
  const stage=container.querySelector('#qibla-stage'),instruction=container.querySelector('#qibla-instruction');
  const check=container.querySelector('#qibla-check'),error=container.querySelector('#qibla-error');
  const status=container.querySelector('#sensor-state');
  let rotation=null,compassRotation=null,retryAvailable=false;
  const controller=createCompassController({bearing,declination,environment,onHaptic:()=>{
    if(haptics()&&typeof navigator.vibrate==='function'){try{navigator.vibrate(12);}catch{}}
  },onState:state=>{
    stage.classList.toggle('has-heading',state.hasHeading);
    stage.classList.toggle('is-aligned',state.aligned);
    check.toggleAttribute('hidden',!state.aligned);
    stage.style.setProperty('--qibla-light',state.intensity.toFixed(4));
    if(state.hasHeading){
      rotation=rotation===null?state.signedError:rotation+signedAngleDifference(rotation,state.signedError);
      const north=-state.heading;
      compassRotation=compassRotation===null?north:compassRotation+signedAngleDifference(compassRotation,north);
      stage.style.setProperty('--qibla-rotation',rotation+'deg');
      stage.style.setProperty('--compass-rotation',compassRotation+'deg');
    }else{
      rotation=null;compassRotation=null;
      stage.style.setProperty('--qibla-rotation','0deg');
      stage.style.setProperty('--compass-rotation','0deg');
    }
    setText(instruction,state.instruction);
    setText(error,state.error===null?'—':state.error.toLocaleString('ru-RU',{maximumFractionDigits:1})+'°');
    setText(status,state.message);
    retryAvailable=['permission-required','denied','unavailable'].includes(state.phase);
    stage.classList.toggle('needs-access',retryAvailable);
    stage.toggleAttribute('aria-hidden',!retryAvailable);
    if(retryAvailable){stage.setAttribute('role','button');stage.setAttribute('tabindex','0');stage.setAttribute('aria-label',state.phase==='unavailable'?'Повторить определение направления':'Разрешить датчики компаса');}
    else{stage.removeAttribute('role');stage.removeAttribute('tabindex');stage.removeAttribute('aria-label');}
  }});
  const retry=()=>{if(retryAvailable)controller.enable({retry:true});};
  stage.addEventListener('click',retry);
  stage.addEventListener('keydown',event=>{if(retryAvailable&&['Enter',' '].includes(event.key)){event.preventDefault();retry();}});
  controller.enable();
  return {destroy:()=>controller.destroy(),controller};
}
