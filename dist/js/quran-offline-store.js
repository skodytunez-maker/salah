export const AUDIO_CACHE='salah-quran-audio-v1';
export const AUDIO_DATABASE='salah-quran-offline-v1';
const goodBlob=blob=>blob&&blob.size>0&&typeof blob.type==='string'&&blob.type.startsWith('audio/');
export function completeAudioResponse(response){return response?.status===200&&response.type!=='opaque'&&!response.headers.has('Content-Range')&&response.headers.get('Content-Type')?.toLowerCase().startsWith('audio/');}
export function createOfflineAudioStore({idb=typeof indexedDB==='undefined'?null:indexedDB,cacheStorage=typeof caches==='undefined'?null:caches,baseUrl=typeof location==='undefined'?'https://salah.invalid/':location.href}={}){
 let connection=null;
 const metadataUrl=new URL('./__quran_offline_recordings__.json',baseUrl).href;
 async function database(){
  if(!idb)return null;
  if(!connection)connection=new Promise((resolve,reject)=>{
   let request;try{request=idb.open(AUDIO_DATABASE,1);}catch(error){reject(error);return;}
   request.onupgradeneeded=()=>{const db=request.result;for(const name of ['audio','recordings'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:name==='audio'?'url':'id'});};
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
   request.onerror=()=>reject(request.error||Error('Офлайн-хранилище недоступно'));
   request.onblocked=()=>reject(Error('Закройте другие вкладки SALAH и повторите'));
  }).catch(()=>{connection=null;return null;});
  return connection;
 }
 async function cache(){if(!cacheStorage)return null;try{return await cacheStorage.open(AUDIO_CACHE);}catch{return null;}}
 function readRequest(db,name,method,value){return new Promise((resolve,reject)=>{const transaction=db.transaction(name,'readonly'),request=value===undefined?transaction.objectStore(name)[method]():transaction.objectStore(name)[method](value);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);transaction.onabort=()=>reject(transaction.error||Error('Хранилище недоступно'));});}
 function writeTransaction(db,names,work){return new Promise((resolve,reject)=>{const tx=db.transaction(names,'readwrite');tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('Не удалось сохранить запись'));try{work(tx);}catch(error){try{tx.abort();}catch{}reject(error);}});}
 async function cacheRecords(){const c=await cache();if(!c)return [];const response=await c.match(metadataUrl);if(!response)return [];try{const list=await response.json();return Array.isArray(list)?list:[];}catch{return [];}}
 const validRecord=value=>value&&typeof value.id==='string'&&typeof value.reciter==='string'&&Number.isInteger(value.surah)&&value.surah>=1&&value.surah<=114&&Array.isArray(value.urls)&&value.urls.length>0&&value.urls.length<=286&&value.urls.every(url=>typeof url==='string')&&Number.isFinite(value.bytes)&&value.bytes>0;
 async function audioKeys(){const db=await database(),keys=db?await readRequest(db,'audio','getAllKeys'):[];const c=await cache();if(c)for(const request of await c.keys())if(request.url!==metadataUrl)keys.push(request.url);return new Set(keys);}
 return {
  async getAudio(url){
   const db=await database();if(db){const saved=await readRequest(db,'audio','get',url);if(goodBlob(saved?.blob))return saved.blob;}
   const c=await cache();if(!c)return null;const response=await c.match(url);if(!completeAudioResponse(response))return null;const blob=await response.blob();return goodBlob(blob)?blob:null;
  },
  async putAudio(url,blob){
   if(!goodBlob(blob))throw Error('Неполная аудиозапись');
   const db=await database();if(db){await writeTransaction(db,['audio'],tx=>tx.objectStore('audio').put({url,blob}));return;}
   const c=await cache();if(!c)throw Error('Офлайн-хранилище недоступно');await c.put(url,new Response(blob,{headers:{'Content-Type':blob.type}}));
  },
  async saveRecording(value){
   if(!validRecord(value))throw Error('Неполная запись суры');
   const db=await database();if(db){await writeTransaction(db,['recordings'],tx=>tx.objectStore('recordings').put(value));return;}
   const c=await cache();if(!c)throw Error('Офлайн-хранилище недоступно');const previous=await cacheRecords();await c.put(metadataUrl,new Response(JSON.stringify([...previous.filter(item=>item.id!==value.id),value]),{headers:{'Content-Type':'application/json'}}));
  },
  async listRecordings(reciter){
   const db=await database(),records=db?await readRequest(db,'recordings','getAll'):await cacheRecords(),keys=await audioKeys();
   return records.filter(value=>validRecord(value)&&(!reciter||value.reciter===reciter)&&value.urls.every(url=>keys.has(url))).sort((a,b)=>a.surah-b.surah);
  },
  async clearAll(){const db=await database();if(db)await writeTransaction(db,['audio','recordings'],tx=>{tx.objectStore('audio').clear();tx.objectStore('recordings').clear();});if(cacheStorage)try{await cacheStorage.delete(AUDIO_CACHE);}catch{}},
  async removeRecording(record){
   if(!validRecord(record))throw Error('Неизвестная запись');
   const db=await database();if(db)await writeTransaction(db,['audio','recordings'],tx=>{for(const url of record.urls)tx.objectStore('audio').delete(url);tx.objectStore('recordings').delete(record.id);});
   const c=await cache();if(c){await Promise.all(record.urls.map(url=>c.delete(url)));const records=await cacheRecords();await c.put(metadataUrl,new Response(JSON.stringify(records.filter(item=>item.id!==record.id)),{headers:{'Content-Type':'application/json'}}));}
  }
 };
}
export const offlineAudioStore=createOfflineAudioStore();
