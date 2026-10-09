// Lock-screen controls are optional; the HTML audio remains the playback source.
const actions=['play','pause','stop','seekto','seekbackward','seekforward','previoustrack','nexttrack'];
export function createMediaSession({nav=globalThis.navigator,Metadata=globalThis.MediaMetadata}={}){
 const session=nav?.mediaSession;let owned=null,key='';
 function clear(){if(session&&owned&&session.metadata===owned){for(const action of actions)try{session.setActionHandler(action,null)}catch{}try{session.playbackState='none';session.setPositionState?.();session.metadata=null}catch{}}owned=null;key='';}
 function update(info,controls){if(!session)return;if(!info||info.status==='stopped'){clear();return;}
  const active=['loading','playing'].includes(info.status);if(!active&&(!owned||session.metadata!==owned))return;
  const nextKey=JSON.stringify([info.title,info.artist,info.artwork]);
  if(!owned||session.metadata!==owned||key!==nextKey){try{owned=Metadata?new Metadata({title:info.title,artist:info.artist,album:'SALAH',artwork:info.artwork?[{src:info.artwork}]:[]}):{title:info.title,artist:info.artist};session.metadata=owned;key=nextKey;}catch{return}}
  for(const action of actions)try{session.setActionHandler(action,controls[action]||null)}catch{}
  try{session.playbackState=info.status==='playing'?'playing':'paused';const duration=info.duration,position=info.position;if(Number.isFinite(duration)&&duration>0&&Number.isFinite(position))session.setPositionState?.({duration,position:Math.max(0,Math.min(position,duration)),playbackRate:1});else session.setPositionState?.();}catch{}
 }
 return{update,clear};
}
