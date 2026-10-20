import{mountTestBilling}from './support-billing-test.js';
import{accountAuthClient}from './owner-auth.js';
import{ensureAudienceChoice,personalDataAllowed}from './audience.js';
const host=document.getElementById('billing-sandbox');
let account={signedIn:false,userId:null};
const returnToApp=()=>{const route=location.hash.split('?')[0];if(['#account','#more'].includes(route))location.replace('./'+route);};
window.addEventListener('hashchange',returnToApp);
if(!location.hash)history.replaceState(null,'','#support-salah?billing=test');
returnToApp();
async function start(){
 await ensureAudienceChoice();
 if(!personalDataAllowed()){host.innerHTML='<p>Проверка оплаты доступна в режиме для взрослых.</p><a class="button secondary" href="./#home">Вернуться в SALAH</a>';return;}
 const client=accountAuthClient();
 const changed=session=>{
  const id=session?.user?.id??null;account={signedIn:Boolean(id),userId:id};
  window.dispatchEvent(new CustomEvent('salah:counter-status'));
 };
 const{data,error}=await client.auth.getSession();if(error)throw Error('session_unavailable');
 changed(data?.session);
 mountTestBilling(host,{account:()=>account,client:()=>client});
 client.auth.onAuthStateChange((_event,session)=>queueMicrotask(()=>changed(session)));
}
start().catch(()=>{
 host.innerHTML='<section class="financial-support"><h1>Тест поддержки</h1><p role="alert">Не удалось проверить вход. Открой SALAH, войди в свой аккаунт и вернись по тестовой ссылке.</p><a class="button secondary" href="./#account">Открыть аккаунт SALAH</a><button class="button secondary" type="button" data-retry>Повторить</button></section>';
 host.querySelector('[data-retry]').onclick=()=>location.reload();
});
