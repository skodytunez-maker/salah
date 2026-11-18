// Shared only by chat logs. Media decoding must not pull a reader out of history.
export function followMessageTail(log,{win=log?.ownerDocument?.defaultView||globalThis.window,onFollowingChange=()=>{}}={}){
 let following=true,disposed=false,frame=0;
 const atBottom=()=>log.scrollHeight-log.clientHeight-log.scrollTop<70;
 const paint=()=>{frame=0;if(!disposed&&following&&log.isConnected)log.scrollTop=log.scrollHeight;};
 const scroll=()=>{following=atBottom();onFollowingChange(following);};
 const media=()=>{if(!disposed&&following){log.scrollTop=log.scrollHeight;if(!frame&&win?.requestAnimationFrame)frame=win.requestAnimationFrame(paint);}};
 log.addEventListener('scroll',scroll,{passive:true});log.addEventListener('load',media,true);
 return{openLatest(){if(disposed)return;following=true;onFollowingChange(true);media();},isFollowing:()=>following,dispose(){disposed=true;if(frame)win?.cancelAnimationFrame?.(frame);frame=0;log.removeEventListener('scroll',scroll);log.removeEventListener('load',media,true);}};
}
