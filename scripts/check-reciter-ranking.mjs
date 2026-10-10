import{publicListenerRows}from '../supabase/functions/reciter-popularity/listener-labels.mjs';

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{rankListening,rankTime,safeListener}from '../dist/js/reciter-ranking-core.js';
import{RECITERS,reciterInfo}from '../dist/js/quran-reciters.js';
const placed=rankListening([{id:'a',seconds:120},{id:'b',seconds:120},{id:'c',seconds:60}]);
assert.deepEqual(placed.map(x=>x.rank),[1,1,3]);assert.equal(rankTime(65),'1 мин 5 с');
const anonymous=safeListener({id:'11111111-1111-4111-8111-111111111111',mode:'initial',initial:'С',nickname:'Must stay private',hasPhoto:true});
assert.deepEqual(Object.keys(anonymous).sort(),['id','initial','mode']);assert.ok(!JSON.stringify(anonymous).includes('Must stay private'));
assert.equal(safeListener({id:'bad',mode:'profile'}),null);assert.equal(safeListener({id:'11111111-1111-4111-8111-111111111111',mode:'hidden'}),null);
const source=await fs.readFile(new URL('../dist/js/reciter-ranking-view.js',import.meta.url),'utf8');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context=vm.createContext({RECITERS,reciterInfo,rankListening,rankTime,esc,rankingListeners:()=>[anonymous],publicListenerPhoto:()=>{throw Error('Anonymous photo must never be requested');},modal(){},closeModal(){}});
const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({rankingMarkup});',context);
const ids=RECITERS.filter(r=>!r.variantOf).slice(0,8).map(r=>r.id);const markup=api.rankingMarkup(ids,{seconds:id=>900-ids.indexOf(id)*60,global:true});
assert.equal((markup.match(/rank-podium-card/g)||[]).length,3);assert.equal((markup.match(/rank-list-row/g)||[]).length,2);assert.match(markup,/Весь рейтинг/);assert.ok(!markup.includes('Must stay private'));assert.ok(!markup.includes('?avatar='));
const searched=api.rankingMarkup(ids,{seconds:id=>900-ids.indexOf(id)*60,global:true,query:reciterInfo(ids[7]).name});assert.ok(searched.includes(reciterInfo(ids[7]).name),'Search finds places beyond the visible five');
const edge=await fs.readFile(new URL('../supabase/functions/reciter-popularity/index.ts',import.meta.url),'utf8');
assert.match(edge,/v\.mode='profile'/);assert.match(edge,/case when v\.mode='profile'/);const labelsSource=await fs.readFile(new URL('../supabase/functions/reciter-popularity/listener-labels.mjs',import.meta.url),'utf8');assert.match(labelsSource,/p\.mode==='profile'/);assert.match(edge,/verifiedUser\(req\)/);
const client=await fs.readFile(new URL('../dist/js/reciter-popularity.js',import.meta.url),'utf8');assert.match(client,/listener-confirm-public/);assert.match(client,/if\(account\(\)\.userId!==user\)return/);
console.log('PASS: tied places, exact time, five-place podium, full ranking search, anonymous nickname/photo exclusion and explicit profile consent.');

const collision=publicListenerRows([{reciter:'a',id:'one',mode:'initial',initial:'S',prefix:'SA',nickname:'Private first',has_photo:true},{reciter:'b',id:'two',mode:'initial',initial:'S',prefix:'SI',nickname:'Private second',has_photo:true}]);assert.deepEqual(collision.map(p=>p.initial),['SA','SI']);assert.ok(!JSON.stringify(collision).includes('Private'));assert.ok(!JSON.stringify(collision).includes('hasPhoto'));const samePerson=publicListenerRows([{reciter:'a',id:'one',mode:'initial',initial:'S',prefix:'SA'},{reciter:'b',id:'one',mode:'initial',initial:'S',prefix:'SA'}]);assert.deepEqual(samePerson.map(p=>p.initial),['S','S']);assert.equal(safeListener({id:'11111111-1111-4111-8111-111111111111',mode:'initial',initial:'SH'}).initial,'SH');console.log('PASS: distinct listener collisions use two letters; one account across readers does not create a false collision.');

assert.equal((client.match(/role="switch"/g)||[]).length,1);assert.ok(!client.includes('listener-show-profile'));assert.match(client,/join.onclick=.*save\('initial'\)/);console.log('PASS: one anonymity switch, hidden identity remains hidden until explicit enrollment.');
