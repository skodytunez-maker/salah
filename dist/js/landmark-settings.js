import{loadLandmark}from'./landmarks.js';
import{settings,updateSettings}from'./storage.js';
import{wallpapers}from'./wallpapers.js';

const collator=new Intl.Collator('ru',{sensitivity:'base',numeric:true});

// Built-in scenes and city wallpapers share one compact, collapsed selector.
export function mountLandmarkSettings(root,onChange=()=>{}){
 const details=root?.querySelector('#wallpaper-picker'),label=root?.querySelector('#wallpaper-name'),select=root?.querySelector('#wallpaper-select'),status=root?.querySelector('#landmark-status');
 if(!details||!label||!select)return ()=>{};
 let entries=[],request=0;
 const current=()=>settings.wallpaper==='landmark'?'landmark:'+settings.landmarkCity:'wallpaper:'+settings.wallpaper;
 function draw(){
  const choices=[
   ...wallpapers.filter(item=>item.id!=='landmark').map(item=>({value:'wallpaper:'+item.id,name:item.name})),
   {value:'landmark:auto',name:'Мой город'},
   ...entries.map(city=>({value:'landmark:'+city.id,name:city.name}))
  ].sort((a,b)=>collator.compare(a.name,b.name)||a.value.localeCompare(b.value));
  const value=current();
  if(!choices.some(item=>item.value===value))choices.push({value,name:'Выбранные обои'});
  select.replaceChildren();
  for(const item of choices){const option=document.createElement('option');option.value=item.value;option.textContent=item.name;select.append(option)}
  select.value=value;
  label.textContent=choices.find(item=>item.value===value)?.name||'Выбрать';
 }
 async function refresh(){
  const id=++request;draw();
  try{const value=await loadLandmark.catalogue();if(id!==request||!root.isConnected)return;entries=value;draw();if(status)status.hidden=true}
  catch{if(id!==request||!root.isConnected)return;if(status){status.textContent='Список городов недоступен без интернета.';status.hidden=false}}
 }
 select.onchange=()=>{
  const value=select.value;
  const city=value.startsWith('landmark:')?value.slice(9):null;
  const wallpaper=value.startsWith('wallpaper:')?value.slice(10):null;
  if(city!==null&&city!=='auto'&&!entries.some(item=>item.id===city)){draw();return}
  if(wallpaper!==null&&!wallpapers.some(item=>item.id===wallpaper&&item.id!=='landmark')){draw();return}
  if(city===null&&wallpaper===null){draw();return}
  const saved=updateSettings(city!==null?{wallpaper:'landmark',landmarkCity:city}:{wallpaper});
  draw();if(saved){onChange();if(status)status.hidden=true}else if(status){status.textContent='Не удалось сохранить выбор обоев.';status.hidden=false}
 };
 void refresh();return refresh;
}
