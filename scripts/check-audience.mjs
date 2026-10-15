import assert from 'node:assert/strict';
import{spawnSync}from 'node:child_process';
import{fileURLToPath}from 'node:url';
import{AUDIENCE_KEY,groupForBirthDate,readAudience,saveAudience}from '../dist/js/audience-core.js';
const today=new Date(2026,9,16,12);
for(const [date,group]of [['2008-10-16','adult'],['2008-10-17','restricted'],['2008-10-15','adult'],['2026-10-16','restricted'],['2012-02-29','restricted'],['2000-02-29','adult']])assert.equal(groupForBirthDate(date,today),group,date);
for(const date of ['2026-10-17','2025-02-29','2000-13-01','2000-00-01','2000-01-00','2000-04-31','1899-01-01','',null,{},'2000-1-1'])assert.equal(groupForBirthDate(date,today),null,String(date));
const data=new Map(),store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
assert.equal(readAudience(store),null);assert.equal(saveAudience(store,'adult'),true);
assert.deepEqual(JSON.parse(data.get(AUDIENCE_KEY)),{version:1,group:'adult'});
assert.equal(data.size,1);assert.equal(saveAudience(store,'restricted'),true);
for(const value of ['null','broken','{"version":1,"group":"adult","birthDate":"2000-01-01"}','{"version":1,"group":"owner"}','{"version":2,"group":"adult"}']){data.set(AUDIENCE_KEY,value);assert.equal(readAudience(store),null);}
assert.equal(saveAudience({setItem(){throw Error('blocked')}},'adult'),false);
assert.equal(saveAudience(store,'owner'),false);
for(const mode of ['child','unknown','birth-child','birth-adult','adult','legacy','native-failure']){
 let result,attempt=0;do{result=spawnSync(process.execPath,[fileURLToPath(new URL('../tests/audience/runtime.mjs',import.meta.url)),mode],{encoding:'utf8',windowsHide:true,timeout:15000});attempt++;}while(process.platform==='win32'&&result.status===3221225477&&!result.stdout&&!result.stderr&&attempt<3);
 assert.equal(result.status,0,mode+': '+(result.stderr||result.stdout||result.error?.message||result.status));
 console.log(result.stdout.trim());
}
console.log('PASS: exact age boundaries, no stored birth date, fail-closed storage and isolated audience integrations.');
