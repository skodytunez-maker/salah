import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {ARABIC_LETTERS} from '../dist/js/arabic-alphabet-core.js';
import {ALPHABET_RECORDINGS} from '../dist/js/arabic-alphabet-recordings.js';
const w=new Window({url:'http://127.0.0.1:19077/#knowledge?view=alphabet&letter=alif'});
Object.assign(globalThis,{window:w,document:w.document,location:w.location,localStorage:w.localStorage});
w.document.body.innerHTML='<main id="app"></main><div id="toast" hidden></div>';
const host=w.document.querySelector('main');let count=0;
const yes=(v,m)=>{assert.ok(v,m);count++;};
class FakeAudio{
 static instances=[];static rejectNext=false;static defer=false;
 constructor(src){this.src=src;this.paused=true;FakeAudio.instances.push(this);}
 play(){this.paused=false;this.onplaying?.();if(FakeAudio.defer)return new Promise((_,reject)=>this.reject=reject);if(FakeAudio.rejectNext){FakeAudio.rejectNext=false;return Promise.reject(Error('offline'));}return Promise.resolve();}
 pause(){this.paused=true;this.onpause?.();}removeAttribute(){this.src='';}load(){}
}
globalThis.Audio=FakeAudio;
const {showArabicAlphabet}=await import('../dist/js/arabic-alphabet.js');
const {stopAlphabetName}=await import('../dist/js/arabic-alphabet-name-audio.js');
const {claimPlayback}=await import('../dist/js/media-playback-focus.js');
const {foregroundAudioBusy}=await import('../dist/js/audio-focus.js');
function show(id){showArabicAlphabet(host,{hash:'#knowledge?view=alphabet&letter='+id});}
for(const l of ARABIC_LETTERS){
 const before=FakeAudio.instances.length;show(l.id);yes(FakeAudio.instances.length===before,'No autoplay '+l.id);
 const b=host.querySelector('[data-alphabet-name]');yes(b?.getAttribute('aria-label')==='Послушать название буквы: '+l.name&&b.querySelector('.alphabet-glyph')?.textContent===l.char,'Explicit button '+l.id);
 b.click();yes(FakeAudio.instances.at(-1).src===ALPHABET_RECORDINGS[l.id]&&foregroundAudioBusy(),'Correct mapping '+l.id);
 FakeAudio.instances.at(-1).onended();yes(b.getAttribute('aria-pressed')==='false'&&!foregroundAudioBusy(),'Completion resets '+l.id);
}
show('alif');let b=host.querySelector('[data-alphabet-name]');b.click();b.click();yes(FakeAudio.instances.at(-1).paused&&!foregroundAudioBusy(),'Stop works');b.click();claimPlayback('other');yes(FakeAudio.instances.at(-1).paused&&!foregroundAudioBusy(),'Other audio wins');
b.click();w.dispatchEvent(new w.HashChangeEvent('hashchange'));yes(FakeAudio.instances.at(-1).paused&&!foregroundAudioBusy(),'Navigation stops');
b.click();host.querySelector('[data-quiz-start]').click();yes(FakeAudio.instances.at(-1).paused&&!foregroundAudioBusy(),'Practice stops audio');
show('mim');b=host.querySelector('[data-alphabet-name]');FakeAudio.rejectNext=true;b.click();await new Promise(r=>setTimeout(r,0));yes(host.querySelector('[role=status]').textContent.includes('Не удалось')&&!foregroundAudioBusy(),'Network error releases focus');b.click();yes(foregroundAudioBusy(),'Retry works');
FakeAudio.defer=true;show('ba');host.querySelector('[data-alphabet-name]').click();const old=FakeAudio.instances.at(-1);show('ta');FakeAudio.defer=false;host.querySelector('[data-alphabet-name]').click();old.reject(Error('late'));await new Promise(r=>setTimeout(r,0));yes(foregroundAudioBusy()&&FakeAudio.instances.at(-1).src===ALPHABET_RECORDINGS.ta,'Stale failure cannot stop new clip');
stopAlphabetName();yes(!foregroundAudioBusy(),'Stop clears focus');
const sw=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');for(const p of ['js/arabic-alphabet-name-audio.js','js/arabic-alphabet-recordings.js','data/alphabet-audio-sources.json','alphabet-audio-credits.html'])yes(sw.includes('./'+p),'Offline asset '+p);
yes(Object.values(ALPHABET_RECORDINGS).every(url=>/^\.\/assets\/alphabet-audio\/[a-z]+\.mp3$/.test(url)),'All28 letter names play from bundled approved recordings without an external audio host');
const {showNativeMuallim}=await import('../dist/js/muallim-native.js');
const {NATIVE_BOOK_ID,NATIVE_UNIT_IDS}=await import('../dist/js/owner-native-progress.js');
const nativeGlyph=id=>({hamza:'ء',tah:'ط',zah:'ظ',ha:'ه',haa:'ح'}[id]||ARABIC_LETTERS.find(l=>l.id===id)?.char||'');
const curriculum={bookId:NATIVE_BOOK_ID,blocks:[],units:NATIVE_UNIT_IDS.map((id,index)=>({id,index,title:id,goal:'',explanation:[],rows:[],practice:[],questions:[],glyph:id.startsWith('letter-')?nativeGlyph(id.slice(7)):''}))};
for(const nativeId of NATIVE_UNIT_IDS.filter(id=>id.startsWith('letter-'))){
 const char=nativeGlyph(nativeId.slice(7));const id=char==='ء'?'hamza':ARABIC_LETTERS.find(l=>l.char===char)?.id;const l={id,char};yes(Boolean(id),'Matching private letter unit '+nativeId);
 const before=FakeAudio.instances.length;const dispose=showNativeMuallim(host,{curriculum,hash:'#knowledge?preview=muallim&unit='+nativeId});
 const control=host.querySelector('[data-alphabet-name]');yes(control?.querySelector('.alphabet-glyph')?.textContent===l.char,'Private course has a tappable letter '+l.id);
 yes(FakeAudio.instances.length===before&&!host.querySelector('audio[controls]'),'No player or autoplay '+l.id);control.click();yes(FakeAudio.instances.at(-1).src===ALPHABET_RECORDINGS[l.id],'Same approved clip '+l.id);
 host.querySelector('[data-tab=read]').click();yes(FakeAudio.instances.at(-1).paused&&!foregroundAudioBusy(),'Tab change stops letter '+l.id);
 control.click();dispose();yes(FakeAudio.instances.at(-1).paused&&!foregroundAudioBusy(),'Closing private course stops audio '+l.id);
}
await w.happyDOM.close();console.log('PASS '+count+' alphabet-name checks');
