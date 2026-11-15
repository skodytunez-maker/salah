import assert from 'node:assert/strict';
import{guestInitial,safeListener}from '../dist/js/reciter-ranking-core.js';
for(const[name,initial]of [['Гость · Оникс','ОН'],['Гость · Янтарь','ЯН'],['Гость · Сапфир','СА'],['Гость · Агат','АГ'],['Гость · Золотой янтарь','ЯН'],['Гость · Рубин 17441','РУ'],['Гость','Г'],['Гость ABC123','Г']])assert.equal(guestInitial(name),initial);
const base={id:'11111111-1111-4111-8111-111111111111',mode:'profile',initial:'Г',nickname:'Гость ABC123',guestDisplayName:'Гость · Оникс',guest:true};
assert.equal(safeListener(base).initial,'ОН');assert.equal(safeListener(base).nickname,'Гость · Оникс');
assert.equal(safeListener({...base,guest:false,initial:'С'}).initial,'С','Guest display cannot override a registered account');
assert.equal(safeListener({...base,mode:'initial',initial:'С'}).initial,'С','Existing private account mode stays intact');
console.log('PASS: guest circles use the stone initials, including descriptive and overflow aliases, without changing registered/private identities.');
