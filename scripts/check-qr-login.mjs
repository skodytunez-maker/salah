import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{createHash}from 'node:crypto';
const root=new URL('../',import.meta.url);
const source=await fs.readFile(new URL('supabase/functions/qr-login/index.ts',root),'utf8');
const {createQrHandler,hashSecret}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let time=1000,active=true,mfa=false,minted=0,limited=false;
const rows=new Map(),uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
const store={
 create:async r=>{if(limited)return false;rows.set(r.id,{...r,state:'pending'});return true;},
 get:async(id,hash,approval)=>{const r=rows.get(id);return r&&(approval?r.approval_hash:r.poll_hash)===hash?r:null;},
 decide:async(id,hash,approve,caller)=>{const r=rows.get(id);if(!active||r.state!=='pending'||r.approval_hash!==hash||Date.parse(r.expires_at)<=time)return false;r.state=approve?'approved':'denied';if(approve){r.user_id=caller.id;r.session_id=caller.sessionId;}return true;},
 cancel:async(id,hash)=>{const r=rows.get(id);if(r?.poll_hash===hash&&['pending','approved'].includes(r.state))r.state='denied';},
 consume:async(id,hash)=>{const r=rows.get(id);if(!r||r.poll_hash!==hash||r.state!=='approved'||Date.parse(r.expires_at)<=time)return null;r.state='consumed';return r;}
};
const handler=createQrHandler({store,now:()=>time,identity:async token=>active&&token==='valid-phone-token'?{id:uid,sessionId:sid,requiresMfa:mfa,aal:'aal1'}:null,mint:async()=>{minted++;return active?'test-token-hash':null;}});
async function post(input,token,origin='https://skodytunez-maker.github.io'){
 const r=await handler(new Request('https://example.test/qr-login',{method:'POST',headers:{'Content-Type':'application/json','Origin':origin,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(input)}));return {status:r.status,data:await r.json()};
}
const create=async()=>{const r=await post({action:'create',device:'tablet'});assert.equal(r.status,200);assert.equal(r.data.expiresAt,time+120000);return r.data;};
const q=await create();assert.notEqual(q.pollSecret,q.approvalSecret);assert.equal(rows.get(q.id).poll_hash,await hashSecret(q.pollSecret));assert.ok(!JSON.stringify(rows.get(q.id)).includes(q.pollSecret));
assert.equal((await post({action:'create',device:'tablet'},null,'https://evil.example')).status,403);
assert.equal((await post({action:'create',device:'<script>'})).status,400);
assert.equal((await post({action:'create',device:'tablet',user_id:uid})).status,400);
limited=true;assert.equal((await post({action:'create',device:'phone'})).status,429);limited=false;
assert.equal((await post({action:'approve',id:q.id,secret:q.approvalSecret})).status,401);
assert.equal((await post({action:'approve',id:q.id,secret:q.approvalSecret},'invalid-phone-token')).status,401);
assert.equal((await post({action:'status',id:q.id,secret:q.approvalSecret})).status,410,'QR viewer cannot poll or redeem');
assert.equal((await post({action:'preview',id:q.id,secret:q.pollSecret},'valid-phone-token')).status,410);
assert.equal((await post({action:'redeem',id:q.id,secret:q.pollSecret})).status,409);assert.equal(minted,0);
mfa=true;assert.equal((await post({action:'approve',id:q.id,secret:q.approvalSecret},'valid-phone-token')).status,403);mfa=false;
const previews=await post({action:'preview',id:q.id,secret:q.approvalSecret},'valid-phone-token');assert.equal(previews.data.code,q.code);assert.equal(previews.data.device,'tablet');assert.ok(!JSON.stringify(previews.data).includes(q.pollSecret));
const approvals=await Promise.all([1,2].map(()=>post({action:'approve',id:q.id,secret:q.approvalSecret},'valid-phone-token')));assert.deepEqual(approvals.map(r=>r.status).sort(),[200,409]);
const result=await Promise.all([1,2].map(()=>post({action:'redeem',id:q.id,secret:q.pollSecret})));assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);assert.equal(minted,1);
assert.equal((await post({action:'approve',id:q.id,secret:q.approvalSecret},'valid-phone-token')).status,409);
const old=await create();time+=120001;assert.equal((await post({action:'approve',id:old.id,secret:old.approvalSecret},'valid-phone-token')).status,410);
const cancel=await create();await post({action:'cancel',id:cancel.id,secret:cancel.pollSecret});assert.equal((await post({action:'approve',id:cancel.id,secret:cancel.approvalSecret},'valid-phone-token')).status,409);
const revoked=await create();await post({action:'approve',id:revoked.id,secret:revoked.approvalSecret},'valid-phone-token');active=false;assert.equal((await post({action:'redeem',id:revoked.id,secret:revoked.pollSecret})).status,401);active=true;
assert.equal((await handler(new Request('https://example.test/qr-login'))).status,405);
const sql=await fs.readFile(new URL('supabase/qr-login-schema.sql',root),'utf8');assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on schema salah_qr_private from public, anon, authenticated/);assert.ok(!/grant.*(?:anon|authenticated)/i.test(sql));
const ui=await fs.readFile(new URL('dist/js/qr-login.js',root),'utf8');assert.match(ui,/history.replaceState/);assert.ok(!/localStorage|sessionStorage|console\.log/.test(ui));assert.match(ui,/Подтверждайте только свой экран/);assert.match(ui,/document.hidden/);
const vendor=await fs.readFile(new URL('dist/js/vendor/qrcode-generator.js',root),'utf8');assert.ok(vendor.startsWith('//-----'));assert.match(vendor,/Copyright \(c\) 2009 Kazuhiko Arase/);
const {default:qrcode}=await import(new URL('dist/js/vendor/qrcode-generator.js',root));const qr=qrcode(0,'M');qr.addData('https://skodytunez-maker.github.io/salah/#account?qr='+q.id+'&approve='+q.approvalSecret);qr.make();assert.ok(qr.getModuleCount()>20);assert.match(qr.createSvgTag({scalable:true}),/^<svg/);
console.log('PASS: QR proof separation, explicit confirmation, origin and MFA checks, expiration, cancellation, revoked sessions and concurrent single-use redemption.');
