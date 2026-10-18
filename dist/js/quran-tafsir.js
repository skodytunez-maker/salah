import{esc,modal}from './ui.js';
import{read,write}from './storage.js';
export const TAFSIR_REVISION='eb82bb6294efe30ad5c135c03b1864afaa70e855';
export const TAFSIR_CACHE='salah-quran-tafsir-v1';
export const TAFSIRS=[
 {id:'saadi',name:'Ас-Саади',folder:'ru-tafseer-al-saddi',source:'https://qul.tarteel.ai/resources/tafsir/170'},
 {id:'ibn-kathir',name:'Ибн Касир',folder:'ru-tafsir-ibne-kahtir',source:'https://qul.tarteel.ai/resources/tafsir/307'}
];
const edition=id=>TAFSIRS.find(row=>row.id===id);
export function tafsirUrls(id,surah,ayah){const e=edition(id);if(!e||!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||ayah>286)throw Error('Неизвестный аят или тафсир');const tail='spa5k/tafsir_api@'+TAFSIR_REVISION+'/tafsir/'+e.folder+'/'+surah+'/'+ayah+'.json';return ['https://cdn.jsdelivr.net/gh/'+tail,'https://raw.githubusercontent.com/spa5k/tafsir_api/'+TAFSIR_REVISION+'/tafsir/'+e.folder+'/'+surah+'/'+ayah+'.json'];}
export function validTafsir(value,surah,ayah){return value?.surah===surah&&value.ayah===ayah&&typeof value.text==='string'&&value.text.trim().length>0&&value.text.length<700000;}
export async function loadTafsir(id,surah,ayah,{signal,fetcher=fetch,cacheStorage=globalThis.caches}={}){
 const urls=tafsirUrls(id,surah,ayah);let cache;
 const parse=async response=>{if(!response?.ok)throw Error('Текст недоступен');const text=await response.text();if(text.length>900000)throw Error('Некорректный текст');const value=JSON.parse(text);if(!validTafsir(value,surah,ayah))throw Error('Тафсир не соответствует аяту');return value;};
 try{cache=await cacheStorage?.open(TAFSIR_CACHE);const saved=await cache?.match(urls[0]);if(saved){const data=await parse(saved);if(signal?.aborted)throw new DOMException('Отменено','AbortError');return data;}}catch(error){if(signal?.aborted)throw error;try{await cache?.delete(urls[0]);}catch{}}
 for(const url of urls){if(signal?.aborted)throw new DOMException('Отменено','AbortError');const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,8000);
  try{const data=await parse(await fetcher(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'}));if(signal?.aborted)throw new DOMException('Отменено','AbortError');try{await cache?.put(urls[0],new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}}));}catch{}return data;}catch(error){if(signal?.aborted)throw error;}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }throw Error('Не удалось загрузить тафсир. Проверьте соединение и повторите.');
}
export function mountTafsir(host,surah,meta,{loader=loadTafsir,open=modal,storage={read,write}}={}){
 let controller=null,closed=false,generation=0,selected=edition(storage.read('quran-tafsir-edition','saadi'))?.id||'saadi';
 const dialog=host.ownerDocument.getElementById('modal');
 const stop=()=>{generation++;controller?.abort();controller=null;};dialog?.addEventListener('close',stop);
 async function show(ayah,id=selected){if(closed||!surah.verses.some(v=>v.ayah===ayah)||!edition(id))return;stop();const ticket=generation;controller=new AbortController();selected=id;storage.write('quran-tafsir-edition',id);
  open('<section class="quran-tafsir" aria-labelledby="tafsir-title"><div class="modal-heading"><div><span class="eyebrow">ТОЛКОВАНИЕ · РУССКИЙ</span><h2 id="tafsir-title">'+esc(meta.name)+' · '+surah.number+':'+ayah+'</h2></div><button class="text-button" data-close aria-label="Закрыть тафсир">Закрыть</button></div><label class="field" for="tafsir-edition">Автор<select id="tafsir-edition">'+TAFSIRS.map(e=>'<option value="'+e.id+'" '+(e.id===id?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label><div class="tafsir-content" id="tafsir-content" role="status">Загружаем толкование…</div><footer class="tafsir-source"><a href="'+edition(id).source+'" target="_blank" rel="noopener noreferrer">Источник: QUL · '+esc(edition(id).name)+'</a><small>Русское издание · данные spa5k/tafsir_api, версия '+TAFSIR_REVISION.slice(0,7)+'. Открытые толкования сохраняются для чтения без интернета.</small></footer><nav class="tafsir-navigation" aria-label="Аяты тафсира"><button class="text-button" id="tafsir-prev" '+(ayah===1?'disabled':'')+'>← Аят '+Math.max(1,ayah-1)+'</button><button class="text-button" id="tafsir-next" '+(ayah===surah.verses.length?'disabled':'')+'>Аят '+Math.min(surah.verses.length,ayah+1)+' →</button></nav></section>');
  if(dialog)dialog.scrollTop=0;const root=host.ownerDocument.querySelector('.quran-tafsir'),body=root.querySelector('#tafsir-content');root.querySelector('#tafsir-edition').onchange=e=>show(ayah,e.target.value);root.querySelector('#tafsir-prev').onclick=()=>show(ayah-1);root.querySelector('#tafsir-next').onclick=()=>show(ayah+1);
  try{const data=await loader(id,surah.number,ayah,{signal:controller.signal});if(closed||ticket!==generation||!root.isConnected)return;body.removeAttribute('role');body.textContent=data.text;}catch(error){if(closed||ticket!==generation||!root.isConnected)return;body.textContent=error.message||'Тафсир недоступен';const retry=host.ownerDocument.createElement('button');retry.type='button';retry.className='button secondary';retry.textContent='Повторить';retry.onclick=()=>show(ayah);body.append(retry);}
 }
 for(const button of host.querySelectorAll('[data-tafsir-ayah]'))button.onclick=()=>show(Number(button.dataset.tafsirAyah));
 return()=>{closed=true;stop();dialog?.removeEventListener('close',stop);};
}
