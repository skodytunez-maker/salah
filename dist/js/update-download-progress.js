// Public shell progress only. No account, location, settings or listening payloads.
export function validUpdateProgress(value,currentVersion){
 if(!value||value.type!=='SALAH_UPDATE_PROGRESS'||value.schema!==1||!Number.isSafeInteger(value.version)||value.version<=currentVersion||!Number.isSafeInteger(value.sequence)||value.sequence<1||!['loading','ready','failed'].includes(value.stage))return null;
 const {loaded,total,completedFiles,totalFiles}=value;
 if(![loaded,total,completedFiles,totalFiles].every(Number.isSafeInteger)||total<=0||total>1024*1024*1024||loaded<0||loaded>total||totalFiles<1||totalFiles>10000||completedFiles<0||completedFiles>totalFiles)return null;
 if(value.stage==='ready'&&(loaded!==total||completedFiles!==totalFiles))return null;
 return {version:value.version,sequence:value.sequence,stage:value.stage,loaded,total,completedFiles,totalFiles};
}
export function updatePercent(value){return value.stage==='ready'?100:Math.min(99,Math.floor(value.loaded/value.total*100));}
export function createUpdateDownloadProgress({t,subscribeLanguage,serviceWorker,currentVersion,doc=globalThis.document,now=()=>Date.now(),Channel=globalThis.MessageChannel}={}){
 let box=null,title=null,detail=null,bar=null,close=null,worker=null,last=null,offLanguage=null,port=null,requestTimer=null,listener=false,hidden=false,samples=[],sequence=0;
 const remove=()=>{box?.remove();box=null;offLanguage?.();offLanguage=null;};
 const paint=()=>{
  if(!box)return;const measured=last&&last.stage!=='failed',key=last?.stage==='failed'?'pwaUi.downloadFailed':last?.stage==='ready'?'pwaUi.downloadReady':'pwaUi.downloading';
  title.textContent=t(key);bar.hidden=false;bar.removeAttribute('aria-valuenow');bar.removeAttribute('value');detail.textContent='';
  close.setAttribute('aria-label',t('pwaUi.closeUpdate'));bar.setAttribute('aria-label',t('pwaUi.downloading'));
  if(measured){const percent=updatePercent(last);bar.value=percent;bar.setAttribute('aria-valuenow',String(percent));detail.textContent=t('pwaUi.downloadPercent',{percent});
   if(last.stage==='loading'&&samples.length>=3){const first=samples[0],end=samples.at(-1),elapsed=end.at-first.at,bytes=end.loaded-first.loaded;
    if(elapsed>=3000&&bytes>0&&now()-end.at<8000){const seconds=(last.total-last.loaded)/(bytes/elapsed)*.001;
     if(Number.isFinite(seconds)&&seconds>=1&&seconds<86400)detail.textContent+=' · '+(seconds<60?t('pwaUi.downloadSeconds',{count:Math.max(1,Math.ceil(seconds/5)*5)}):t('pwaUi.downloadMinutes',{count:Math.ceil(seconds/60)}));
    }
   }
  }else if(last?.stage==='failed')bar.hidden=true;
 };
 const ensure=()=>{if(box||hidden)return;box=doc.createElement('aside');box.className='app-download-progress';box.setAttribute('aria-label',t('pwaUi.updateLabel'));
  const copy=doc.createElement('div');copy.className='app-download-copy';title=doc.createElement('strong');title.setAttribute('role','status');detail=doc.createElement('span');bar=doc.createElement('progress');bar.max=100;bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
  close=doc.createElement('button');close.type='button';close.textContent='×';close.onclick=()=>{hidden=true;remove();};copy.append(title,detail,bar);box.append(copy,close);doc.body.append(box);offLanguage=subscribeLanguage?.(paint);paint();
 };
 const accept=value=>{const safe=validUpdateProgress(value,currentVersion);if(!safe||safe.sequence<=sequence||last&&(safe.version!==last.version||safe.loaded<last.loaded||last.stage!=='loading'))return;
  sequence=safe.sequence;last=safe;const at=now();samples.push({at,loaded:safe.loaded});while(samples.length>2&&samples[1].at<at-10000)samples.shift();if(samples.length>80)samples.splice(0,samples.length-80);paint();
 };
 const message=event=>{if(worker&&event.source===worker)accept(event.data);};
 const stopRequest=()=>{clearTimeout(requestTimer);requestTimer=null;if(port){port.onmessage=null;port.close();port=null;}};
 const track=next=>{if(!next||next===worker)return;worker=next;last=null;sequence=0;samples=[];stopRequest();if(!listener){serviceWorker?.addEventListener?.('message',message);listener=true;}
  try{const channel=new Channel();port=channel.port1;const expected=next;port.onmessage=event=>{if(worker===expected)accept(event.data);stopRequest();};requestTimer=setTimeout(stopRequest,1600);next.postMessage({type:'SALAH_UPDATE_PROGRESS_REQUEST'},[channel.port2]);}catch{stopRequest();}paint();
 };
 const finish=()=>{remove();stopRequest();if(listener)serviceWorker?.removeEventListener?.('message',message);listener=false;worker=null;last=null;sequence=0;samples=[];hidden=false;};
 return {start(next=null){hidden=false;ensure();if(next)track(next);},track(next){if(box||hidden)track(next);},finish};
}
