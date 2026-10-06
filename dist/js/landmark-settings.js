import{loadLandmark}from'./landmarks.js';
import{settings,updateSettings}from'./storage.js';
import{wallpapers}from'./wallpapers.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const collator=new Intl.Collator('ru',{sensitivity:'base',numeric:true});

// One alphabetized list combines built-in scenes and every landmark wallpaper.
export function mountLandmarkSettings(root,onChange=()=>{}){
 const host=root?.querySelector('#wallpaper-options'),status=root?.querySelector('#landmark-status');
 if(!host)return ()=>{};
 let entries=[],request=0;
 const places=()=>[{id:'auto',name:'Мой город',landmark:'По городу намаза'},...entries.map(city=>({id:city.id,name:city.name,landmark:city.landmark}))];
 const selected=(kind,id)=>kind==='wallpaper'?settings.wallpaper===id:settings.wallpaper==='landmark'&&settings.landmarkCity===id;
 function render(){
  const choices=[
   ...wallpapers.filter(item=>item.id!=='landmark').map(item=>({kind:'wallpaper',id:item.id,name:item.name,landmark:'',image:item.night})),
   ...places().map(city=>({kind:'landmark',id:city.id,name:city.name,landmark:city.landmark,image:'./assets/landmark.svg'}))
  ].sort((a,b)=>collator.compare(a.name,b.name)||a.id.localeCompare(b.id));
  host.innerHTML=choices.map(item=>'<button type="button" data-wallpaper="'+(item.kind==='wallpaper'?esc(item.id):'landmark')+'"'+(item.kind==='landmark'?' data-landmark-city="'+esc(item.id)+'"':'')+' aria-pressed="'+selected(item.kind,item.id)+'"'+(item.landmark?' title="'+esc(item.landmark)+'"':'')+'><img src="'+esc(item.image)+'" alt="" loading="lazy"><span>'+esc(item.name)+'</span></button>').join('');
 }
 async function refresh(){
  const id=++request;render();
  try{const value=await loadLandmark.catalogue();if(id!==request||!root.isConnected)return;entries=value;render();if(status)status.hidden=true}
  catch{if(id!==request||!root.isConnected)return;if(status){status.textContent='Достопримечательности недоступны без интернета.';status.hidden=false}}
 }
 host.onclick=event=>{
  const button=event.target.closest('button[data-wallpaper]');if(!button||!host.contains(button))return;
  const saved=button.hasAttribute('data-landmark-city')
   ?updateSettings({wallpaper:'landmark',landmarkCity:button.dataset.landmarkCity})
   :updateSettings({wallpaper:button.dataset.wallpaper});
  render();onChange();if(!saved&&status){status.textContent='Не удалось сохранить выбор обоев.';status.hidden=false}
 };
 void refresh();return refresh;
}
