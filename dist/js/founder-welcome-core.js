import{safeAwardState}from './quran-awards-core.js';
export const FOUNDER_WELCOME_FIELD='salah_founder_welcome_v1';
export const founderWelcomeKey=id=>'salah:founder-welcome:v1:'+id;
export function founderWelcomeEligible(user,awards){if(!user?.signedIn||!/^[-a-f0-9]{36}$/i.test(user.userId||''))return false;try{return safeAwardState(awards).counts.founder>0;}catch{return false;}}
export function confirmedFounderUser(user,id){return user?.id===id&&!!user.email_confirmed_at&&user.is_anonymous!==true;}

// This user-editable marker suppresses a presentation only; actual award eligibility always comes from the authenticated award response.
export function welcomeScope(id){if(typeof id!=='string')return '';let n=2166136261;for(const ch of id){n=Math.imul(n^ch.charCodeAt(0),16777619)>>>0;}return n.toString(36);}
export const founderWelcomePreference=id=>({shown:true,scope:welcomeScope(id)});
export const hasFounderWelcomeSeen=user=>!!user&&typeof user.id==='string'&&user.id.length===36&&user.user_metadata?.[FOUNDER_WELCOME_FIELD]?.shown===true&&user.user_metadata[FOUNDER_WELCOME_FIELD].scope===welcomeScope(user.id);
