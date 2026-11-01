import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {staffTabs,staffShell} from '../dist/js/staff-markup.js';
const source=await fs.readFile(new URL('../supabase/functions/owner-access/index.ts',import.meta.url),'utf8');
const {createOwnerHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222';
for(const role of ['admin','moderator','teacher']){
 let reads=0;
 const forbiddenRead=async()=>{reads++;throw Error('Private user data must not be read');};
 const handler=createOwnerHandler({
  getUser:async()=>({data:{user:{id,email_confirmed_at:'2026-11-02',app_metadata:{role,owner:true},user_metadata:{role,owner:true},factors:[{factor_type:'totp',status:'verified'}]}}}),
  getClaims:async()=>({data:{claims:{sub:id,session_id:session,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal:'aal2',role,owner:true}}}),
  isSessionActive:async()=>true,readUsers:forbiddenRead,readProfiles:forbiddenRead,readUser:forbiddenRead,readAvatar:forbiddenRead,fetcher:forbiddenRead
 });
 for(const query of ['mode=gate','mode=users&page=1','mode=user&ids='+id,'mode=user-avatar&ids='+id,'mode=profiles&ids='+id,'mode=stats&days=7','mode=releases']){
  const response=await handler(new Request('https://example.invalid?'+query,{headers:{Authorization:'Bearer verified-fixture-token',Origin:'https://skodytunez-maker.github.io'}}));
  assert.equal(response.status,403,role+' denied '+query);
  assert.deepEqual(await response.json(),{error:'owner_only'});
  assert.equal(response.headers.get('cache-control'),'no-store, private');
 }
 assert.equal(reads,0,role+' cannot trigger private reads, including photos, city and Quran checkpoint');
 const actor={id,role,owner:false,permissions:['support','reciters','wallpapers']};
 assert.ok(!staffTabs(actor).some(([key])=>['users','overview','activity','team'].includes(key)));
 assert.ok(!/Пользователи|owner-panel-users|#admin/.test(staffShell(actor,'messages')),'Staff interface never renders owner user directory');
}
console.log('PASS: admin, moderator and teacher denied every owner-data endpoint before reads, even with MFA and forged owner claims; no user-directory staff navigation.');
