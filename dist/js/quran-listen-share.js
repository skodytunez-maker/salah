import{personalDataAllowed}from './audience.js';
import{esc,toast,modal,closeModal}from './ui.js';
import{mountQrScanner,stopQrScanner}from './qr-scanner.js';
import{quranPlayback}from './quran-session.js';
import{reciterInfo}from './quran-reciters.js';
import{reciterRecording}from './quran-reciter-recording.js';
import{listeningShareUrl,parseListeningShare,parseListeningQr,listeningTime}from './quran-listen-share-core.js';
import{t,translateUi,subscribeLanguage}from './i18n.js';
const place=p=>t(reciterInfo(p.reciter).format==='verse'?'shareUi.versePlace':'shareUi.surahPlace',{ayah:p.ayah,time:listeningTime(p.seconds)});
const leaf=(key,tag='span',attrs='')=>'<'+tag+' data-i18n="'+key+'"'+attrs+'>'+esc(t(key))+'</'+tag+'>';
// Modals share one host. Release the local language listener on close or replacement.
function followModal(root,anchor,paint){
 const dialog=document.getElementById('modal');let alive=true,observer;
 const stop=()=>{if(!alive)return;alive=false;off();observer?.disconnect();dialog?.removeEventListener('close',stop);};
 const off=subscribeLanguage(()=>{if(!root.contains(anchor)){stop();return;}paint();});
 if(typeof MutationObserver==='function'){observer=new MutationObserver(()=>{if(!root.contains(anchor))stop();});observer.observe(root,{childList:true});}
 dialog?.addEventListener('close',stop,{once:true});return stop;
}
export function showListeningShare(){
 const state=quranPlayback.state;if(!state.surah||!['playing','paused'].includes(state.status)){toast(t('shareUi.startFirst'));return;}
 const position={surah:state.surah.number,reciter:state.reciter,ayah:state.ayah||state.index+1||1,seconds:state.positionSeconds||0};
 let url;try{url=listeningShareUrl(position)}catch{toast(t('shareUi.saveFailed'));return;}
 modal('<div class="modal-head">'+leaf('shareUi.title','h2')+'<button class="icon-button" data-close data-i18n="common.close" data-i18n-aria-label="common.close" aria-label="'+esc(t('common.close'))+'">'+esc(t('common.close'))+'</button></div><p class="quran-share-title">'+esc(state.meta.name)+'</p><p class="muted">'+esc(reciterInfo(position.reciter).name)+' · <span data-listening-place>'+esc(place(position))+'</span></p>'+leaf('shareUi.hint','p',' class="muted"')+'<div class="quran-listen-qr" role="img" data-i18n-aria-label="shareUi.qrLabel" aria-label="'+esc(t('shareUi.qrLabel'))+'">'+leaf('shareUi.qrLoading','p',' class="muted"')+'</div>'+leaf('shareUi.linkLabel','label',' for="quran-listen-link"')+'<input id="quran-listen-link" type="url" dir="ltr" readonly value="'+esc(url)+'"><div class="quran-listen-share-actions">'+leaf('shareUi.sendLink','button',' class="button" id="quran-send-position" type="button"')+leaf('shareUi.scan','button',' class="button secondary" id="quran-scan-position" type="button"')+'</div><p class="muted" id="quran-share-status" role="status"></p>');
 const root=document.getElementById('modal-content'),field=root.querySelector('input'),status=root.querySelector('[role=status]'),anchor=root.firstElementChild;let statusKey=null;
 const paint=()=>{translateUi(root);root.querySelector('[data-listening-place]').textContent=place(position);status.textContent=statusKey?t(statusKey):'';};followModal(root,anchor,paint);
 const copy=async()=>{try{await navigator.clipboard.writeText(url);statusKey='shareUi.copied';}catch{field.focus();field.select();statusKey='shareUi.copyHint';}if(status.isConnected)paint();};
 const scanner=mountQrScanner(root,{entryButton:root.querySelector('#quran-scan-position'),entryLabel:t('shareUi.scan'),entryLabelKey:'shareUi.scan',title:t('shareUi.scanTitle'),titleKey:'shareUi.scanTitle',hint:t('shareUi.scanHint'),hintKey:'shareUi.scanHint',invalidHint:t('shareUi.invalidQr'),invalidHintKey:'shareUi.invalidQr',parse:parseListeningQr,onScan:request=>{closeModal();location.hash=request.hash}});document.getElementById('modal').addEventListener('close',scanner,{once:true});
 root.querySelector('#quran-send-position').onclick=async()=>{if(typeof navigator.share!=='function'){await copy();return;}try{await navigator.share({title:'SALAH · '+state.meta.name,text:t('shareUi.continueNamed',{name:reciterInfo(position.reciter).name}),url});}catch(e){if(e?.name!=='AbortError')await copy();}};
 const qrBox=root.querySelector('.quran-listen-qr');import('./vendor/qrcode-generator.js').then(({default:qrcode})=>{if(!qrBox.isConnected)return;const qr=qrcode(0,'M');qr.addData(url);qr.make();qrBox.innerHTML=qr.createSvgTag({cellSize:4,margin:16,scalable:true});}).catch(()=>{if(qrBox.isConnected)qrBox.innerHTML=leaf('shareUi.qrUnavailable','p',' class="muted"');});
}
export function mountListeningShare(host,index,hash){
 const position=parseListeningShare(hash),meta=position&&index.surahs.find(s=>s.number===position.surah);
 if(!meta||position.ayah>meta.ayahs){host.innerHTML='<section class="panel">'+leaf('shareUi.invalidLink','h1')+leaf('shareUi.invalidPosition','p',' class="muted"')+leaf('shareUi.openQuran','a',' class="button" href="#quran"')+'</section>';const off=subscribeLanguage(()=>translateUi(host));return off;}
 const reciter=reciterInfo(position.reciter);
 host.innerHTML='<section class="panel quran-received-listening">'+leaf('shareUi.continueHeading','p',' class="eyebrow"')+'<img class="quran-received-portrait" src="./'+esc(reciter.portrait)+'" alt="'+esc(reciter.name)+'"><h1>'+esc(meta.name)+'</h1><p>'+esc(reciter.name)+'</p><p class="muted" data-listening-place>'+esc(place(position))+'</p><button class="button" id="quran-accept-listening" type="button">'+esc(t('shareUi.continueListening'))+'</button><p class="muted" id="quran-received-status" role="status">'+esc(t('shareUi.startAfterClick'))+'</p>'+leaf('shareUi.library','a',' class="text-button" href="#quran"')+'</section>';
 let alive=true,accepted=false,buttonKey='shareUi.continueListening',statusKey='shareUi.startAfterClick';const button=host.querySelector('#quran-accept-listening'),status=host.querySelector('#quran-received-status');
 const paint=()=>{if(!alive)return;translateUi(host);host.querySelector('[data-listening-place]').textContent=place(position);button.textContent=t(buttonKey);status.textContent=statusKey?t(statusKey):'';};
 const unsubscribe=quranPlayback.subscribe(state=>{if(!alive||!accepted)return;if(state.surah?.number!==position.surah||state.reciter!==position.reciter){button.disabled=false;buttonKey='shareUi.continueListening';statusKey='shareUi.continuePrompt';paint();return;}statusKey=state.status==='playing'?'shareUi.resuming':state.status==='error'?'shareUi.recordError':state.status==='loading'?'shareUi.opening':state.status==='paused'?'shareUi.paused':null;button.disabled=state.status==='loading';buttonKey=state.status==='playing'?'shareUi.listenAgain':state.status==='error'?'shareUi.retry':'shareUi.continueListening';paint();});
 const offLanguage=subscribeLanguage(paint);
 button.onclick=async()=>{const current=quranPlayback.state;if(accepted&&current.surah?.number===position.surah&&current.reciter===position.reciter&&current.status==='paused'){quranPlayback.toggle();return;}accepted=true;button.disabled=true;statusKey='shareUi.opening';paint();try{await quranPlayback.start(reciterRecording(index,position.surah),position.reciter,position.ayah-1,true,false,position.seconds);}catch{if(alive){button.disabled=false;statusKey='shareUi.openFailed';paint();}}};
 return()=>{alive=false;offLanguage();unsubscribe();};
}
export function showListeningScanner(){
 if(!personalDataAllowed()){toast(t('shareUi.cameraUnavailable'));return;}
 stopQrScanner();modal('<div class="modal-head">'+leaf('shareUi.scanTitle','h2')+'<button class="icon-button" data-close data-i18n="common.close" data-i18n-aria-label="common.close" aria-label="'+esc(t('common.close'))+'">'+esc(t('common.close'))+'</button></div><div id="quran-listening-scanner"></div>');
 const area=document.getElementById('quran-listening-scanner');const scanner=mountQrScanner(area,{entryLabel:t('shareUi.openCamera'),entryLabelKey:'shareUi.openCamera',title:'',hint:t('shareUi.scanHint'),hintKey:'shareUi.scanHint',invalidHint:t('shareUi.invalidQr'),invalidHintKey:'shareUi.invalidQr',parse:parseListeningQr,onScan:request=>{closeModal();location.hash=request.hash}});document.getElementById('modal').addEventListener('close',scanner,{once:true});void scanner.open();
}
