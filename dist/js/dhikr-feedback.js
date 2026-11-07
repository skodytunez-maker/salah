// A quiet click is optional and never owns Media Session or interrupts Quran audio.
export function createDhikrFeedback({read,write,haptic=()=>true,environment=()=>globalThis,onError=()=>{}}){
 let context=null,epoch=0;
 const env=()=>environment();
 const soundOn=()=>read('dhikr-sound',false)===true;
 const vibrationOn=()=>read('dhikr-vibration',haptic())===true;
 const supportsSound=()=>!!(env().AudioContext||env().webkitAudioContext);
 const supportsVibration=()=>typeof env().navigator?.vibrate==='function';
 function stop(){
  epoch++;const previous=context;context=null;
  try{previous?.close()?.catch?.(()=>{});}catch{}
 }
 function prepare(){
  const started=Date.now(),version=epoch;
  if(soundOn()&&supportsSound()&&env().document?.visibilityState!=='hidden'){
   try{if(!context||context.state==='closed'){const Context=env().AudioContext||env().webkitAudioContext;context=new Context();}
    if(context.state!=='running')context.resume()?.catch?.(()=>{});
   }catch{}
  }
  // Saving a count may be asynchronous. Never replay queued clicks on returning.
  return (complete=false)=>{
   if(version!==epoch||Date.now()-started>300||env().document?.visibilityState==='hidden')return;
   if(vibrationOn()&&supportsVibration())try{env().navigator.vibrate(complete?20:8);}catch{}
   if(!soundOn()||context?.state!=='running')return;
   try{
    const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(complete?880:660,now);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.035,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+.045);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    oscillator.start(now);oscillator.stop(now+.05);
   }catch{}
  };
 }
 function markup(){
  const audio=supportsSound(),vibration=supportsVibration();
  return '<div class="dhikr-feedback-options" role="group" aria-label="Отклик счётчика"><label><input id="dhikr-feedback-sound" type="checkbox" '+(soundOn()&&audio?'checked ':'')+(audio?'':'disabled ')+'> Звук нажатия</label><label><input id="dhikr-feedback-vibration" type="checkbox" '+(vibrationOn()&&vibration?'checked ':'')+(vibration?'':'disabled ')+'> Вибрация</label>'+(vibration?'':'<p class="muted">Вибрация недоступна в этом браузере.</p>')+'</div>';
 }
 function bind(host){
  for(const [id,key]of [['sound','dhikr-sound'],['vibration','dhikr-vibration']]){
   const control=host.querySelector('#dhikr-feedback-'+id);if(!control)continue;
   control.onchange=()=>{let saved=false;try{saved=write(key,control.checked)===true;}catch{}
    if(!saved){control.checked=id==='sound'?soundOn():vibrationOn();onError();return;}
    if(id==='sound'&&!control.checked)stop();
    if(control.checked)prepare()();
   };
  }
 }
 return{markup,bind,prepare,stop};
}
