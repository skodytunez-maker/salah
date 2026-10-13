export const ALPHABET_SOURCE='https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-9/';
const rows=[
 ['alif','ا','Алиф','Alif'],['ba','ب','Ба','Bāʼ'],['ta','ت','Та','Tāʼ'],['tha','ث','Са','Thāʼ'],
 ['jim','ج','Джим','Jīm'],['ha','ح','Ха','Ḥāʼ'],['kha','خ','Ха','Khāʼ'],['dal','د','Даль','Dāl'],
 ['dhal','ذ','Заль','Dhāl'],['ra','ر','Ра','Rāʼ'],['zay','ز','Зай','Zāy'],['sin','س','Син','Sīn'],
 ['shin','ش','Шин','Shīn'],['sad','ص','Сад','Ṣād'],['dad','ض','Дад','Ḍād'],['tta','ط','Та','Ṭāʼ'],
 ['za','ظ','За','Ẓāʼ'],['ayn','ع','Айн','ʿAyn'],['ghayn','غ','Гайн','Ghayn'],['fa','ف','Фа','Fāʼ'],
 ['qaf','ق','Каф','Qāf'],['kaf','ك','Кяф','Kāf'],['lam','ل','Лям','Lām'],['mim','م','Мим','Mīm'],
 ['nun','ن','Нун','Nūn'],['heh','ه','Ха','Hāʼ'],['waw','و','Вав','Wāw'],['ya','ي','Йа','Yāʼ']
];
export const RIGHT_JOINING=Object.freeze(['alif','dal','dhal','ra','zay','waw']);
export const ARABIC_LETTERS=Object.freeze(rows.map(([id,char,name,latin],index)=>Object.freeze({id,char,name,latin,index,rightOnly:RIGHT_JOINING.includes(id)})));
export const letterById=id=>ARABIC_LETTERS.find(x=>x.id===id)||null;
export function letterForms(letter){
 const l=letterById(typeof letter==='string'?letter:letter?.id);if(!l||!letterById(l.id))return [];
 const c=l.char,t='\u0640';
 return [{key:'isolated',label:'Отдельно',text:c},{key:'initial',label:'В начале',text:l.rightOnly?c:c+t},{key:'medial',label:'В середине',text:t+c+(l.rightOnly?'':t)},{key:'final',label:'В конце',text:t+c}];
}
export function normalizeAlphabetProgress(value){
 const reviewed=Array.isArray(value?.reviewed)?[...new Set(value.reviewed.filter(id=>typeof id==='string'&&letterById(id)))].slice(0,28):[];
 return {version:1,last:letterById(value?.last)?.id||null,reviewed};
}
export function validAlphabetProgress(v){
 return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['version','last','reviewed'].includes(k))&&v.version===1&&(v.last===null||!!letterById(v.last))&&Array.isArray(v.reviewed)&&v.reviewed.length<=28&&new Set(v.reviewed).size===v.reviewed.length&&v.reviewed.every(id=>typeof id==='string'&&!!letterById(id));
}
export function reviewLetter(progress,id){
 const p=normalizeAlphabetProgress(progress);if(!letterById(id))return p;
 return {version:1,last:id,reviewed:p.reviewed.includes(id)?p.reviewed.filter(x=>x!==id):[...p.reviewed,id]};
}
export function alphabetQuestion(n,start=0){
 if(!Number.isInteger(n)||n<0||n>=8)return null;
 const base=Number.isInteger(start)&&start>=0&&start<28?start:0,target=ARABIC_LETTERS[(base+n*5)%28];
 const similar=[['ba','ta','tha','nun','ya'],['jim','ha','kha'],['dal','dhal'],['ra','zay'],['sin','shin'],['sad','dad'],['tta','za'],['ayn','ghayn'],['fa','qaf']];
 const ids=[target.id,...(similar.find(g=>g.includes(target.id))||[]).filter(id=>id!==target.id)];
 for(let i=1;ids.length<4;i++){const id=ARABIC_LETTERS[(target.index+i*3)%28].id;if(!ids.includes(id))ids.push(id);}
 const choices=ids.slice(0,4).map(letterById),rotate=n%4;
 return {target,form:letterForms(target)[n%4],choices:[...choices.slice(rotate),...choices.slice(0,rotate)]};
}
