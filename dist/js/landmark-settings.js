import{loadLandmark,matchLandmark}from './landmarks.js';
import{settings,updateSettings}from './storage.js';

// One compact selector belongs to the landmark tile, never to prayer location.
export function mountLandmarkSettings(root,onChange=()=>{}){
 const details=root?.querySelector('#landmark-cities'),label=root?.querySelector('#landmark-city-name'),select=root?.querySelector('#landmark-city');
 if(!details||!label||!select)return ()=>{};
 let entries=null,request=0;
 const currentName=()=>settings.landmarkCity==='auto'?(settings.city?.name||'Мой город'):entries?.find(c=>c.id===settings.landmarkCity)?.name||'Выбрать город';
 function draw(){
  details.hidden=settings.wallpaper!=='landmark';
  label.textContent=currentName();
  if(entries){
   select.replaceChildren();
   const option=(value,text)=>{const item=document.createElement('option');item.value=value;item.textContent=text;select.append(item)};
   option('auto','Мой город'+(settings.city?.name?' · '+settings.city.name:''));
   for(const city of entries)option(city.id,city.name);
   if(!entries.some(c=>c.id===settings.landmarkCity)&&settings.landmarkCity!=='auto')option(settings.landmarkCity,'Недоступный город');
   select.value=settings.landmarkCity;select.disabled=false;
   if(settings.landmarkCity==='auto')label.textContent=matchLandmark(settings.city,entries)?.name||currentName();
  }
 }
 async function refresh(){
  draw();if(details.hidden||entries)return;
  const id=++request;
  try{const value=await loadLandmark.catalogue();if(id!==request||!root.isConnected)return;entries=value.length?value:null;draw();if(!entries){select.disabled=true;select.options[0].textContent='Нужен интернет для списка городов'}}catch{if(root.isConnected)select.disabled=true}
 }
 select.onchange=()=>{
  const previous=settings.landmarkCity;
  if(select.value!=='auto'&&!entries?.some(c=>c.id===select.value))return;
  if(!updateSettings({landmarkCity:select.value})){select.value=previous;return}
  draw();onChange();
 };
 details.ontoggle=()=>{if(details.open&&!entries)refresh()};
 refresh();return refresh;
}
