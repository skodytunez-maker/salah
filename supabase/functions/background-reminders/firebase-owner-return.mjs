import {RETURN_UUID,RETURN_TTL,returnText,returnAllowedAt} from '../../../dist/js/owner-return-core.js';
import {createFirebaseSupportSender} from './firebase-support-sender.mjs';
export function firebaseOwnerReturnPayload(device,event,now){
 if(!RETURN_UUID.test(device?.user_id||'')||typeof device.token!=='string'||device.token.length<100||device.token.length>4096||!/^[-\w:.]+$/.test(device.token)||event?.kind!=='owner-return'||!RETURN_UUID.test(event.eventId||'')||event.user!==device.user_id||!returnText(event.body)||!Number.isFinite(event.at)||event.at>now||!Number.isFinite(event.expiresAt)||event.expiresAt<=now||event.expiresAt-event.at>RETURN_TTL||!returnAllowedAt(now,event.timeZone))throw Error('invalid_owner_return_notice');
 // Display notification: the existing Android FCM SDK can show this while the
 // app is backgrounded. It is not a fabricated support conversation/message.
 return{message:{token:device.token,notification:{title:'SALAH',body:returnText(event.body)},data:{kind:'owner-return',event:event.eventId},android:{priority:'normal',ttl:Math.max(1,Math.floor((event.expiresAt-now)/1000))+'s',collapse_key:'salah-owner-return',notification:{tag:'salah-owner-return-'+event.eventId,icon:'salah_notification'}}}};
}
export function createFirebaseOwnerReturnSender(options){return createFirebaseSupportSender({...options,payloadBuilder:firebaseOwnerReturnPayload});}
