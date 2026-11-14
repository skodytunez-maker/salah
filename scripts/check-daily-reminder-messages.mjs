import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {DAILY_REMINDER_MESSAGES as messages} from '../dist/js/daily-reminder-messages.js';

const read=async path=>JSON.parse(await fs.readFile(new URL('../'+path,import.meta.url),'utf8'));
const evidence=await read('docs/daily-reminder-sources-497.json');
const index=await read('dist/data/quran-index.json');
const normalized=value=>value.normalize('NFKC').toLocaleLowerCase('ru').replace(/[\p{P}\p{Z}\s]+/gu,' ').trim();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const hadithSources=new Map([['2137a','https://sunnah.com/muslim:2137a'],['2699a','https://sunnah.com/muslim:2699a']]);
// Reviewed canonical Quran.com routes; checking only the final ayah would miss a wrong chapter.
const quranSlugs={1:'al-fatihah',2:'al-baqarah',3:'ali-imran',4:'an-nisa',5:'al-maidah',7:'al-araf',13:'ar-rad',14:'ibrahim',16:'an-nahl',17:'al-isra',20:'taha',21:'al-anbya',23:'al-muminun',25:'al-furqan',28:'al-qasas',33:'al-ahzab',39:'az-zumar',49:'al-hujurat',55:'ar-rahman',94:'ash-sharh',99:'az-zalzalah'};
const hadithMeaning=new Map([
 ['2137a','Любимые для Аллаха слова: «Субханаллах, альхамдулиллях, ля иляха илляллах, Аллаху акбар»'],
 ['2699a','Аллах помогает Своему рабу, пока тот помогает своему брату']
]);
assert.equal(evidence.schema,1);assert.equal(evidence.release,497);
assert.ok(messages.length>=24&&messages.length<=30,'A month-sized, bounded rotation');
assert.equal(messages.length,28);assert.equal(Object.isFrozen(messages),true);
assert.equal(new Set(messages.map(m=>m.id)).size,messages.length,'Stable unique IDs');
assert.equal(new Set(messages.map(m=>normalized(m.text))).size,messages.length,'No repeated notification wording');
assert.equal(new Set(messages.map(m=>m.source)).size,messages.length,'One distinct reviewed source per reminder');
assert.deepEqual(evidence.counts,{total:28,quran:26,hadith:2});
assert.equal(evidence.entries.length,messages.length,'Every message has exactly one evidence entry');
assert.equal(new Set(evidence.entries.map(e=>e.id)).size,evidence.entries.length);
const records=new Map(evidence.entries.map(e=>[e.id,e]));
assert.deepEqual([...records.keys()].sort(),messages.map(m=>m.id).sort(),'No orphan evidence entries');
assert.equal(evidence.catalog,'dist/js/daily-reminder-messages.js');
assert.equal(evidence.bundledTranslation.edition,index.translationEdition);
assert.equal(evidence.bundledTranslation.author,index.translationAuthor);
const chapters=new Map(),counts={quran:0,hadith:0},topics=new Set();
for(const m of messages){
 assert.equal(Object.isFrozen(m),true,m.id+': frozen catalogue row');
 assert.match(m.id,/^(?:quran-\d+-\d+|muslim-\d+a)$/);assert.equal(m.evidenceId,m.id);
 assert.ok(typeof m.text==='string'&&m.text.trim()===m.text&&m.text.length>0);
 assert.ok([...m.text].length<=220,m.id+': notification stays at most220 characters including its source');
 assert.doesNotMatch(m.text,/[\r\n<>\u0000-\u001f]/u,'Plain single-line notification');
 assert.doesNotMatch(m.text,/\p{Lu}{3,}/u,'No uppercase shout');
 assert.doesNotMatch(m.text,/давно не|не заходи|ты не|вы не|вернись|зайди|заходи|открой|откройте|запусти|запустите|SALAH|САЛАХ/iu,'No inactivity guilt or app-open instruction');
 const url=new URL(m.source);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.search,'');assert.equal(url.hash,'');
 assert.ok(m.text.includes(m.sourceLabel),m.id+': the source is visible in the message');
 const e=records.get(m.evidenceId);assert.ok(e,m.id+': reviewed evidence exists');
 for(const key of ['id','evidenceId','kind','reference','source','sourceLabel'])assert.equal(m[key],e[key],m.id+': evidence '+key);
 assert.equal(e.message,m.text,m.id+': wording matches the reviewed record');
 assert.equal(e.reviewStatus,'source-and-context-reviewed');assert.match(e.reviewedOn,/^\d{4}-\d{2}-\d{2}$/);
 assert.ok(e.contextNote.length>=60&&e.reviewedEvidence.length>=20,m.id+': content and context review are recorded');topics.add(e.topic);
 if(m.kind==='quran'){
  counts.quran++;assert.equal(url.hostname,'quran.com');assert.match(url.pathname,/^\/[a-z-]+\/\d+$/);
  assert.match(m.reference,/^\d+:\d+$/);const[surah,ayah]=m.reference.split(':').map(Number);
  assert.ok(surah>=1&&surah<=114&&ayah>=1&&ayah<=index.surahs[surah-1].ayahs);
  assert.ok(quranSlugs[surah],m.id+': chapter route was reviewed');assert.equal(url.pathname,`/${quranSlugs[surah]}/${ayah}`,m.id+': source points to this chapter and verse');
  assert.equal(m.id,`quran-${surah}-${ayah}`);assert.equal(m.sourceLabel,`Коран, ${surah}:${ayah}`);assert.equal(Number(url.pathname.split('/').at(-1)),ayah);
  assert.equal(e.treatment,'verbatim-bundled-translation-excerpt');assert.equal(e.bundled.path,`dist/data/quran/${surah}.json`);
  assert.equal(e.bundled.surah,surah);assert.equal(e.bundled.ayah,ayah);
  assert.equal(e.bundled.translationEdition,index.translationEdition);assert.equal(e.bundled.translationAuthor,index.translationAuthor);
  if(!chapters.has(surah))chapters.set(surah,await read(e.bundled.path));
  // ayah is the chapter-local index; number is a global Quran index in these files.
  const verse=chapters.get(surah).verses.find(v=>v.ayah===ayah);assert.ok(verse,m.id+': canonical verse exists');
  assert.equal(sha(verse.translation),e.bundled.verseTranslationSha256,m.id+': reviewed source wording has not drifted');
  assert.ok(Number.isInteger(e.bundled.start)&&Number.isInteger(e.bundled.end)&&e.bundled.start>=0&&e.bundled.end>e.bundled.start);
  assert.equal(verse.translation.slice(e.bundled.start,e.bundled.end),e.excerpt,m.id+': exact contiguous bundled excerpt');
  assert.equal(m.text.match(/«(.+)»/u)?.[1],e.excerpt,m.id+': displayed Quran quote is unchanged');
 }else{
  counts.hadith++;assert.equal(m.kind,'hadith');assert.equal(url.hostname,'sunnah.com');assert.equal(m.source,hadithSources.get(m.reference));
  assert.equal(m.id,'muslim-'+m.reference);assert.equal(m.sourceLabel,'Муслим, '+m.reference);
  assert.equal(e.collection,'Sahih Muslim');assert.equal(e.authenticity,'Sahih collection');assert.equal(e.treatment,'russian-rendering-of-meaning');
  assert.equal(e.excerpt,hadithMeaning.get(m.reference));assert.ok(m.text.startsWith(e.excerpt+'. '));assert.ok(m.text.endsWith('(смысл).'),'Hadith rendering is labelled as meaning');
  assert.ok(e.wordingOrigin.length>=40,'Translation origin is explicit');
 }
}
assert.deepEqual(counts,{quran:26,hadith:2});
for(const topic of ['поминание','благодарность','надежда','милость','помощь','дуа','добро'])assert.ok(topics.has(topic),'Balanced catalogue includes '+topic);
assert.match(records.get('quran-17-24').message,/^Дуа за родителей:/,'The pronoun in the parents’ supplication has context');
assert.deepEqual(records.get('quran-39-53').additionalContextSources,['https://quran.com/az-zumar/54']);
assert.equal(records.get('quran-39-53').excerpt,'Не отчаивайтесь в милости Аллаха','No isolated unconditional-forgiveness claim');
const source=await fs.readFile(new URL('../dist/js/daily-reminder-messages.js',import.meta.url),'utf8');
assert.doesNotMatch(source,/\b(?:import|fetch|setTimeout|setInterval|localStorage|sessionStorage|document|window)\b/,'The catalogue is pure data; scheduling and permissions belong elsewhere');
console.log('PASS:28 unique bounded daily messages,26 literal bundled Quran excerpts and2 identified Sahih Muslim meanings; HTTPS sources, context evidence, corpus hashes, source labels and non-coercive plain text. Online source review is recorded, not repeated by this offline check.');
