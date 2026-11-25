export const UI_LANGUAGES=Object.freeze([
 {code:'ru',name:'Русский',locale:'ru-RU',script:'Cyrl',direction:'ltr'},
 {code:'en',name:'English',locale:'en-GB',script:'Latn',direction:'ltr'},
 {code:'az',name:'Azərbaycan dili',locale:'az-AZ',script:'Latn',direction:'ltr'},
 {code:'tg',name:'Тоҷикӣ',locale:'tg-TJ',script:'Cyrl',direction:'ltr'},
 {code:'uz',name:'O‘zbekcha',locale:'uz-Latn-UZ',script:'Latn',direction:'ltr'},
 {code:'kk',name:'Қазақша',locale:'kk-KZ',script:'Cyrl',direction:'ltr'},
 {code:'de',name:'Deutsch',locale:'de-DE',script:'Latn',direction:'ltr'},
 {code:'ar',name:'العربية',locale:'ar',script:'Arab',direction:'rtl'}
].map(Object.freeze));
export const UI_LANGUAGE_CODES=Object.freeze(UI_LANGUAGES.map(item=>item.code));
export function languageInfo(code){return UI_LANGUAGES.find(item=>item.code===code)||UI_LANGUAGES[0];}
export function resolveInterfaceLanguage(preference,browserLanguages=[]){
 if(UI_LANGUAGE_CODES.includes(preference))return preference;
 if(preference!=='auto')return 'ru';
 for(const candidate of Array.isArray(browserLanguages)?browserLanguages:[]){
  if(typeof candidate!=='string'||candidate.length>80)continue;
  try{const locale=new Intl.Locale(candidate),info=UI_LANGUAGES.find(item=>item.code===locale.language);
   if(info&&(!locale.script||locale.script===info.script))return info.code;
  }catch{}
 }
 return 'en';
}
