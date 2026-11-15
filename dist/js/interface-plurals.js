// CLDR cardinal rules: https://www.unicode.org/cldr/charts/49/supplemental/language_plural_rules.html
// Tajik is absent from some current Intl implementations; never substitute Russian rules for it.
import{languageInfo,UI_LANGUAGE_CODES}from './interface-languages.js';
const categories={ru:['one','few','many','other'],ar:['zero','one','two','few','many','other'],en:['one','other'],de:['one','other'],az:['one','other'],tg:['one','other'],uz:['one','other'],kk:['one','other']};
export function fallbackInterfacePluralCategory(code,count){
 if(typeof count!=='number'||!Number.isFinite(count))throw Error('plural_count_required');
 const n=Math.abs(count),integer=Number.isInteger(n),mod10=n%10,mod100=n%100;
 if(code==='tg')return Math.floor(n)===0||n===1?'one':'other';
 if(code==='ru'){
  if(!integer)return 'other';
  if(mod10===1&&mod100!==11)return 'one';
  if(mod10>=2&&mod10<=4&&(mod100<12||mod100>14))return 'few';
  return mod10===0||mod10>=5||mod100>=11&&mod100<=14?'many':'other';
 }
 if(code==='ar'){
  if(n===0)return 'zero';if(n===1)return 'one';if(n===2)return 'two';
  if(integer&&mod100>=3&&mod100<=10)return 'few';
  return integer&&mod100>=11&&mod100<=99?'many':'other';
 }
 return n===1?'one':'other';
}
export function createInterfacePluralRules(code){
 const selected=UI_LANGUAGE_CODES.includes(code)?code:'ru',locale=languageInfo(selected).locale;
 if(Intl.PluralRules.supportedLocalesOf([locale]).length)return new Intl.PluralRules(locale,{maximumFractionDigits:20});
 return{select:count=>fallbackInterfacePluralCategory(selected,count),resolvedOptions:()=>({locale:selected,type:'cardinal',pluralCategories:[...categories[selected]]})};
}
