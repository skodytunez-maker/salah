import{combinedPublicBoard}from './guest-board.mjs';
// A short, bounded per-isolate cache coalesces simultaneous public viewers.
// Each cached response keeps the original SQL revision; time never adds credit.
export function createLiveBoardLoader({now=()=>performance.now(),ttl=750}={}){
 const cache=new Map(),pending=new Map();
 return async(sql,period,day,mode)=>{
  const key=day+':'+period+':'+mode,saved=cache.get(key);
  if(saved&&now()-saved.at<Math.min(1000,Math.max(0,ttl)))return saved.value;
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{const board=await combinedPublicBoard(sql,period,day,{},mode==='total',{thin:true});
   if(board.items.length>1000||board.items.some(row=>row.reciters.length>128))throw Error('live_resource_limit');
   const value={day,period,mode,revision:board.revision,listeningTotal:board.listeningTotal,limited:board.limited,items:board.items};
   if(new TextEncoder().encode(JSON.stringify(value)).byteLength>524288)throw Error('live_resource_limit');
   cache.set(key,{at:now(),value});while(cache.size>24)cache.delete(cache.keys().next().value);return value;})();
  pending.set(key,task);try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}
 };
}
