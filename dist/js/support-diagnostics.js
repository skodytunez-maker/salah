// Optional, on-demand diagnostics. Captures counters only—never exception text or stack.
export function createSupportDiagnostics({version,windowRef=globalThis.window,documentRef=globalThis.document,navigatorRef=globalThis.navigator}={}){
 let errors=0,rejections=0,disposed=false;
 const onError=()=>{errors=Math.min(errors+1,99)},onRejection=()=>{rejections=Math.min(rejections+1,99)};
 windowRef?.addEventListener?.('error',onError);
 windowRef?.addEventListener?.('unhandledrejection',onRejection);
 const section=()=>{const value=String(windowRef?.location?.hash||'').match(/^#([a-z][a-z0-9-]*)/i)?.[1]?.toLowerCase()||'home';return ['home','knowledge','quran','adhkar','menu','account','settings','calendar','qibla','umrah','support'].includes(value)?value:'other'};
 const screen=()=>{const width=Number(windowRef?.innerWidth)||0;return width<700?'phone':width<1100?'tablet':'wide screen'};
 return{
  snapshot(){if(disposed)return '';return ['Версия SALAH: '+String(version||'неизвестна').slice(0,12),'Раздел: '+section(),'Экран: '+screen(),'Ошибки JavaScript: '+errors,'Сбои обещаний: '+rejections].join('\n')},
  dispose(){if(disposed)return;disposed=true;windowRef?.removeEventListener?.('error',onError);windowRef?.removeEventListener?.('unhandledrejection',onRejection)}
 };
}
