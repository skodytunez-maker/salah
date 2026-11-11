import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {staffMessengerMarkup,mountStaffMessenger} from '../dist/js/staff-messenger.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const w=new Window({url:'https://fixture.invalid/#admin'}),doc=w.document;
w.innerWidth=393;w.innerHeight=852;w.HTMLElement.prototype.getBoundingClientRect=()=>({width:393,top:0,bottom:852});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
const visual=new w.EventTarget();Object.assign(visual,{height:852,width:393,offsetTop:0,scale:1});Object.defineProperty(w,'visualViewport',{value:visual,configurable:true});
const host=doc.createElement('main');doc.body.append(host);host.innerHTML=staffMessengerMarkup();
const messenger=mountStaffMessenger(host.querySelector('.staff-chat'),{rooms:[],onRoom(){},onContact(){}});
messenger.showConversation({id:'fixture',title:'Переписка',kind:'direct'});
const field=host.querySelector('textarea'),dialog=host.querySelector('dialog');field.focus();visual.height=440;visual.offsetTop=12;visual.dispatchEvent(new w.Event('resize'));
assert.equal(dialog.style.getPropertyValue('--staff-chat-viewport-height'),'440px');assert.equal(dialog.style.getPropertyValue('--staff-chat-viewport-top'),'12px');assert.ok(dialog.classList.contains('is-keyboard-open'));
assert.equal(dialog.style.getPropertyValue('--staff-chat-input-max-height'),'105px');field.value='Черновик 🙂';
visual.height=852;visual.offsetTop=0;visual.dispatchEvent(new w.Event('resize'));assert.ok(!dialog.classList.contains('is-keyboard-open'));assert.equal(field.value,'Черновик 🙂');
messenger.dispose();assert.equal(doc.body.classList.contains('staff-messenger-open'),false);await w.happyDOM.close();
console.log('PASS: visual viewport keyboard/offset tracking, bounded textarea, keyboard dismissal and draft retention.');
if(process.platform!=='linux'){console.log('Browser geometry check runs on Linux CI.');process.exit(0);}
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let chrome;for(const candidate of candidates)if(await fs.access(candidate).then(()=>true).catch(()=>false)){chrome=candidate;break;}
assert.ok(chrome,'Linux rendering check requires the installed Chrome/Chromium executable');
const browserFixture=async()=>{
 const result=document.createElement('pre');result.id='layout-result';document.body.append(result);
 try{
  const {staffMessengerMarkup,mountStaffMessenger}=await import('/js/staff-messenger.js');
  const host=document.querySelector('.staff-content');host.innerHTML=staffMessengerMarkup();
  const visual=new EventTarget();Object.assign(visual,{height:852,width:393,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{value:visual,configurable:true});
  const chat=host.querySelector('.staff-messenger'),controller=mountStaffMessenger(chat,{rooms:[],onRoom(){},onContact(){}});
  controller.showConversation({id:'fixture',title:'Личная переписка',kind:'direct'});
  const dialog=host.querySelector('dialog'),field=host.querySelector('textarea'),send=host.querySelector('.staff-send'),palette=host.querySelector('.staff-emoji'),push=host.querySelector('[data-staff-push-control]');
  push.innerHTML='<label>Уведомления сообщений <input type="checkbox" checked></label>';push.style.height='82px';
  field.value='Первая строка\nВторая строка\nТретья строка\nЧетвёртая строка';field.focus();field.dispatchEvent(new Event('input',{bubbles:true}));host.querySelector('[data-smile]').click();
  const settle=()=>new Promise(resolve=>setTimeout(resolve,50)),metrics=[];
  for(const [width,height,top] of [[393,455,0],[320,340,12],[568,250,0],[393,620,20]]){
   document.documentElement.style.setProperty('--fixture-width',width+'px');document.documentElement.style.setProperty('--fixture-safe-top',width>500?'0px':'47px');
   Object.assign(visual,{width,height,offsetTop:top});visual.dispatchEvent(new Event('resize'));await settle();
   const bottom=height+top,box=dialog.getBoundingClientRect(),input=field.getBoundingClientRect(),button=send.getBoundingClientRect(),panel=palette.getBoundingClientRect();
   const row={width,height,top,dialogBottom:box.bottom,inputBottom:input.bottom,sendBottom:button.bottom,paletteHeight:panel.height,paletteScroll:palette.scrollHeight,paletteClient:palette.clientHeight};
   metrics.push(row);
   if(!dialog.classList.contains('is-keyboard-open'))throw Error('Keyboard not detected');
   if(Math.abs(box.top-top)>1||Math.abs(box.bottom-bottom)>1)throw Error('Dialog escaped visual viewport: '+JSON.stringify(row));
   if(input.top<box.top||input.bottom>bottom-6||button.bottom>bottom-6||button.top<box.top||button.height<40)throw Error('Input or Send clipped by keyboard: '+JSON.stringify(row));
   if(getComputedStyle(push).display!=='none'||getComputedStyle(palette).overflowY!=='auto')throw Error('Composer fails compact/scrollable state');
   if(palette.hidden||panel.height<1)throw Error('Emoji picker disappeared');
  }
  Object.assign(visual,{height:852,width:393,offsetTop:0});visual.dispatchEvent(new Event('resize'));await settle();
  if(dialog.classList.contains('is-keyboard-open')||getComputedStyle(push).display==='none'||!push.querySelector('input').checked)throw Error('Keyboard dismissal did not restore notification setting');
  if(!field.value.includes('Четвёртая строка'))throw Error('Viewport changes lost the draft');
  Object.assign(visual,{height:455,width:393,offsetTop:0});document.documentElement.style.setProperty('--fixture-width','393px');document.documentElement.style.setProperty('--fixture-safe-top','47px');visual.dispatchEvent(new Event('resize'));await settle();
  result.dataset.pass='true';result.textContent=btoa(JSON.stringify(metrics));
 }catch(error){result.dataset.pass='false';result.textContent=btoa(String(error.stack||error));}
};
const fixture='<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/css/staff-cabinet.css"><link rel="stylesheet" href="/css/staff-messenger.css"><link rel="stylesheet" href="/css/message-emojis.css"><style>body{margin:0;background:#080f1b}.staff-content{width:var(--fixture-width,393px)}.staff-conversation-window.is-mobile{width:var(--fixture-width,393px)!important;max-width:var(--fixture-width,393px)!important}.staff-cabinet .staff-messenger .staff-conversation-window.is-mobile .staff-conversation{padding-top:var(--fixture-safe-top,47px)}#layout-result{position:fixed;top:900px}</style><main class="staff-cabinet"><div class="staff-content"></div></main><script type="module">('+browserFixture.toString()+')();</script></html>';
const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
const dist=path.join(root,'dist');const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://fixture.invalid').pathname;if(pathname==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}const file=path.resolve(dist,'.'+decodeURIComponent(pathname));if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}const body=await fs.readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'salah-chat-viewport-')),screenshot=path.join(temp,'iphone-composer.png');
try{
 const url='http://127.0.0.1:'+server.address().port+'/fixture';
 const {stdout}=await promisify(execFile)(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--no-first-run','--hide-scrollbars','--window-size=393,852','--virtual-time-budget=6000','--user-data-dir='+path.join(temp,'chrome'),'--screenshot='+screenshot,'--dump-dom',url],{timeout:25000,maxBuffer:4000000});
 const match=stdout.match(/<pre id="layout-result" data-pass="(true|false)">([^<]*)<\/pre>/);
 assert.ok(match,'Browser fixture must finish rendering');const details=Buffer.from(match[2],'base64').toString();assert.equal(match[1],'true',details);
 console.log('PASS: real Chrome layout at 393/320/568 px, four keyboard viewport sizes/offsets, expanded textarea, reachable Send, scrollable emojis and restored notifications. '+details);
 if(process.env.RUNNER_TEMP)await fs.copyFile(screenshot,path.join(process.env.RUNNER_TEMP,'salah-chat-keyboard.png'));
}finally{await new Promise(resolve=>server.close(resolve));}
