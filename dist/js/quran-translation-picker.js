import{quranTranslations,BUNDLED_TRANSLATION_ID}from './quran-translations.js';
import{UI_LANGUAGES}from './interface-languages.js';
import{t,subscribeLanguage,translateUi}from './i18n.js';
import{esc,modal,closeModal,uiLeaf,uiAttribute,setUiMessage,uiMessage}from './ui.js';
let translationPickerSequence=0;
const translationDownloadIcon='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18H5a4 4 0 0 1-.6-8A7 7 0 0 1 18 8a5 5 0 0 1 1 10h-1M12 12v9m-3-3 3 3 3-3"/></svg>';
const translationLanguages=Object.fromEntries(UI_LANGUAGES.map(row=>[row.code,row.name]));
const translationFlags=Object.freeze({ru:'🇷🇺',az:'🇦🇿',en:'🇬🇧',de:'🇩🇪',tg:'🇹🇯',uz:'🇺🇿',kk:'🇰🇿',ar:'🇸🇦'});
const translationFlag=language=>translationFlags[language]?'<span class="quran-translation-flag" aria-hidden="true" dir="ltr">'+translationFlags[language]+'</span>':'';
export function mountQuranTranslationPicker(button,{getSelected,onSelect,library=quranTranslations}={}){
 if(!button)return()=>{};
 let disposed=false,controller=null,pane=null,closeListener=null,stopLanguage=null,boundDialog=null,opening=0;
 const dialog=()=>document.getElementById('modal');
 const cleanup=()=>{opening++;controller?.abort();controller=null;if(closeListener)boundDialog?.removeEventListener('close',closeListener);closeListener=null;boundDialog=null;stopLanguage?.();stopLanguage=null;};
 async function open(){
  if(disposed)return;cleanup();const generation=opening,requestController=new AbortController();controller=requestController;const signal=requestController.signal,id=String(++translationPickerSequence);
  modal('<section class="quran-translation-picker" data-translation-picker="'+id+'"><div class="modal-heading"><h2>'+uiLeaf('quranTranslations.title')+'</h2><button type="button" class="text-button" data-close>'+uiLeaf('common.close')+'</button></div><p class="muted">'+uiLeaf('quranTranslations.separate')+'</p><p data-translation-status role="status">'+uiLeaf('common.loading')+'</p><div class="quran-translation-choices"></div></section>');
  const ownPane=document.querySelector('[data-translation-picker="'+id+'"]'),ownDialog=dialog();pane=ownPane;if(!ownPane||!ownDialog)return;
  const alive=()=>!disposed&&opening===generation&&controller===requestController&&pane===ownPane&&ownPane.isConnected&&ownDialog.contains(ownPane)&&ownDialog.open===true&&!signal.aborted;
  boundDialog=ownDialog;closeListener=()=>{if(opening===generation&&!ownDialog.open)cleanup();};ownDialog.addEventListener('close',closeListener);stopLanguage=subscribeLanguage(()=>{if(alive())translateUi(ownPane);});
  const status=ownPane.querySelector('[data-translation-status]');let editions;
  try{editions=await library.list();}catch{if(alive())setUiMessage(status,uiMessage('quranTranslations.unavailable'));return;}
  if(!alive())return;
  const rows=[{id:BUNDLED_TRANSLATION_ID,language:'ru',author:'Эльмир Кулиев',bundled:true},...editions];
  const selected=getSelected();
  ownPane.querySelector('.quran-translation-choices').innerHTML=rows.map(row=>'<div class="quran-translation-choice"><button type="button" class="quran-translation-select" data-translation-select="'+esc(row.id)+'" aria-pressed="'+(selected===row.id)+'"><span class="quran-translation-check" aria-hidden="true">'+(selected===row.id?'✓':'')+'</span><span><strong lang="'+row.language+'" dir="ltr">'+translationFlag(row.language)+esc(translationLanguages[row.language]||row.language)+(row.language==='uz'?' · '+uiLeaf('quranTranslations.cyrillic'):'')+'</strong><small dir="ltr">'+esc(row.author)+'</small></span></button>'+(row.bundled?'<span class="quran-translation-offline">'+uiLeaf('quranTranslations.included')+'</span>':'<button type="button" class="quran-translation-download" data-translation-download="'+esc(row.id)+'" '+uiAttribute('quranTranslations.download')+'>'+translationDownloadIcon+'</button>')+(!row.bundled?'<a class="quran-translation-source" href="'+esc(row.source)+'" target="_blank" rel="noopener noreferrer">QuranEnc.com · '+uiLeaf('quranTranslations.version',{version:row.version})+'</a>':'')+'</div>').join('');
  setUiMessage(status,'');
  const busy=value=>{for(const control of ownPane.querySelectorAll('[data-translation-select],[data-translation-download]'))control.disabled=value;};
  for(const control of ownPane.querySelectorAll('[data-translation-select]'))control.onclick=async()=>{
   if(!alive())return;busy(true);setUiMessage(status,uiMessage('quranTranslations.loading'));
   try{const saved=await onSelect(control.dataset.translationSelect,{signal});if(!alive())return;if(saved===false)setUiMessage(status,uiMessage('quranTranslations.saveFailed'));else closeModal();}
   catch{if(alive())setUiMessage(status,uiMessage('quranTranslations.failed'));}
   finally{if(alive())busy(false);}
  };
  for(const control of ownPane.querySelectorAll('[data-translation-download]'))control.onclick=async()=>{
   if(!alive())return;busy(true);setUiMessage(status,uiMessage('quranTranslations.downloading',{done:0,total:114}));
   try{await library.saveAll(control.dataset.translationDownload,{signal,onProgress:(done,total)=>{if(alive())setUiMessage(status,uiMessage('quranTranslations.downloading',{done,total}));}});if(alive())setUiMessage(status,uiMessage('quranTranslations.saved'));}
   catch{if(alive())setUiMessage(status,uiMessage('quranTranslations.downloadFailed'));}
   finally{if(alive())busy(false);}
  };
 }
 button.addEventListener('click',open);
 return()=>{if(disposed)return;disposed=true;button.removeEventListener('click',open);const ownDialog=boundDialog,own=pane?.isConnected&&ownDialog?.contains(pane)&&ownDialog===dialog();cleanup();if(own&&ownDialog.open)closeModal();pane=null;};
}
