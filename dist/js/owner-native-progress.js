export const NATIVE_BOOK_ID='muallim-sani-2010-3f6c0514';
export const NATIVE_LETTER_IDS=['hamza','ra','zay','mim','ta','nun','ya','ba','kaf','lam','waw','ha','fa','qaf','shin','sin','tha','sad','tah','jim','kha','haa','ghayn','ayn','dal','dad','dhal','zah'];
export const NATIVE_RULE_IDS=['madd-letters','exercises','shadda','tanwin','tanwin-shadda','hamza','sukun-pair','article','mim-sukun','nun-tanwin','qalqala','small-letters','ya-fatha','waw-alif','silent-letters','nun-kasra','stopping','sakt','madd-types','opening-letters','circle','marks','reading'];
export const NATIVE_UNIT_IDS=Object.freeze([...NATIVE_LETTER_IDS.map(id=>'letter-'+id),...NATIVE_RULE_IDS.map(id=>'rule-'+id)]);
const ids=new Set(NATIVE_UNIT_IDS);
export function validNativeProgress(v){return Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===4&&Object.keys(v).every(k=>['version','bookId','last','completed'].includes(k))&&v.version===1&&v.bookId===NATIVE_BOOK_ID&&(v.last===null||ids.has(v.last))&&Array.isArray(v.completed)&&v.completed.length<=NATIVE_UNIT_IDS.length&&new Set(v.completed).size===v.completed.length&&v.completed.every(id=>ids.has(id)));}
export function normalizeNativeProgress(v){return validNativeProgress(v)?structuredClone(v):{version:1,bookId:NATIVE_BOOK_ID,last:null,completed:[]};}
