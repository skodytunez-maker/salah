import conversationThemes from './i18n/conversationThemes/index.js';
import{UI_LANGUAGE_CODES}from './interface-languages.js';
import ru from './i18n/ru.js';
import en from './i18n/en.js';
import az from './i18n/az.js';
import tg from './i18n/tg.js';
import uz from './i18n/uz.js';
import kk from './i18n/kk.js';
import de from './i18n/de.js';
import ar from './i18n/ar.js';
import settings from './i18n/settings/index.js';
import quran from './i18n/quran/index.js';
import practice from './i18n/practice/index.js';
import notifications from './i18n/notifications/index.js';
import account from './i18n/account/index.js';
import translations from './i18n/translations/index.js';
import learning from './i18n/learning/index.js';
import ranking from './i18n/ranking/index.js';
import team from './i18n/team/index.js';
import publicUi from './i18n/public/index.js';
import owner from './i18n/owner/index.js';
import staff from './i18n/staff/index.js';
import classroom from './i18n/classroom/index.js';
import extra from './i18n/extra/index.js';
import lessons from './i18n/lessons/index.js';
import release from './i18n/release/index.js';
import subscription from './i18n/subscription/index.js';
import nativeSupport from './i18n/nativeSupport/index.js';
import offlineaudio from './i18n/offlineaudio/index.js';
import offlineRelease from './i18n/offlineRelease/index.js';
import offline from './i18n/offline/index.js';
import prayerOffline from './i18n/prayerOffline/index.js';
import skyRelease from './i18n/skyRelease/index.js';
import messageDeletion from './i18n/messageDeletion/index.js';
import experienceRelease from './i18n/experience-release/index.js';
import supportConversation from './i18n/supportConversation/index.js';
import faith from './i18n/faith/index.js';
import videoStories from './i18n/video-stories/index.js';
const groups=[{ru,en,az,tg,uz,kk,de,ar},settings,quran,practice,notifications,account,translations,learning,ranking,team,publicUi,owner,staff,classroom,extra,lessons,release,subscription,nativeSupport,offlineaudio,offlineRelease,offline,prayerOffline,skyRelease,messageDeletion,experienceRelease,supportConversation,conversationThemes,faith,videoStories];
const merged=Object.create(null);
for(const code of UI_LANGUAGE_CODES){
 const messages=Object.create(null);
 for(const group of groups){
  if(!group[code]||typeof group[code]!=='object'||Array.isArray(group[code]))throw Error('missing_ui_catalogue_'+code);
  for(const[key,value]of Object.entries(group[code])){if(Object.hasOwn(messages,key))throw Error('duplicate_ui_key_'+key);messages[key]=value;}
 }
 merged[code]=Object.freeze(messages);
}
export const UI_CATALOGUES=Object.freeze(merged);
