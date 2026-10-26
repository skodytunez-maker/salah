import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
const handlers={},cacheData=new Map(),shows=[],opened=[],navigated=[];
let windows=[];const self={registration:{scope:'https://fixture.invalid/salah/',showNotification:async(title,options)=>shows.push({title,...options})},location:{origin:'https://fixture.invalid'},clients:{matchAll:async()=>windows,openWindow:async url=>opened.push(url)},addEventListener:(name,fn)=>handlers[name]=fn};
const cache={match:async key=>cacheData.get(String(key))?.clone(),put:async(key,value)=>cacheData.set(String(key),value.clone()),delete:async key=>cacheData.delete(String(key))};
vm.runInNewContext(await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),{self,caches:{open:async()=>cache},URL,Response,Request,Headers,Date,Number,Map,Set,Promise,Intl,console,setTimeout,clearTimeout,fetch:()=>{throw Error('no network');}});
async function emit(name,data){let waiting=Promise.resolve();handlers[name]({...data,waitUntil:p=>waiting=p});await waiting;}
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',lessonId='A'.repeat(32),payload={kind:'classroom',user,lessonId,expiresAt:Date.now()+60000,body:'Сегодня в20:00 занятие',tag:'salah-push-classroom-abcdef'};
const marker=(u,origin='https://fixture.invalid')=>emit('message',{source:{url:origin+'/salah/'},data:{type:'SALAH_LESSON_ACCOUNT',user:u}});
await emit('push',{data:{json:()=>payload}});assert.equal(shows.length,0,'No account binding means no personal classroom notification');
await marker(user);await emit('push',{data:{json:()=>payload}});assert.equal(shows.length,1);assert.equal(shows[0].data.url,'#lesson?class='+lessonId);
await emit('notificationclick',{notification:{data:shows[0].data,close(){}}});assert.equal(opened.at(-1),'https://fixture.invalid/salah/#lesson?class='+lessonId);
windows=[{url:'https://fixture.invalid/salah/#home',focus:async()=>navigated.push('focus'),navigate:async url=>navigated.push(url)}];await emit('notificationclick',{notification:{data:shows[0].data,close(){}}});assert.ok(navigated[0].endsWith('#lesson?class='+lessonId));
await marker(other);await emit('push',{data:{json:()=>payload}});await emit('notificationclick',{notification:{data:shows[0].data,close(){}}});assert.equal(shows.length,1);assert.equal(navigated.length,2);
await marker(null);await marker(user,'https://evil.invalid');await emit('push',{data:{json:()=>payload}});assert.equal(shows.length,1);
await marker(user);for(const bad of [{...payload,lessonId:'https://evil.invalid'},{...payload,user:other},{...payload,expiresAt:Date.now()-1},{...payload,expiresAt:Date.now()+3600000}])await emit('push',{data:{json:()=>bad}});assert.equal(shows.length,1);
await emit('push',{data:{json:()=>({kind:'prayer',body:'Намаз',expiresAt:Date.now()+60000,url:'#home'})}});assert.equal(shows.at(-1).data.url,'#home');
console.log('PASS: closed-app lesson notification requires current account binding, validates lesson/expiry, opens its own route, stops after logout/account change and preserves prayer notifications.');
