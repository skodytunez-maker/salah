export function requestMediaOutput(media){
 if(!media||!media.src)return Promise.resolve({status:'no-media'});
 const failure=error=>({status:error?.name==='AbortError'?'cancelled':['NotFoundError','NotSupportedError'].includes(error?.name)?'unavailable':error?.name==='NotAllowedError'?'denied':'unavailable'});
 try{
  if(typeof media.webkitShowPlaybackTargetPicker==='function'){media.webkitShowPlaybackTargetPicker();return Promise.resolve({status:'picker',kind:'airplay'});}
  if(typeof media.remote?.prompt==='function')return Promise.resolve(media.remote.prompt()).then(()=>({status:media.remote.state==='connected'?'connected':'picker',kind:'remote'})).catch(failure);
  return Promise.resolve({status:'unavailable'});
 }catch(error){return Promise.resolve(failure(error));}
}
