import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {chatBubble} from '../dist/js/staff-markup.js';
import {setInterfaceLanguage} from '../dist/js/i18n.js';
const w=new Window(),root=w.document.createElement('div');
const message={id:'123',author_id:'b',author_name:'علي <img src=x>',body:'Текст',created_at:'2026-11-18T09:00:00Z',reply:{available:true,id:'122',author:'Автор',body:'Цитата'}};
for(const language of ['ru','en','az','tg','uz','kk','de','ar']){
 setInterfaceLanguage(language);root.innerHTML=chatBubble(message,[],'a',{actions:true,team:true});
 assert(root.querySelector('.is-team-message:not(.is-mine) .staff-message-avatar'));
 assert.equal(root.querySelector('[data-member-avatar]').dataset.memberAvatar,'b');
 assert.equal(root.querySelector('.staff-message-avatar').textContent,'عل');
 assert.equal(root.querySelector('.staff-message-heading strong').textContent,message.author_name);
 assert.equal(root.querySelector('img'),null,'Names remain escaped');
 assert(root.querySelector('[data-reply-source="122"]'));assert.equal(root.querySelectorAll('time').length,1);
 const color=root.querySelector('[data-author-color]').dataset.authorColor;
 root.innerHTML=chatBubble({...message,body:'Следующее'},[],'a',{actions:true,team:true});assert.equal(root.querySelector('[data-author-color]').dataset.authorColor,color);
 root.innerHTML=chatBubble(message,[],'b',{actions:true,team:true});assert(root.querySelector('.is-mine'));assert.equal(root.querySelector('.staff-message-avatar'),null);
 root.innerHTML=chatBubble(message,[],'a',{actions:true});assert.equal(root.querySelector('.is-team-message,.staff-message-avatar,[data-author-color]'),null);
 root.innerHTML=chatBubble(message,[],'a');assert.equal(root.querySelector('.staff-message-heading,.staff-message-avatar,[data-reply-source]'),null,'Support retains its original branch');
}
const app=await readFile(new URL('../dist/js/staff-cabinet.js',import.meta.url),'utf8');assert(app.includes("team:selected?.kind==='team'"));
const css=await readFile(new URL('../dist/css/staff-messenger.css',import.meta.url),'utf8');assert(css.includes('.staff-messenger .staff-message.is-team-message:not(.is-mine)'));assert(!css.includes('body .staff-message-avatar'));
await w.happyDOM.close();console.log('PASS: group-only sender avatars/names/colours, escaped RTL labels, own/direct/support separation and unchanged reply/action/time controls in eight languages.');
