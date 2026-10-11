// AirPlay needs a URL the receiver can fetch; a phone-local blob is not one.
const alternatives=new WeakMap();
export function clearMediaOutputSources(media){for(const source of alternatives.get(media)||[])source.remove?.();alternatives.delete(media);}
export function prepareMediaOutput(media,remoteUrl,{networkAllowed=true,doc=globalThis.document}={}){
 if(!media)return false;media.setAttribute?.('x-webkit-airplay','allow');
 const local=media.src||'';if(!local.startsWith('blob:')||!networkAllowed||globalThis.navigator?.onLine===false)return false;
 let url;try{url=new URL(remoteUrl);if(url.protocol!=='https:')return false;}catch{return false;}
 if(!doc?.createElement||typeof media.append!=='function'||typeof media.removeAttribute!=='function')return false;
 const cached=doc.createElement('source'),remote=doc.createElement('source');cached.type=remote.type='audio/mpeg';cached.src=local;remote.src=url.href;
 clearMediaOutputSources(media);media.removeAttribute('src');media.append(cached,remote);alternatives.set(media,[cached,remote]);return true;
}
export function requestMediaOutput(media){
 const source=media?.currentSrc||media?.src||alternatives.get(media)?.[0]?.src;
 if(!media||!source)return Promise.resolve({status:'no-media'});
 const airplay=typeof media.webkitShowPlaybackTargetPicker==='function',remote=typeof media.remote?.prompt==='function';
 if(!airplay&&!remote)return Promise.resolve({status:'unavailable'});
 if(source.startsWith('blob:')&&!alternatives.has(media))return Promise.resolve({status:'local-media'});
 const failure=error=>({status:error?.name==='AbortError'?'cancelled':['NotFoundError','NotSupportedError'].includes(error?.name)?'unavailable':error?.name==='NotAllowedError'?'denied':'unavailable'});
 try{
  if(airplay){media.webkitShowPlaybackTargetPicker();return Promise.resolve({status:'picker',kind:'airplay'});}
  return Promise.resolve(media.remote.prompt()).then(()=>({status:media.remote.state==='connected'?'connected':'picker',kind:'remote'})).catch(failure);
 }catch(error){return Promise.resolve(failure(error));}
}
