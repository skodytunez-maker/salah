export const DEFAULT_SHORT_DHIKR='subhanallah';
export const SHORT_DHIKR_PRESETS=Object.freeze([
 {id:'subhanallah',title:'СубханаЛлах',arabic:'سُبْحَانَ اللَّهِ',meaning:'Пречист Аллах'},
 {id:'alhamdulillah',title:'АльхамдулиЛлях',arabic:'الْحَمْدُ لِلَّهِ',meaning:'Хвала Аллаху'},
 {id:'allahu-akbar',title:'Аллаху Акбар',arabic:'اللَّهُ أَكْبَرُ',meaning:'Аллах Велик'},
 {id:'salawat',title:'Салават',arabic:'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ',meaning:'О Аллах, благослови Мухаммада'},
 {id:'istighfar',title:'АстагфируЛлах',arabic:'أَسْتَغْفِرُ اللَّهَ',meaning:'Прошу прощения у Аллаха'},
 {id:'tahlil',title:'Ля иляха илляЛлах',arabic:'لَا إِلَٰهَ إِلَّا اللَّهُ',meaning:'Нет божества, достойного поклонения, кроме Аллаха'},
 {id:'hawqala',title:'Ля хауля ва ля куввата',arabic:'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',meaning:'Нет силы и мощи, кроме как от Аллаха'},
 {id:'tasbih-praise',title:'СубханаЛлахи ва бихамдих',arabic:'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',meaning:'Пречист Аллах, и Ему хвала'}
]);
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const ownId=id=>typeof id==='string'&&/^custom-[a-f0-9]{32}$/.test(id);
const validText=(v,max,multiline=false)=>typeof v==='string'&&v.trim().length>0&&v===v.trim()&&v.length<=max&&!(multiline?/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/:/[\x00-\x1f\x7f]/).test(v);
const validCount=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000000000;
const validTarget=v=>Number.isInteger(v)&&v>=0&&v<=100000;
export function shortDhikr(round){return SHORT_DHIKR_PRESETS.find(p=>p.id===(round.selected||DEFAULT_SHORT_DHIKR))||(round.custom||[]).find(p=>p.id===round.selected);}
export function validCustomDhikr(v){return record(v)&&Object.keys(v).every(k=>['id','title','text'].includes(k))&&ownId(v.id)&&validText(v.title,60)&&validText(v.text,240,true);}
export function shortRoundState(value){
 if(value.selected===undefined&&value.rounds===undefined&&value.custom===undefined)return null;
 if(typeof value.selected!=='string'||!record(value.rounds)||!Array.isArray(value.custom)||value.custom.length>20||value.custom.some(v=>!validCustomDhikr(v)))throw Error('invalid_short_counter');
 const custom=value.custom.map(v=>({...v}));if(new Set(custom.map(v=>v.id)).size!==custom.length)throw Error('invalid_short_counter');
 const ids=new Set([...SHORT_DHIKR_PRESETS.map(p=>p.id),...custom.map(v=>v.id)]);
 if(!ids.has(value.selected)||Object.keys(value.rounds).length>28)throw Error('invalid_short_counter');
 const rounds={};for(const[id,round]of Object.entries(value.rounds)){if(!ids.has(id)||!record(round)||Object.keys(round).some(k=>!['count','target'].includes(k))||!validCount(round.count)||!validTarget(round.target))throw Error('invalid_short_counter');rounds[id]={count:round.count,target:round.target};}
 if(rounds[value.selected]&&(rounds[value.selected].count!==value.count||rounds[value.selected].target!==value.target))throw Error('inconsistent_short_counter');
 rounds[value.selected]={count:value.count,target:value.target};return{selected:value.selected,rounds,custom};
}
export function selectShortRound(round,id){
 const state=shortRoundState(round)||{selected:DEFAULT_SHORT_DHIKR,rounds:{[DEFAULT_SHORT_DHIKR]:{count:round.count,target:round.target}},custom:[]};
 if(!SHORT_DHIKR_PRESETS.some(p=>p.id===id)&&!state.custom.some(p=>p.id===id))throw Error('unknown_short_counter');
 state.rounds[state.selected]={count:round.count,target:round.target};const selected=state.rounds[id]||{count:0,target:0};return{...round,...state,...selected,selected:id,rounds:{...state.rounds,[id]:{...selected}}};
}
