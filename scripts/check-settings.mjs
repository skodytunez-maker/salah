import assert from 'node:assert/strict';
const data=new Map();let settingsWrites=0;
globalThis.localStorage={getItem:key=>data.get(key)??null,setItem:(key,value)=>{settingsWrites++;data.set(key,String(value));},removeItem:key=>data.delete(key)};
const chosen={city:{name:'Тюмень',country:'Россия',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},method:'3',school:'0',highLatitude:'2',hijriOffset:'-1',offsets:{Fajr:2,Dhuhr:3,Asr:-4,Maghrib:1,Isha:5},weather:true,weatherAnimation:false,backgroundMode:'light',dynamic:false,transitions:false,motion:true,haptic:false,showTahajjud:true,tahajjudTime:'01:17',onboarded:true,reminders:{enabled:true}};
data.set('salah:settings',JSON.stringify(chosen));
data.set('salah:adhkar-stats-v2',JSON.stringify({version:2,totals:{shared:25},days:{}}));
const first=await import('../dist/js/storage.js?settings-release-first');
assert.equal(first.defaults.liveSky,false);assert.equal(first.settings.liveSky,false,'Old weather/motion choices do not opt into live sky');assert.equal(settingsWrites,0,'Reading the new default does not write a migration');
assert.equal(first.settings.school,0,'Legacy three-imam choice must not fall back to Hanafi');
assert.equal(first.settings.highLatitude,2);assert.equal(first.settings.hijriOffset,-1);
assert.equal(first.settings.weather,true);assert.equal(first.settings.backgroundMode,'light');
assert.throws(()=>first.normalizeSettings({school:'0'},{strict:true}));
assert.equal(first.normalizeSettings({school:'01'}).school,1); // Invalid strings are not migrated.
assert.equal(first.updateSettings({school:0}),true);
const saved=JSON.parse(data.get('salah:settings'));
assert.equal(saved.school,0);assert.deepEqual(saved.offsets,chosen.offsets);
const later=await import('../dist/js/storage.js?settings-release-later');
assert.deepEqual(later.settings,saved,'Reload / a new app release must retain the complete saved preferences');
// A stale tab changing only one setting cannot undo another tab's selections.
assert.equal(later.updateSettings({weather:false,backgroundMode:'dark'}),true);
assert.equal(first.updateSettings({haptic:true}),true);
assert.equal(first.settings.weather,false);assert.equal(first.settings.backgroundMode,'dark');
assert.equal(first.settings.school,0);assert.equal(first.settings.showTahajjud,true);
assert.equal(first.settings.tahajjudTime,'01:17');assert.deepEqual(first.settings.offsets,chosen.offsets);
assert.equal(first.settings.weatherAnimation,false);assert.equal(first.settings.transitions,false);
assert.equal(first.settings.motion,true);assert.equal(first.settings.haptic,true);
assert.deepEqual(first.settings.city,chosen.city);assert.deepEqual(first.settings.reminders,chosen.reminders);
const reopened=await import('../dist/js/storage.js?settings-release-reopened');
assert.deepEqual(reopened.settings,first.settings);
assert.equal(JSON.parse(data.get('salah:adhkar-stats-v2')).totals.shared,25);
console.log('PASS: legacy Asr selection, complete preferences across releases, partial changes from stale tabs, and personal counters preserved.');

assert.equal(first.settings.tableOffsets.Asr,0,'Legacy calculation offsets never move the published local table');
assert.equal(first.updateSettings({tableOffsets:{Asr:2}}),true);
assert.equal(first.settings.tableOffsets.Asr,2);assert.equal(first.settings.highLatitude,2);
assert.equal(first.updateSettings({weather:true}),true);assert.equal(first.settings.tableOffsets.Asr,2);
assert.throws(()=>first.normalizeSettings({tableOffsets:{Asr:61}},{strict:true}));
console.log('PASS: explicit local timetable offsets survive partial saves without changing high-latitude choice.');

for(const liveSky of [undefined,null,'true','false',1,[],{},['true']]){
 const input=liveSky===undefined?{weather:true,weatherAnimation:true,dynamic:true}:{liveSky};
 assert.equal(first.normalizeSettings(input).liveSky,false,'Only explicit boolean true enables live sky');
 if(liveSky!==undefined)assert.throws(()=>first.normalizeSettings(input,{strict:true}));
}
assert.equal(first.normalizeSettings({liveSky:false},{strict:true}).liveSky,false);
assert.equal(first.updateSettings({liveSky:true}),true);assert.equal(first.settings.liveSky,true);
const liveReload=await import('../dist/js/storage.js?live-sky-explicit-reload');assert.equal(liveReload.settings.liveSky,true);
assert.equal(first.updateSettings({haptic:false}),true);assert.equal(first.settings.liveSky,true,'A partial unrelated save retains an explicit opt-in');
const {createBackup,validateBackup,restoreBackup}=await import('../dist/js/backup.js');
const backup=createBackup({storage:localStorage,settings:first.settings,history:{}});assert.equal(backup.settings.liveSky,true);
const prepared=validateBackup(backup);assert.equal(prepared.backup.settings.liveSky,true);restoreBackup(prepared,{storage:localStorage,confirmed:true});assert.equal(JSON.parse(data.get('salah:settings')).liveSky,true,'An explicit opt-in survives actual backup restore');
const legacy=structuredClone(backup);delete legacy.settings.liveSky;assert.equal(validateBackup(legacy).backup.settings.liveSky,false,'Old backups remain photo-only');
const corrupt=structuredClone(backup);corrupt.settings.liveSky='true';assert.throws(()=>validateBackup(corrupt));
console.log('PASS: live sky is a strict default-off opt-in with no migration writes; missing/corrupt legacy flags stay off and explicit choices persist through reload, partial saves and backup restore.');
