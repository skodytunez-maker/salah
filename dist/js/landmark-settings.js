import{loadLandmark}from'./landmarks.js';
import{settings,updateSettings}from'./storage.js';
import{wallpapers}from'./wallpapers.js';
import{t,getLocale}from './i18n.js';

// Built-in scenes and city wallpapers share one compact, collapsed selector.
export function mountLandmarkSettings(root,onChange=()=>{}){
 const details=root?.querySelector('#wallpaper-picker'),label=root?.querySelector('#wallpaper-name'),select=root?.querySelector('#wallpaper-select'),status=root?.querySelector('#landmark-status');
 if(!details||!label||!select)return ()=>{};
 const face=root.querySelector('#wallpaper-toggle');
 if(face){face.onclick=()=>{details.open=!details.open};details.ontoggle=()=>face.setAttribute('aria-expanded',String(details.open));}
 let entries=[],request=0;
 const current=()=>settings.wallpaper==='landmark'?'landmark:'+settings.landmarkCity:'wallpaper:'+settings.wallpaper;
 function draw(){
  const collator=new Intl.Collator(getLocale(),{sensitivity:'base',numeric:true});
  const choices=[
   {value:'landmark:auto',key:'landmarkUi.myCity',name:t('landmarkUi.myCity')},
   ...[
    ...wallpapers.filter(item=>item.id!=='landmark').map(item=>{const key={mosque:'landmarkUi.mosque','new-york':'landmarkUi.newYork'}[item.id];return{value:'wallpaper:'+item.id,key,name:key?t(key):item.name};}),
    ...entries.map(city=>({value:'landmark:'+city.id,name:city.name}))
   ].sort((a,b)=>collator.compare(a.name,b.name)||a.value.localeCompare(b.value))
  ];
  const value=current();
  if(!choices.some(item=>item.value===value))choices.push({value,key:'landmarkUi.selected',name:t('landmarkUi.selected')});
  select.replaceChildren();
  for(const item of choices){const option=document.createElement('option');option.value=item.value;option.textContent=item.name;if(item.key)option.setAttribute('data-i18n',item.key);select.append(option)}
  select.value=value;
  const chosen=choices.find(item=>item.value===value),key=chosen?.key||(!chosen?'landmarkUi.choose':null);label.textContent=chosen?.name||t('landmarkUi.choose');if(key)label.setAttribute('data-i18n',key);else label.removeAttribute('data-i18n');
 }
 async function refresh(){
  const id=++request;draw();
  try{const value=await loadLandmark.catalogue();if(id!==request||!root.isConnected)return;entries=value;draw();if(status)status.hidden=true}
  catch{if(id!==request||!root.isConnected)return;if(status){status.setAttribute('data-i18n','landmarkUi.offline');status.textContent=t('landmarkUi.offline');status.hidden=false}}
 }
 select.onchange=()=>{
  const value=select.value;
  const city=value.startsWith('landmark:')?value.slice(9):null;
  const wallpaper=value.startsWith('wallpaper:')?value.slice(10):null;
  if(city!==null&&city!=='auto'&&!entries.some(item=>item.id===city)){draw();return}
  if(wallpaper!==null&&!wallpapers.some(item=>item.id===wallpaper&&item.id!=='landmark')){draw();return}
  if(city===null&&wallpaper===null){draw();return}
  const saved=updateSettings(city!==null?{wallpaper:'landmark',landmarkCity:city}:{wallpaper});
  draw();if(saved){onChange();if(status)status.hidden=true}else if(status){status.setAttribute('data-i18n','landmarkUi.saveFailed');status.textContent=t('landmarkUi.saveFailed');status.hidden=false}
 };
 void refresh();return refresh;
}
