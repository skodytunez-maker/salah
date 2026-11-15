import{uiMessage,uiLeaf}from './practice-i18n.js';
import{esc}from './ui.js';
export const DUA_CATEGORY_SOURCE=Object.freeze({"sleep":"Сон","home":"Дом","food":"Еда","cleanliness":"Омовение","mosque":"Мечеть","everyday":"В течение дня","family":"Семья и благо","prayer":"Молитва и выбор","travel":"В дороге","distress":"Тревога и трудности","health":"Здоровье"});
export const duaCategoryKey=id=>Object.hasOwn(DUA_CATEGORY_SOURCE,id)?'duaUi.categories.'+id:null;
export function duaCategoryLabel(id,fallback=''){const key=duaCategoryKey(id);return key?uiMessage(key,fallback):fallback;}
export function duaCategoryLeaf(id,fallback=''){const key=duaCategoryKey(id);return key?uiLeaf(key,fallback):esc(fallback);}
