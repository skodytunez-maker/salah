// Country fallback for established SALAH city names only. No network geolocation.
export const LOCATION_COUNTRIES={
 'россия':'Россия',ru:'Россия',russia:'Россия','российская федерация':'Россия',
 'азербайджан':'Азербайджан',az:'Азербайджан',azerbaijan:'Азербайджан',
 'таджикистан':'Таджикистан',tj:'Таджикистан',tajikistan:'Таджикистан',
 'узбекистан':'Узбекистан',uz:'Узбекистан',uzbekistan:'Узбекистан',
 'казахстан':'Казахстан',kz:'Казахстан',kazakhstan:'Казахстан',
 'кыргызстан':'Кыргызстан','киргизия':'Кыргызстан',kg:'Кыргызстан',kyrgyzstan:'Кыргызстан',
 'саудовская аравия':'Саудовская Аравия',sa:'Саудовская Аравия','saudi arabia':'Саудовская Аравия',
 'оаэ':'ОАЭ',ae:'ОАЭ','united arab emirates':'ОАЭ'
};
export const LOCATION_CITIES={
 'тюмень':['Тюмень','Россия'],tyumen:['Тюмень','Россия'],
 'омск':['Омск','Россия'],omsk:['Омск','Россия'],
 'буйнакск':['Буйнакск','Россия'],buynaksk:['Буйнакск','Россия'],
 'гянджа':['Гянджа','Азербайджан'],ganja:['Гянджа','Азербайджан'],
 'москва':['Москва','Россия'],'санкт-петербург':['Санкт-Петербург','Россия'],
 'казань':['Казань','Россия'],'екатеринбург':['Екатеринбург','Россия'],'уфа':['Уфа','Россия'],
 'тюкалинск':['Тюкалинск','Россия'],'тюльган':['Тюльган','Россия'],
 'медина':['Медина','Саудовская Аравия'],'мекка':['Мекка','Саудовская Аравия'],
 'душанбе':['Душанбе','Таджикистан'],'худжанд':['Худжанд','Таджикистан'],
 'ташкент':['Ташкент','Узбекистан'],'алматы':['Алматы','Казахстан'],
 'дубай':['Дубай','ОАЭ'],'тюп':['Тюп','Кыргызстан']
};
const locationClean=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,160):'';
const locationKey=value=>value.toLowerCase().replaceAll('ё','е');
export function canonicalAccountLocation(city,country=null){
 let name=locationClean(city),nation=locationClean(country);if(!name)return{city:null,country:null};
 nation=LOCATION_COUNTRIES[locationKey(nation)]||nation;
 const suffix=/^(.*),\s*([^,]+)$/.exec(name),end=suffix&&LOCATION_COUNTRIES[locationKey(suffix[2].trim())];
 if(end&&(!nation||nation===end)){name=suffix[1].trim();nation=nation||end;}
 const known=LOCATION_CITIES[locationKey(name)];if(known){name=known[0];nation=nation||known[1];}
 return{city:name||null,country:nation||null};
}
