import assert from 'node:assert/strict';
import{createListeningCreditPolicy,createCreditMinuteMeter,listeningCreditNight,NIGHT_CREDIT_LIMIT}from '../dist/js/listening-credit-core.js';
import{createListeningMeter,addListeningDay}from '../dist/js/reciter-popularity-core.js';
process.env.TZ='Asia/Yekaterinburg';
const zone='Asia/Yekaterinburg',time=value=>Date.parse(value),sum=rows=>rows.reduce((n,row)=>n+row.seconds,0),token='11111111-1111-4111-8111-111111111111',otherToken='22222222-2222-4222-8222-222222222222';
let clock=time('2026-11-14T22:59:00+05:00'),saved=null,source='guest:device';
const create=()=>createListeningCreditPolicy({now:()=>clock,timeZone:()=>zone,source:()=>source,readState:()=>structuredClone(saved),writeState:value=>saved=structuredClone(value)});
let policy=create();assert.equal(NIGHT_CREDIT_LIMIT,3600000);assert.equal(policy.status().paused,false);
assert.equal(policy.status(time('2026-11-14T23:59:59.999+05:00')).night,false);
assert.equal(policy.status(time('2026-11-15T00:00:00+05:00')).night,true,'Inactivity pauses credit at exactly 60 minutes');
clock=time('2026-11-15T01:00:00+05:00');assert.equal(policy.status().night,true);assert.equal(sum(policy.segments(7260,clock)),3660,'The daytime minute and only the first 60 night minutes are eligible after a suspended callback');
assert.equal(sum(policy.segments(1800,clock)),0,'Blocked night seconds never become delayed credit');
const persisted=structuredClone(saved);policy=create();assert.equal(policy.status().paused,true,'Reloading does not grant another night window');assert.deepEqual(saved,persisted);
policy.action(clock);assert.equal(policy.status().paused,false);clock+=10000;assert.equal(sum(policy.segments(10,clock)),10,'New activity resumes only newly measured advancement');
clock=time('2026-11-15T07:00:00+05:00');assert.equal(policy.status().paused,false,'The documented night policy ends at 07:00');assert.equal(sum(policy.segments(3600,clock)),0,'A callback at 07:00 cannot backfill the preceding blocked hour');
clock+=3600000;assert.equal(sum(policy.segments(3600,clock)),3600,'Daytime listening is not limited by inactivity');
assert.equal(listeningCreditNight(clock,'invalid/zone'),null);
for(const [start,end,hours]of [['2026-10-31T23:00:00-04:00','2026-11-01T07:00:00-05:00',9],['2027-03-13T23:00:00-05:00','2027-03-14T07:00:00-04:00',7]]){
 let now=time(start);const ny=createListeningCreditPolicy({now:()=>now,timeZone:()=> 'America/New_York'}),night=listeningCreditNight(now,'America/New_York');assert.equal((night.end-night.start)/3600000,hours);now=time(end);assert.equal(sum(ny.segments(hours*3600,now)),3600,'DST keeps a real 60-minute window instead of extending night credit');
}
// Manual holds need a later actual action, not a registration/read/poll/visibility callback.
policy.receive(source,{creditPaused:true,creditPauseToken:token});assert.equal(policy.status().manual,true);assert.equal(policy.resumeToken(source),null);policy.receive(source,{creditPaused:true,creditPauseToken:token});assert.equal(policy.resumeToken(source),null);
clock+=60000;assert.equal(sum(policy.segments(60,clock)),0);source='account:user';policy.action(clock);assert.equal(policy.resumeToken('guest:device'),null,'Another account action cannot acknowledge the guest hold');source='guest:device';policy.action(clock);assert.equal(policy.resumeToken(source),token);
policy.receive(source,{creditPaused:true,creditPauseToken:otherToken});assert.equal(policy.resumeToken(source),null,'A newly rotated server token needs a new action');policy.action(clock);assert.equal(policy.resumeToken(source),otherToken);
policy=create();assert.equal(policy.resumeToken(source),otherToken,'Restart may retry an acknowledgement that was already qualified by a trusted action; it never invents a new one');
policy.receive(source,{creditPaused:false},{resumeCredit:token});assert.equal(policy.status().manual,true,'A stale acknowledgement cannot clear a newer hold');policy.receive(source,{creditPaused:false},{resumeCredit:otherToken});assert.equal(policy.status().manual,false);
// Audio history remains complete while eligible accumulators omit excluded seconds.
clock=time('2026-11-16T23:15:00+05:00');saved=null;policy=create();let full=0,eligible=0,minutes=0;const fullDays={},creditDays={},minuteMeter=createCreditMinuteMeter({onMinute:()=>minutes++}),reciter='ar.alafasy';
const meter=createListeningMeter({onProgress:(_,seconds)=>{full+=seconds;addListeningDay(fullDays,reciter,seconds,clock);for(const part of policy.segments(seconds,clock)){eligible+=part.seconds;addListeningDay(creditDays,reciter,part.seconds,part.at);minuteMeter.progress(reciter,part.seconds,part.at);}}}),audio=position=>({reciter,surah:{number:4},status:'playing',positionSeconds:position});
meter.sample(audio(0),clock,true);clock+=7200000;meter.sample(audio(7200),clock,true);assert.equal(full,7200);assert.equal(eligible,3600);assert.equal(minutes,60);assert.equal(creditDays['2026-11-16'][reciter],2700);assert.equal(creditDays['2026-11-17'][reciter],900,'Eligible dates split across midnight without assigning skipped seconds');
policy.action(clock);clock+=10000;meter.sample(audio(7210),clock,true);assert.equal(full,7210);assert.equal(eligible,3610,'Resuming never promotes full personal history into the competition ledger');minuteMeter.reset();minuteMeter.progress(reciter,50,clock);assert.equal(minutes,60,'Reset discards only an unfinished shared minute');
console.log('PASS: selected-city night60, suspended callbacks, daytime/DST boundaries, durable idle policy, token-specific trusted acknowledgement, isolated scopes, full personal history and separate eligible day/minute totals without catch-up.');
