// Set only the owner's public GoatCounter site address. Never put tokens here.
export const ANALYTICS_SITE='https://salah-saadi.goatcounter.com';
export function analyticsSite(value=ANALYTICS_SITE){
 try{const url=new URL(value);if(url.protocol!=='https:'||!/^([a-z0-9]+[a-z0-9-]*)[.]goatcounter[.]com$/.test(url.hostname)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)return null;return url.origin}catch{return null}
}
export function startAnalytics({site=ANALYTICS_SITE,win=window,doc=document,now=Date.now}={}){
 const address=analyticsSite(site);
 if(!address||win.location.hostname!=='skodytunez-maker.github.io'||!win.location.pathname.startsWith('/salah/')||win.navigator.doNotTrack==='1')return false;
 if(doc.getElementById('salah-analytics'))return false;
 win.goatcounter={no_onload:true,no_events:true,path:'/salah/',title:'SALAH',referrer:''};
 const script=doc.createElement('script');script.id='salah-analytics';script.async=true;script.src='https://gc.zgo.at/count.js';script.dataset.goatcounter=address+'/count';script.referrerPolicy='no-referrer';
 let counted=false,hiddenAt=null;
 const count=()=>{if(!doc.hidden&&win.navigator.onLine!==false&&typeof win.goatcounter?.count==='function')try{win.goatcounter.count({path:'/salah/',title:'SALAH',referrer:''});counted=true}catch{}};
 script.onload=count;
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)hiddenAt=now();else{const elapsed=hiddenAt===null?0:now()-hiddenAt;hiddenAt=null;if(!counted||elapsed>=1800000)count()}});
 win.addEventListener('online',()=>{if(!counted)count()});
 doc.head.append(script);return true;
}
