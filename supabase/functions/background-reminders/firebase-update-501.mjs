import{UPDATE_501_COPY,UPDATE_501_UNTIL,UPDATE_501_TTL}from './update-501.mjs';
import{returnAllowedAt}from '../../../dist/js/owner-return-core.js';
import{notificationLanguage}from '../../../dist/js/notification-language.js';
import{createFirebaseSupportSender}from './firebase-support-sender.mjs';
export function firebaseUpdate501Payload(device,event,now){
 const language=notificationLanguage(event?.language);
 if(typeof device?.token!=='string'||device.token.length<100||device.token.length>4096||!/^[-\w:.]+$/.test(device.token)||event?.kind!=='app-update'||event.url!=='#settings'||event.body!==UPDATE_501_COPY[language]||!Number.isFinite(event.at)||event.at>now||!Number.isFinite(event.expiresAt)||event.expiresAt<=now||event.expiresAt>UPDATE_501_UNTIL||event.expiresAt-event.at>UPDATE_501_TTL||!returnAllowedAt(now,device.timeZone))throw Error('invalid_update_501_notice');
 // Notification-only, matching the existing owner-return background-display
 // pattern. No support/staff event or unsupported deep-link is fabricated.
 return{message:{token:device.token,notification:{title:'SALAH',body:UPDATE_501_COPY[language]},android:{priority:'normal',ttl:Math.max(1,Math.floor((event.expiresAt-now)/1000))+'s',collapse_key:'salah-update-501',notification:{tag:'salah-update-501',icon:'salah_notification'}}}};
}
export function createFirebaseUpdate501Sender(options){return createFirebaseSupportSender({...options,payloadBuilder:firebaseUpdate501Payload});}
