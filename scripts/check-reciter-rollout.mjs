import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  RECITERS, RECITER_RELEASE_WEEKS, configureReciterRollout, groupedReciters,
  reciterHasSurah, reciterIsAvailable, reciterOptions, reciterPublicAt, visibleReciters,
} from '../dist/js/quran-reciters.js';
import {orderReciterCatalog,recentReciters} from '../dist/js/quran-reciter-discovery.js';
import {audioUrl,loadIndex} from '../dist/js/quran-data.js';
import {RADIO_VOICES,radioCandidateBatch} from '../dist/js/radio-candidates.js';
import {createQuranSession} from '../dist/js/quran-session.js';
import {reciterRecording} from '../dist/js/quran-reciter-recording.js';

const first = Date.parse('2026-11-22T09:00:00Z');
const weekMs = 7*86400000;
const grouped = RECITER_RELEASE_WEEKS;
const scheduled = grouped.flat();
const sampleId = grouped[4][0];
let now = first - 1;
let verified = false;
const configure = firstPublicAt => configureReciterRollout({firstPublicAt,isOwner:()=>verified,now:()=>now});
const available = () => scheduled.filter(reciterIsAvailable);

assert.deepEqual(grouped.map(group=>group.length),[4,4,4,3,3]);
assert.equal(new Set(scheduled).size,18);
assert.ok(scheduled.every(id=>RECITERS.some(reciter=>reciter.id===id)));

configure(null);
assert.deepEqual(available(),[]);
assert.equal(reciterIsAvailable('ar.husary'),true);
verified = true;
assert.deepEqual(available(),scheduled);
assert.ok(reciterOptions(sampleId).includes(sampleId));
verified = false;
assert.equal(reciterHasSurah(sampleId,1),false);
assert.ok(!reciterOptions(sampleId,[sampleId]).includes(sampleId));
assert.ok(!groupedReciters([sampleId]).flatMap(group=>group.reciters).some(reciter=>reciter.id===sampleId));

configure(first);
for(const [position,ids] of grouped.entries()){
  now=first+position*weekMs-1;
  assert.deepEqual(available(),grouped.slice(0,position).flat());
  now++;
  assert.deepEqual(available(),grouped.slice(0,position+1).flat());
  assert.ok(ids.every(id=>reciterPublicAt(id)===now));
  assert.deepEqual(recentReciters(RECITERS,now).filter(reciter=>scheduled.includes(reciter.id)).map(reciter=>reciter.id).sort(),[...ids].sort());
}
now=first;
assert.equal(visibleReciters().filter(reciter=>scheduled.includes(reciter.id)).length,4);
assert.deepEqual(orderReciterCatalog(RECITERS,[sampleId],now).filter(reciter=>scheduled.includes(reciter.id)).map(reciter=>reciter.id).sort(),[...grouped[0]].sort());

const index=JSON.parse(await readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>Response.json(index);
try { await loadIndex(); } finally { globalThis.fetch=originalFetch; }
assert.throws(()=>audioUrl(1,sampleId,1));
assert.equal(radioCandidateBatch(index,[sampleId]).length,0);
const tracks=radioCandidateBatch(index,RADIO_VOICES,{random:()=>0.42});
assert.ok(!tracks.some(track=>track.reciter===sampleId));

let playerCreated=false;
const playback=createQuranSession({
  loadCatalog:async()=>index,
  media:{update(){}},
  createPlayer:()=>{playerCreated=true;return {play(){},destroy(){}};},
});
await playback.start(reciterRecording(index,1),sampleId);
assert.equal(playerCreated,false);
assert.equal(playback.state.surah,null);
verified=true;
assert.equal(reciterHasSurah(sampleId,1),true);
assert.ok(radioCandidateBatch(index,[sampleId]).length>0);
await playback.start(reciterRecording(index,1),sampleId);
assert.equal(playerCreated,true);
playback.stop();
verified=false;
assert.throws(()=>audioUrl(1,sampleId,1));

console.log('PASS: five exact week boundaries, verified-owner access, revocation, discovery, favorites, direct playback and radio.');
