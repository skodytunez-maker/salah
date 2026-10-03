// Read public primary-source records on the build host; phones download only the compact snapshot.
import {readFile,writeFile} from 'node:fs/promises';
import {validateHaramainSchedule,saudiDay} from '../dist/js/haramain-schedule.js';
const target=new URL('../dist/data/haramain-schedule.json',import.meta.url);
let previous;try{previous=validateHaramainSchedule(JSON.parse(await readFile(target,'utf8')))}catch{}
const today=saudiDay(Date.now()),monthStart=new Date(today.slice(0,7)+'-01T00:00:00Z');
monthStart.setUTCMonth(monthStart.getUTCMonth()-1);const firstDay=monthStart.toISOString().slice(0,10);
const rows=[];
try{
 for(const mosque of ['mecca','madinah']){
  const response=await fetch('https://haramainflagsapi.prh.gov.sa/prayers?mosque='+mosque+'&take=1000000',{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw Error('Primary source unavailable: '+response.status);
  // Enforce a bound before parsing. Public endpoint currently contains a few thousand records.
  let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>15*1024*1024)throw Error('Source too large');chunks.push(chunk)}
  const source=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!Array.isArray(source)||source.length>20000)throw Error('Unexpected source');
  const chosen=new Map();
  for(const row of source){
   const imam=[row.imam?.firstName,row.imam?.middleName,row.imam?.lastName].filter(value=>typeof value==='string'&&value.trim()).join(' ').trim();
   if(row.deletedAt||row.isExtra||row.mosque!==mosque||!['fajr','dhuhr','asr','maghrib','isha'].includes(row.prayer)||!imam||!Number.isFinite(Date.parse(row.datetimestampz)))continue;
   const day=saudiDay(row.datetimestampz);if(day<firstDay)continue;
   const key=day+':'+row.prayer,old=chosen.get(key);
   const updated=Date.parse(row.updatedAt)||0;
   if(!old||updated>=old.updated)chosen.set(key,{updated,day,mosque,prayer:row.prayer,at:new Date(row.datetimestampz).toISOString(),imam});
  }
  if(!chosen.size)throw Error('No recent source records for '+mosque);
  rows.push(...[...chosen.values()].map(({updated,...row})=>row));
 }
 const snapshot=validateHaramainSchedule({edition:1,fetchedAt:new Date().toISOString(),rows:rows.sort((a,b)=>a.day.localeCompare(b.day)||a.mosque.localeCompare(b.mosque))});
 await writeFile(target,JSON.stringify(snapshot)+'\n');console.log('Updated official snapshot: '+rows.length+' records, '+firstDay+' onward.');
}catch(error){
 if(!previous)throw error;
 console.log('Official source unavailable; retaining snapshot from '+previous.fetchedAt+'. '+error.message);
}
