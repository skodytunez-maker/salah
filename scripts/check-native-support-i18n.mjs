import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{runInNewContext}from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createTranslator,translateUiElements}from '../dist/js/i18n-core.js';
import nativeSupport from '../dist/js/i18n/nativeSupport/index.js';
import staff from '../dist/js/i18n/staff/index.js';
import account from '../dist/js/i18n/account/index.js';

const codes=['ru','en','az','tg','uz','kk','de','ar'],keys=['nativeSupportUi.updateApp','nativeSupportUi.connectRetryInternet'];
const catalogues=Object.fromEntries(codes.map(code=>[code,{...staff[code],...account[code],...nativeSupport[code]}]));
assert.deepEqual(Object.keys(nativeSupport).sort(),[...codes].sort());
for(const code of codes){
 assert.deepEqual(Object.keys(nativeSupport[code]).sort(),[...keys].sort());
 for(const key of keys){assert.equal(typeof nativeSupport[code][key],'string');assert.ok(nativeSupport[code][key].trim());assert.doesNotMatch(nativeSupport[code][key],/[{}<>]/);if(code!=='ru')assert.notEqual(nativeSupport[code][key],nativeSupport.ru[key]);}
}
const source=await readFile(new URL('../dist/js/native-support-push.js',import.meta.url),'utf8');
const uiSource=await readFile(new URL('../dist/js/ui.js',import.meta.url),'utf8');
function fixture({native=true,result={ready:true},error=null,accountError=null}={}){
 const state={accountCalls:0,enableCalls:0,networkCalls:0,clientCreations:0};
 const metadata=(key,params={})=>({key,params:{...params}});
 const plugin={getStatus:async()=>({supported:true}),addListener:async()=>{}};
 const context={settings:{},Intl,AbortSignal,uiMessage:metadata,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'fixture-key',
  Capacitor:native?{isNativePlatform:()=>true,getPlatform:()=>'android',Plugins:{SalahSupportPush:plugin}}:undefined,
  accountAuthClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})}}),
  ownerVerified:()=>false,supportNotice:()=>{},document:{addEventListener(){}},window:{addEventListener(){},dispatchEvent(){}},
  fetch:()=>{state.networkCalls++;throw Error('UI fixture must not register')},
  createNativeSupportClient:()=>{state.clientCreations++;return{accountChanged:async()=>{state.accountCalls++;if(accountError)throw accountError},enable:async()=>{state.enableCalls++;if(error)throw error;return result}}}
 };
 const api=runInNewContext(source.replace(/^import.*$/gm,'').replaceAll('export ','')+';({enableNativeSupportNotifications});',context);
 return{state,enable:api.enableNativeSupportNotifications};
}
const cases=[
 {options:{native:false},message:'Для фоновых уведомлений об ответах обновите приложение.',key:'nativeSupportUi.updateApp'},
 {options:{result:{ready:false,reason:'sign_in_required',message:'Войдите в аккаунт.'}},message:'Войдите в аккаунт.',key:'staffUi.errorSignIn'},
 {options:{result:{ready:false,reason:'google_services_unavailable',message:'На этом устройстве недоступна служба уведомлений Google.'}},message:'На этом устройстве недоступна служба уведомлений Google.',key:'staffUi.pushGoogleUnavailable'},
 {options:{error:Error('notifications_denied')},message:'Разрешите уведомления SALAH в настройках телефона.',key:'staffUi.pushPermission'},
 {options:{error:Object.assign(Error('Native permission failure'),{code:'notifications_denied'})},message:'Не удалось подключить уведомления. Проверьте интернет и повторите попытку.',key:'staffUi.pushPermission'},
 {options:{error:Error('untrusted server or user text')},message:'Не удалось подключить уведомления. Проверьте интернет и повторите попытку.',key:'nativeSupportUi.connectRetryInternet'},
 {options:{accountError:Error('native_support_timeout')},message:'Не удалось подключить уведомления. Проверьте интернет и повторите попытку.',key:'nativeSupportUi.connectRetryInternet'},
 {options:{error:Error('untrusted notifications_denied content')},message:'Разрешите уведомления SALAH в настройках телефона.',key:'nativeSupportUi.connectRetryInternet'}
];
const w=new Window({url:'https://fixture.invalid/#support'}),translator=createTranslator(catalogues);
const ui=runInNewContext(uiSource.replace(/^import.*$/gm,'').replaceAll('export ','')+';({setUiMessage});',{t:translator.t});
for(const test of cases){
 const f=fixture(test.options),value=await f.enable();assert.equal(value.ready,false);assert.equal(value.message,test.message);assert.equal(value.uiMessage.key,test.key);assert.deepEqual(Object.keys(value.uiMessage.params),[]);assert.equal(f.state.networkCalls,0);
 const node=w.document.createElement('p'),draft=w.document.createElement('textarea'),raw=w.document.createElement('p');draft.value='user draft';raw.textContent='nativeSupportUi.updateApp';w.document.body.replaceChildren(node,draft,raw);ui.setUiMessage(node,value.uiMessage);draft.focus();
 for(const code of codes){translator.setLanguage(code);translateUiElements(w.document.body,translator);assert.equal(node.textContent,catalogues[code][test.key]);assert.equal(node.getAttribute('data-i18n'),test.key);assert.equal(node.getAttribute('data-i18n-params'),'{}');assert.equal(w.document.activeElement,draft);assert.equal(draft.value,'user draft');assert.equal(raw.textContent,'nativeSupportUi.updateApp');assert.equal(value.message,test.message);assert.equal(f.state.networkCalls,0);}
}
const ready={ready:true},readyFixture=fixture({result:ready});assert.equal(await readyFixture.enable(),ready);assert.equal(readyFixture.state.enableCalls,1);assert.equal(readyFixture.state.clientCreations,1);
for(const reason of ['unknown','__proto__','staffUi.pushPermission',undefined]){const result={ready:false,reason,message:'Untrusted text'},f=fixture({result});assert.equal(await f.enable(),result,'unknown reasons must not be inferred from arbitrary text');assert.equal(result.uiMessage,undefined);assert.equal(f.state.networkCalls,0);}
const interrupted={ready:false},interruptedFixture=fixture({result:interrupted});assert.equal(await interruptedFixture.enable(),interrupted,'cancelled stale enable remains without invented UI feedback');
await w.happyDOM.close();
console.log('PASS: native setup feedback has explicit UI metadata in all eight languages; canonical messages, unknown errors, drafts and registration behavior stay unchanged.');
