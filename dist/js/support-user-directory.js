import{getLocale,subscribeLanguage}from './i18n.js';
import{esc,uiLeaf,uiAttribute,uiMessage,setUiMessage}from './ui.js';
import{validOwnerUserId}from './owner-user-card.js';

const PAGE_SIZE=50;
export function mountSupportUserDirectory(root,{loadPage,loadChatContacts,onChoose,onRender=()=>{},isActive=()=>true}){
 const heading=root.querySelector('.support-user-directory-heading'),toggle=heading?.querySelector('[data-support-users]');
 if(!toggle)return null;
 const doc=root.ownerDocument,section=doc.createElement('section');
 section.className='support-user-directory';section.id='support-user-directory';section.hidden=true;
 section.innerHTML='<input type="search" maxlength="80" '+uiAttribute('staffUi.chatSearch',{},'aria-label')+' '+uiAttribute('staffUi.chatSearch',{},'placeholder')+'><p role="status" data-support-users-status></p><div class="support-list support-inbox-list" data-support-users-results></div><button type="button" class="text-button" data-support-users-more>'+uiLeaf('deviceUi.more')+'</button>';
 heading.after(section);toggle.setAttribute('aria-controls',section.id);
 const search=section.querySelector('input'),status=section.querySelector('[data-support-users-status]'),list=section.querySelector('[data-support-users-results]'),more=section.querySelector('[data-support-users-more]');
 const users=new Map();
 let contactsWithChat=null,disposed=false,scope=null,page=1,hasMore=true,busy=false,choosing=false,failed=false,searchTimer=0;
 const active=run=>scope===run&&!!run&&!run.signal.aborted&&!disposed&&isActive();
 const query=()=>search.value.normalize('NFKC').trim().toLocaleLowerCase(getLocale());
 function render(){
  if(!active(scope))return;
  const term=query(),matches=[...users.values()].filter(user=>!contactsWithChat?.has(user.id)&&(!term||user.nickname.normalize('NFKC').toLocaleLowerCase(getLocale()).includes(term)));
  list.innerHTML=matches.map(({id,nickname})=>'<button type="button" class="support-thread support-inbox-row" data-support-user-choice="'+esc(id)+'"><span class="support-inbox-avatar" data-member-avatar="'+esc(id)+'" aria-hidden="true">'+esc(Array.from(nickname.trim()||'?').slice(0,2).join('').toLocaleUpperCase(getLocale()))+'</span><span class="support-inbox-copy"><strong dir="auto">'+esc(nickname)+'</strong></span></button>').join('');
  more.hidden=!hasMore&&!failed;more.disabled=busy||choosing;
  more.innerHTML=uiLeaf(failed?'common.retry':'deviceUi.more');
  setUiMessage(status,failed?uiMessage('ownerUi.usersLoadFailed'):busy?uiMessage('ownerUi.loadingUsers'):matches.length||hasMore?'':uiMessage(term?'quranUi.nothingFound':'ownerUi.noRegisteredUsers'));
  list.querySelectorAll('button').forEach(node=>node.disabled=choosing);onRender();
 }
 async function fetchPages(){
  const run=scope;if(!active(run)||busy||!hasMore)return;
  busy=true;failed=false;render();
  try{
   if(!contactsWithChat){
    const known=await loadChatContacts({signal:run.signal});
    if(!active(run))return;
    contactsWithChat=known;
   }
   do{
    const result=await loadPage(page,{signal:run.signal});
    if(!active(run))return;
    if(!Array.isArray(result?.users)||!Number.isSafeInteger(result.total)||result.total<0)throw Error('Invalid user list');
    for(const user of result.users)if(validOwnerUserId(user.id)&&typeof user.nickname==='string')users.set(user.id,{id:user.id,nickname:user.nickname});
    hasMore=result.users.length>0&&page*PAGE_SIZE<result.total;
    page++;render();
   }while(hasMore&&query().length>=2);
  }catch{if(active(run))failed=true;}
  finally{if(active(run)){busy=false;render();}}
 }
 function setOpen(open){
  if(disposed)return;
  clearTimeout(searchTimer);scope?.abort();scope=null;
  toggle.setAttribute('aria-expanded',String(open));section.hidden=!open;
  if(!open){contactsWithChat=null;users.clear();list.replaceChildren();search.value='';return;}
  scope=new AbortController();page=1;hasMore=true;busy=false;failed=false;choosing=false;
  void fetchPages();
 }
 toggle.onclick=()=>{if(!choosing&&isActive())setOpen(section.hidden);};
 more.onclick=()=>void fetchPages();
 search.oninput=()=>{render();clearTimeout(searchTimer);if(query().length>=2)searchTimer=setTimeout(()=>void fetchPages(),240);};
 list.onclick=async event=>{
  const button=event.target.closest('[data-support-user-choice]'),id=button?.dataset.supportUserChoice,run=scope;
  if(!active(run)||choosing||!users.has(id))return;
  choosing=true;toggle.disabled=true;search.disabled=true;render();
  try{if(await onChoose(id,{signal:run.signal})!==true&&active(run))setUiMessage(status,uiMessage('supportUi.openFailed'));}
  catch{if(active(run))setUiMessage(status,uiMessage('supportUi.openFailed'));}
  finally{if(active(run)){
   choosing=false;toggle.disabled=false;search.disabled=false;more.disabled=busy;
   list.querySelectorAll('button').forEach(item=>item.disabled=false);
  }}
 };
 const off=subscribeLanguage(()=>{if(active(scope))render();});
 return{isOpen:()=>!section.hidden,dispose(){setOpen(false);disposed=true;off();toggle.onclick=null;section.remove();}};
}
