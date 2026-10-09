export function nativeReminderTarget(value){
 if(value?.kind==='adhkar')return value.key==='morning'||value.key==='evening'?'#adhkar?group='+value.key:'#adhkar';
 return value?.kind==='dhikr'?'#adhkar':'#home';
}
export function connectNativeReminderNavigation(plugin,{navigate=target=>{globalThis.location.hash=target}}={}){
 let destroyed=false,handle=null;
 if(typeof plugin?.addListener==='function')Promise.resolve(plugin.addListener('openReminder',value=>{if(!destroyed)navigate(nativeReminderTarget(value))})).then(async value=>{if(destroyed)await value?.remove?.();else handle=value;}).catch(()=>{});
 return {destroy(){destroyed=true;Promise.resolve(handle?.remove?.()).catch(()=>{});}};
}
