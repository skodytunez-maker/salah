const reciter='ar.yasseraldossaricontinuous';
const versions=new Map([
 [1,'08237b30a2fcdabe9df6633208442395b5bbb0cd0e612f15bb43de5d0ed72a33'],
 [2,'d390ae18bf320e6073e4736a72e8dd4a24ea363a80ab4696281e2b990d2aeb25']
]);
const timings=new Map();

async function loadWords(surah){
 if(!timings.has(surah)){
  const file='dausari-'+String(surah).padStart(3,'0')+'.json';
  const pending=(async()=>{
   const response=await fetch(new URL('../data/mushaf-word/'+file,import.meta.url));
   if(!response.ok)throw Error('Mushaf word timings unavailable');
   const data=await response.json();
   if(data.reciter!==reciter||data.surah!==surah||data.audio?.sha256!==versions.get(surah)||!Array.isArray(data.words))throw Error('Wrong recording timings');
   let boundary=0;
   for(const row of data.words){
    if(!Array.isArray(row)||row.length!==4||!row.every(Number.isSafeInteger)||row[0]<1||row[1]<1||row[2]<boundary||row[3]<=row[2])throw Error('Invalid word timing');
    boundary=row[3];
   }
   return data.words;
  })().catch(error=>{timings.delete(surah);throw error;});
  timings.set(surah,pending);
 }
 return timings.get(surah);
}

export function mushafWordAt(words,milliseconds){
 if(!Number.isFinite(milliseconds))return null;
 let low=0,high=words.length-1;
 while(low<=high){
  const middle=Math.floor((low+high)/2),item=words[middle];
  if(milliseconds<item[2])high=middle-1;
  else if(milliseconds>=item[3])low=middle+1;
  else return item;
 }
 return null;
}

export function mountMushafWordFollow(paper,{load=loadWords}={}){
 let state=null,loadedSurah=null,words=null,active=null,closed=false;
 const clear=()=>{active?.classList.remove('is-spoken-word');active=null;};
 const reset=()=>{clear();paper.classList.remove('has-word-timing');};
 const paint=()=>{
  if(closed||!words||state.status!=='playing'||state.awaitingAudioClock||!Number.isFinite(state.trackPositionSeconds)){reset();return;}
  paper.classList.toggle('has-word-timing',!!paper.querySelector('.mushaf-print-word[data-verse^="'+loadedSurah+':"]'));
  const word=mushafWordAt(words,state.trackPositionSeconds*1000);
  const next=word?paper.querySelector('.mushaf-print-word[data-verse="'+loadedSurah+':'+word[0]+'"][data-word="'+word[1]+'"]'):null;
  if(active===next)return;
  clear();
  if(next){active=next;active.classList.add('is-spoken-word');}
 };
 return {
  update(nextState){
   if(closed)return;
   state=nextState;
   const number=state.surah?.number;
   const supported=state.reciter===reciter&&versions.has(number);
   if(!supported){loadedSurah=null;words=null;reset();return;}
   if(number!==loadedSurah){
    reset();loadedSurah=number;words=null;
    void load(number).then(value=>{
     if(closed||loadedSurah!==number)return;
     words=value;paint();
    }).catch(()=>{});
   }
   paint();
  },
  dispose(){closed=true;reset();}
 };
}
