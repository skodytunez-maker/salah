// Direct streams are published by Quran.tv; no YouTube audio is extracted.
export const BROADCAST_STREAMS=Object.freeze({
 makkah:'https://cdn-globecast.akamaized.net/live/eds/saudi_quran/hls_roku/index.m3u8',
 madinah:'https://cdn-globecast.akamaized.net/live/eds/saudi_sunnah/hls_roku/index.m3u8'
});
export function createBroadcastAudio({doc=document,win=window,onState=()=>{},loadHls=()=>import('./vendor/hls-light.min.js').then(()=>win.Hls)}={}){
 let media=null,hls=null,token=0,status='idle',channel=null,wantPlay=false,ownedMetadata=null;
 const session=win.navigator?.mediaSession;
 const emit=value=>{status=value;if(session&&ownedMetadata&&session.metadata===ownedMetadata)session.playbackState=value==='playing'?'playing':'paused';onState({status,channel:channel?.id})};
 function release(){token++;wantPlay=false;hls?.destroy();hls=null;if(media){for(const key of ['onplaying','onpause','onerror','onwaiting'])media[key]=null;media.pause();media.removeAttribute('src');media.load();media.remove();media=null}}
 function metadata(info){
  if(!session)return;
  try{ownedMetadata=new win.MediaMetadata({title:'Прямой эфир · '+info.name,artist:info.place,album:'SALAH',artwork:[{src:new URL('../icon-512.png',import.meta.url).href,sizes:'512x512',type:'image/png'}]});session.metadata=ownedMetadata;session.setActionHandler('play',resume);session.setActionHandler('pause',pause);session.setActionHandler('stop',stop)}catch{}
 }
 function fail(id){if(id!==token)return;release();emit('error')}
 function play(id){if(id!==token||!media||!wantPlay)return;Promise.resolve(media.play()).catch(error=>{if(id===token&&wantPlay&&error.name!=='AbortError')fail(id)})}
 function start(info){
  if(!BROADCAST_STREAMS[info?.id])return null;
  release();channel=info;wantPlay=true;const id=token;media=doc.createElement('audio');media.preload='none';media.setAttribute('aria-label','Аудиотрансляция · '+info.name);media.setAttribute('playsinline','');
  media.onplaying=()=>{if(id===token)emit('playing')};media.onpause=()=>{if(id===token){wantPlay=false;hls?.stopLoad();emit('paused')}};media.onwaiting=()=>{if(id===token&&wantPlay)emit('loading')};media.onerror=()=>fail(id);metadata(info);emit('loading');
  if(media.canPlayType('application/vnd.apple.mpegurl')){media.src=BROADCAST_STREAMS[info.id];play(id)}
  else loadHls().then(Hls=>{if(id!==token)return;if(!Hls.isSupported())throw Error('HLS unsupported');hls=new Hls({enableWorker:false,startLevel:0,maxBufferLength:30,maxMaxBufferLength:60,backBufferLength:0});hls.on(Hls.Events.MANIFEST_PARSED,()=>play(id));hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)fail(id)});hls.attachMedia(media);hls.loadSource(BROADCAST_STREAMS[info.id])}).catch(()=>fail(id));
  return media;
 }
 function pause(){if(!media)return;wantPlay=false;media.pause();hls?.stopLoad();emit('paused')}
 function resume(){if(!media){if(channel)start(channel);return}wantPlay=true;emit('loading');hls?.startLoad(-1);if(hls&&Number.isFinite(hls.liveSyncPosition))media.currentTime=hls.liveSyncPosition;play(token)}
 function toggle(){if(wantPlay)pause();else resume()}
 function stop(){release();channel=null;if(session&&ownedMetadata&&session.metadata===ownedMetadata){for(const action of ['play','pause','stop'])try{session.setActionHandler(action,null)}catch{}session.metadata=null;session.playbackState='none'}ownedMetadata=null;emit('idle')}
 return{start,pause,resume,toggle,stop,get element(){return media},get state(){return{status,channel:channel?.id||null}}};
}
