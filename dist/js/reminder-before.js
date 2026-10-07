import{normalizeReminders,PRAYER_KEYS,BEFORE_MINUTES}from './reminder-events.js';
export function commonBeforeMinutes(value){const p=normalizeReminders(value),first=p.prayers.Fajr.beforeMinutes;return PRAYER_KEYS.every(key=>p.prayers[key].beforeMinutes===first)?first:null;}
export function withBeforeMinutes(value,minutes){const next=normalizeReminders(value);if(!BEFORE_MINUTES.includes(Number(minutes)))return next;for(const key of PRAYER_KEYS)next.prayers[key].beforeMinutes=Number(minutes);return next;}
