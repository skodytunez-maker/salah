export const AUDIENCE_KEY='salah:audience-v1';
export function groupForBirthDate(value,today=new Date()){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [year,month,day]=value.split('-').map(Number),birth=new Date(Date.UTC(year,month-1,day));
 const current=[today.getFullYear(),today.getMonth()+1,today.getDate()];
 if(year<1900||birth.getUTCFullYear()!==year||birth.getUTCMonth()!==month-1||birth.getUTCDate()!==day||value>current.map((n,i)=>i?String(n).padStart(2,'0'):n).join('-'))return null;
 const age=current[0]-year-(current[1]<month||current[1]===month&&current[2]<day?1:0);
 return age>=18?'adult':'restricted';
}
export function audienceRecord(group){if(!['adult','restricted'].includes(group))throw Error('invalid_audience');return {version:1,group};}
export function readAudience(storage){try{const value=JSON.parse(storage.getItem(AUDIENCE_KEY)||'null');return value&&Object.keys(value).length===2&&value.version===1&&['adult','restricted'].includes(value.group)?value.group:null;}catch{return null;}}
export function saveAudience(storage,group){try{storage.setItem(AUDIENCE_KEY,JSON.stringify(audienceRecord(group)));return readAudience(storage)===group;}catch{return false;}}
