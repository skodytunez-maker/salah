// Saved queues report the playback instant, never the later upload date.
// Old clients without timestamps retain their existing RPC until updated.
export function recordedMinuteDay(body,now=Date.now()){
 if(!Object.hasOwn(body,'occurredAt')){if(Object.hasOwn(body,'timeZone'))throw Error('invalid_input');return null;}
 if(!Number.isSafeInteger(body.occurredAt)||body.occurredAt>now+300000||body.occurredAt<now-29*86400000||typeof body.timeZone!=='string'||body.timeZone.length>80)throw Error('invalid_input');
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:body.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(body.occurredAt));
 const part=name=>parts.find(p=>p.type===name)?.value;
 return part('year')+'-'+part('month')+'-'+part('day');
}
