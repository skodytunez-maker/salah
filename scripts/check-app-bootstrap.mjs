import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {resolveInterfaceLanguage} from '../dist/js/interface-languages.js';

const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const ownerHtml=await readFile(new URL('../dist/owner.html',import.meta.url),'utf8');
const shareHtml=await readFile(new URL('../dist/share.html',import.meta.url),'utf8');
const source=await readFile(new URL('../dist/js/app-bootstrap.js',import.meta.url),'utf8');
const css=await readFile(new URL('../dist/css/app-bootstrap.css',import.meta.url),'utf8');
assert.doesNotMatch(source,/^\s*import\b/m,'The bootstrap must survive failure of the app module graph');
assert.match(css,/\.app-bootstrap__actions\[hidden\]\{display:none!important\}/,'The hidden action state cannot be overridden by flex styles');

const webEntry='<script type="module" src="./js/app.js"></script>',nativeEntry='<script type="module" src="./js/native-entry.js"></script>';
assert.ok(html.includes(webEntry),'Preserve the exact entry consumed by the native bundle builder');
const nativeHtml=html.replace(webEntry,nativeEntry);
function setup({preference='ru',raw,browserLanguages=['en-GB'],deniedStorage=false,missingSettings=false,alreadyRendered=false,documentHtml=html,native=false}={}){
 const win=new Window({url:'https://example.test/salah/?from=phone#quran?view=surah&n=5',settings:{disableJavaScriptFileLoading:true,disableJavaScriptEvaluation:true,disableCSSFileLoading:true}}),doc=win.document;
 doc.write(documentHtml);doc.close();
 const host=doc.getElementById('app'),panel=doc.getElementById('app-bootstrap'),entry=doc.querySelector('script[type="module"][src="./js/app.js"],script[type="module"][src="./js/native-entry.js"]');
 assert.ok(panel&&panel.parentNode===host,'A failed or missing module leaves a real visible SALAH/loading section in the actual HTML');
 assert.equal(panel.querySelector('h1').textContent,'SALAH');assert.ok(panel.querySelector('[role=status]').textContent.trim());
 assert.equal(panel.querySelector('[data-bootstrap-actions]').hidden,true,'Recovery actions only appear after failure or a long wait');
 assert.equal(entry.type,'module');assert.equal(entry.getAttribute('src'),native?'./js/native-entry.js':'./js/app.js');
 const classic=[...doc.scripts].find(script=>script.getAttribute('src')==='./js/app-bootstrap.js');assert.ok(classic&&!classic.type,'The independent guard is a self-hosted classic script');assert.equal(classic.defer,true);assert.ok([...doc.scripts].indexOf(classic)<[...doc.scripts].indexOf(entry));
 const policy=doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content;assert.match(policy,/script-src 'self'/);assert.match(policy,/script-src-attr 'none'/);assert.equal(panel.querySelector('[onclick]'),null);
 assert.equal(panel.querySelector('[data-bootstrap-recover]').getAttribute('href'),'./recover.html','Only the existing explicitly operated repair page is linked');
 const timers=new Map(),state={reloads:0,writes:0,forbidden:0,observed:0,disconnected:0,windowErrorListeners:0,entryErrorListeners:0},url=win.location.href;let id=0;
 const forbidden=()=>{state.forbidden++;throw Error('Bootstrap must not touch audio, stores, service worker or navigation');};
 const storage={getItem(key){assert.equal(key,'salah:settings');if(deniedStorage)throw Error('SecurityError');if(missingSettings)return null;return raw??JSON.stringify({uiLanguage:preference,city:{name:'Тюмень',timezone:'Asia/Yekaterinburg'}});},setItem(){state.writes++;forbidden();},removeItem(){state.writes++;forbidden();},clear(){state.writes++;forbidden();}};
 const originalAdd=win.addEventListener.bind(win),originalRemove=win.removeEventListener.bind(win);win.addEventListener=(name,...args)=>{if(name==='error')state.windowErrorListeners++;return originalAdd(name,...args);};win.removeEventListener=(name,...args)=>{if(name==='error')state.windowErrorListeners--;return originalRemove(name,...args);};
 const entryAdd=entry.addEventListener.bind(entry),entryRemove=entry.removeEventListener.bind(entry);entry.addEventListener=(name,...args)=>{if(name==='error')state.entryErrorListeners++;return entryAdd(name,...args);};entry.removeEventListener=(name,...args)=>{if(name==='error')state.entryErrorListeners--;return entryRemove(name,...args);};
 class Observer extends win.MutationObserver{observe(...args){state.observed++;return super.observe(...args);}disconnect(){state.disconnected++;return super.disconnect();}}
 const navigator={languages:browserLanguages,language:browserLanguages[0]};Object.defineProperties(navigator,{serviceWorker:{get:forbidden},mediaSession:{get:forbidden}});
 const location=Object.freeze({href:url,hash:win.location.hash,reload(){state.reloads++;assert.equal(win.location.href,url,'Retry preserves both the current URL and route');},replace:forbidden,assign:forbidden});
 if(alreadyRendered)host.innerHTML='<section><input id="draft" value="Черновик"><p>Рабочий раздел</p></section>';
 const context=vm.createContext({window:win,document:doc,navigator,localStorage:storage,location,Intl,URL,MutationObserver:Observer,setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key),Audio:forbidden,indexedDB:new Proxy({},{get:forbidden}),caches:new Proxy({},{get:forbidden})});
 vm.runInContext(source,context);
 const fireTimers=()=>{for(const [key,timer] of [...timers]){timers.delete(key);assert.equal(timer.ms,12000,'Only one bounded startup delay is scheduled');timer.fn();}};
 return{win,doc,host,panel,entry,timers,state,url,fireTimers,close:()=>win.happyDOM.close()};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

// If the critical graph never arrives, the static shell stays usable and the
// single timeout exposes explicit actions without navigating or clearing data.
{
 const f=setup();assert.equal(f.timers.size,1);const actions=f.panel.querySelector('[data-bootstrap-actions]');f.fireTimers();assert.equal(actions.hidden,false);assert.equal(f.panel.getAttribute('aria-busy'),'false');assert.match(f.panel.textContent,/больше времени/);assert.equal(f.state.reloads,0);assert.equal(f.state.writes,0);assert.equal(f.state.forbidden,0);assert.equal(f.doc.documentElement.lang,'ru');
 f.panel.querySelector('[data-bootstrap-retry]').click();assert.equal(f.state.reloads,1,'Reload happens only after an explicit retry click');assert.equal(f.win.location.href,f.url);await f.close();
}
// Module fetch/parse errors and pre-render module evaluation failures reveal the
// same narrow fallback. An unrelated icon/resource error does not report this.
{
 const f=setup();const img=f.doc.createElement('img');f.panel.append(img);img.dispatchEvent(new f.win.Event('error'));assert.equal(f.panel.querySelector('[data-bootstrap-actions]').hidden,true);
 f.entry.dispatchEvent(new f.win.Event('error'));assert.equal(f.panel.querySelector('[data-bootstrap-actions]').hidden,false);assert.match(f.panel.textContent,/Не удалось/);assert.equal(f.timers.size,0);assert.equal(f.state.reloads,0);await f.close();
 const g=setup();g.win.dispatchEvent(new g.win.ErrorEvent('error',{filename:'https://other.test/analytics.js'}));assert.equal(g.panel.querySelector('[data-bootstrap-actions]').hidden,true);
 g.win.dispatchEvent(new g.win.ErrorEvent('error',{filename:'https://example.test/salah/js/missing-dependency.js'}));assert.equal(g.panel.querySelector('[data-bootstrap-actions]').hidden,false);assert.equal(g.state.forbidden,0);await g.close();
}
for(const [name,documentHtml,native]of [['owner',ownerHtml,false],['shared app',shareHtml,false],['native bundle',nativeHtml,true]]){
 const f=setup({documentHtml,native});f.entry.dispatchEvent(new f.win.Event('error'));assert.equal(f.panel.querySelector('[data-bootstrap-actions]').hidden,false,name+' has the same independent startup protection');assert.equal(f.state.reloads,0);assert.equal(f.state.forbidden,0);
 if(name==='owner')assert.ok(f.doc.querySelector('script[src="./js/owner-entry.js"]'),'The original owner entry and all remote role/MFA checks remain unchanged');
 f.host.innerHTML='<p>Рабочий раздел</p>';await flush();assert.equal(f.state.disconnected,1);assert.equal(f.state.windowErrorListeners,0);await f.close();
}
// A slow app may finish after the warning; it takes over the exact same main.
// The guard must not touch its new form/audio or react to any later errors.
for(const afterWarning of [false,true]){
 const f=setup();if(afterWarning)f.fireTimers();const oldRetry=f.panel.querySelector('[data-bootstrap-retry]');
 f.host.innerHTML='<section><textarea id="draft">Неотправленный текст</textarea><audio id="playing"></audio><p>Рабочий раздел</p></section>';
 const draft=f.doc.getElementById('draft'),audio=f.doc.getElementById('playing');draft.focus();audio.pause=()=>{f.state.forbidden++;};audio.load=audio.pause;
 await flush();assert.equal(f.timers.size,0,'A completed startup cancels its fallback timer');assert.equal(f.state.disconnected,1);assert.equal(f.state.windowErrorListeners,0);assert.equal(f.state.entryErrorListeners,0);
 oldRetry.click();f.entry.dispatchEvent(new f.win.Event('error'));f.win.dispatchEvent(new f.win.ErrorEvent('error',{filename:'https://example.test/salah/js/app.js'}));f.fireTimers();
 assert.equal(f.state.reloads,0);assert.equal(f.doc.getElementById('draft'),draft);assert.equal(draft.value,'Неотправленный текст');assert.equal(f.doc.activeElement,draft);assert.equal(f.doc.getElementById('playing'),audio);assert.equal(f.state.forbidden,0);assert.equal(f.state.writes,0);await f.close();
}
{
 const f=setup({alreadyRendered:true});assert.equal(f.state.observed,0,'If the real app won the fetch race, no guard is mounted');assert.equal(f.timers.size,0);assert.equal(f.state.windowErrorListeners,0);assert.equal(f.doc.getElementById('draft').value,'Черновик');assert.equal(f.state.forbidden,0);await f.close();
}

// Match the normal language resolver for saved language, automatic script
// matching, invalid settings and denied storage without writing any preference.
const languageCases=[...['ru','en','az','tg','uz','kk','de','ar'].map(preference=>({preference})),
 {preference:'auto',browserLanguages:['uz-Cyrl-UZ','ar-EG','en-GB']},{preference:'auto',browserLanguages:['zz-XX','tg-TJ']},{preference:'auto',browserLanguages:['de-DE']},{preference:'auto',browserLanguages:['az-Arab','en-GB']},{preference:'auto',browserLanguages:['not a locale']},
 {preference:'invalid'},{raw:'{broken',preference:'ru'},{raw:'{}',browserLanguages:['de-DE']},{raw:'null',browserLanguages:['ar-EG']},{missingSettings:true,browserLanguages:['de-DE']},{deniedStorage:true,preference:'ru',browserLanguages:['ar-EG']},{missingSettings:true,browserLanguages:['fr-FR','uz-Cyrl-UZ']},
 ...[['ru'],['auto'],null,{code:'ru'}].map(uiLanguage=>({raw:JSON.stringify({uiLanguage}),browserLanguages:['de-DE']}))];
for(const options of languageCases){
 const f=setup(options),preference=options.deniedStorage||options.raw!==undefined||options.missingSettings||!['auto','ru','en','az','tg','uz','kk','de','ar'].includes(options.preference)?'auto':options.preference,expected=resolveInterfaceLanguage(preference,options.browserLanguages||['en-GB']);assert.equal(f.panel.lang,expected);assert.equal(f.panel.dir,expected==='ar'?'rtl':'ltr');assert.equal(f.doc.documentElement.lang,'ru','Only the startup section is localized; the app owns the document locale');
 f.fireTimers();assert.ok(f.panel.querySelector('[data-bootstrap-status]').textContent.trim());assert.ok(f.panel.querySelector('[data-bootstrap-retry]').textContent.trim());assert.ok(f.panel.querySelector('[data-bootstrap-recover]').textContent.trim());assert.equal(f.state.writes,0);assert.equal(f.state.reloads,0);assert.equal(f.state.forbidden,0);await f.close();
}
console.log('PASS: actual startup HTML is visible without the module; standalone CSP-compatible guard handles module errors/12s slow load, explicit route-preserving retry, eight language preferences, denied storage and late-app cleanup without automatic navigation, store/audio or draft changes.');
