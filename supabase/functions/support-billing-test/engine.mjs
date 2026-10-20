export const TERMS_VERSION='salah-monthly-test-2026-10-20';
export const RETURN_URL='https://skodytunez-maker.github.io/salah/billing-sandbox.html#support-salah?billing=test';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail=code=>{throw Error(code);};
export const validAmount=n=>Number.isSafeInteger(n)&&n>=150&&n<=15000;
export function nextMonth(value,anchor){
 const d=new Date(value),target=d.getUTCMonth()+1;
 d.setUTCDate(1);d.setUTCMonth(target);
 d.setUTCDate(Math.min(anchor,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));
 return d.toISOString();
}
const initial=shop=>({environment:'test',shop,status:'none',revision:0,operations:[],method:null,nextChargeAt:null});
export function publicState(s){
 return {environment:'test',paymentEnabled:false,testPaymentEnabled:true,status:s.status,amount:s.amount??null,nextChargeAt:s.nextChargeAt,
 method:s.method?{type:'bank_card',last4:s.method.last4}:null,
 needsReview:s.operations.some(o=>o.review===true),
 inFlight:s.operations.some(o=>!o.finished&&o.paymentId),termsVersion:TERMS_VERSION};
}
export function createEngine({store,provider,shop,now=()=>Date.now(),randomUUID=()=>crypto.randomUUID()}){
 const state=s=>{s??=initial(shop);if(s.environment!=='test'||s.shop!==shop)fail('shop_mismatch');return s;};
 const lock=(user,fn)=>store.lock(user,s=>fn(state(s)));
 const amount=n=>{if(!validAmount(n))fail('invalid_amount');};
 const open=s=>s.operations.findLast(o=>!o.finished);
 const view=s=>publicState(s);
 function append(s,kind,due){
  // A sandbox account is deliberately bounded. Archive/reconcile before extending it.
  if(s.operations.length>=100)fail('sandbox_ledger_limit');
  const id=randomUUID(),o={id,kind,revision:s.revision,amount:s.amount,createdAt:new Date(now()).toISOString(),due,
   paymentId:null,status:'prepared',finished:false,confirmationUrl:null};
  s.operations.push(o);return id;
 }
 function request(o,s){
  const payload={amount:{value:o.amount.toFixed(2),currency:'RUB'},capture:true,
   description:'SALAH: тест ежемесячной поддержки',metadata:{salah_test_operation:o.id}};
  if(o.kind==='initial')Object.assign(payload,{payment_method_data:{type:'bank_card'},save_payment_method:true,confirmation:{type:'redirect',return_url:RETURN_URL}});
  else payload.payment_method_id=s.method.id;
  return payload;
 }
 function validate(p,o){
  if(!p||!UUID.test(p.id)||p.test!==true||String(p.recipient?.account_id)!==shop||p.metadata?.salah_test_operation!==o.id||
   p.amount?.currency!=='RUB'||p.amount?.value!==o.amount.toFixed(2)||!['pending','waiting_for_capture','succeeded','canceled'].includes(p.status))fail('payment_mismatch');
  if(o.paymentId&&o.paymentId!==p.id)fail('payment_mismatch');
 }
 function apply(s,o,p){
  validate(p,o);
  o.paymentId=p.id;
  o.review=false;
  // Duplicate/out-of-order callbacks cannot regress final state or advance the schedule twice.
  if(o.finished)return;
  o.status=p.status;
  const current=s.revision===o.revision&&s.status!=='cancelled';
  if(p.status==='succeeded'){
   if(p.paid!==true||!Number.isFinite(Date.parse(p.captured_at)))fail('payment_mismatch');
   o.finished=true;o.confirmationUrl=null;
   if(!current)return;
   if(p.payment_method?.type!=='bank_card'||p.payment_method.saved!==true||!UUID.test(p.payment_method.id)){
    s.status='cancelled';s.method=null;s.nextChargeAt=null;s.revision++;return;
   }
   if(o.kind==='renewal'&&s.method?.id!==p.payment_method.id)fail('payment_mismatch');
   s.method={id:p.payment_method.id,last4:/^\d{4}$/.test(p.payment_method.card?.last4||'')?p.payment_method.card.last4:null};
   s.status='active';
   const captured=new Date(p.captured_at);
   if(o.kind==='initial'){s.anchorDay=captured.getUTCDate();s.startedAt=captured.toISOString();}
   let next=nextMonth(o.kind==='initial'?captured:o.due,s.anchorDay);
   // Never catch up missed months with several charges.
   while(Date.parse(next)<=now())next=nextMonth(next,s.anchorDay);
   s.nextChargeAt=next;
  }else if(p.status==='canceled'){
   o.finished=true;o.confirmationUrl=null;
   if(current){s.status='cancelled';s.method=null;s.nextChargeAt=null;s.revision++;}
  }else if(p.confirmation?.confirmation_url){
   const url=new URL(p.confirmation.confirmation_url);
   if(url.protocol!=='https:'||url.hostname!=='yoomoney.ru'||url.username||url.password||url.port)fail('invalid_confirmation_url');
   o.confirmationUrl=url.href;
  }
 }
 async function dispatch(user,id){
  return lock(user,async s=>{
   const o=s.operations.find(o=>o.id===id);if(!o)fail('operation_missing');
   if(o.finished)return {state:s,value:{...view(s),confirmationUrl:null}};
   if(o.paymentId){apply(s,o,await provider.get(o.paymentId));}
   else if(o.revision!==s.revision||s.status==='cancelled'){
    o.review=true;o.status='cancelled_locally';o.confirmationUrl=null;
   }else{
    // The operation was committed BEFORE this external request. Its key survives a DB/network failure.
    // YooKassa guarantees idempotence for 24h only. Do not POST ambiguous operations after 23h.
    if(now()-Date.parse(o.createdAt)>=23*3600000){o.review=true;return {state:s,value:view(s)};}
    const created=await provider.create(request(o,s),o.id);
    validate(created,o);
    // Verify server-side state, even after a successful create response.
    apply(s,o,await provider.get(created.id));
   }
   return {state:s,value:{...view(s),confirmationUrl:s.revision===o.revision?o.confirmationUrl:null}};
  });
 }
 return {
  read:user=>lock(user,async s=>({state:s,value:view(s)})),
  async checkout(user,body){
   amount(body.amount);
   if(body.consent!==true||body.termsVersion!==TERMS_VERSION)fail('consent_required');
   const id=await lock(user,async s=>{
    if(s.operations.some(o=>o.review))fail('payment_in_progress');
    const pending=open(s);
    if(pending){if(pending.kind!=='initial'||pending.amount!==body.amount||pending.revision!==s.revision)fail('payment_in_progress');return {state:s,value:pending.id};}
    if(s.status==='active')fail('already_active');
    s.status='pending';s.amount=body.amount;s.revision++;s.method=null;s.nextChargeAt=null;
    s.consent={version:TERMS_VERSION,amount:body.amount,acceptedAt:new Date(now()).toISOString(),period:'calendar_month'};
    return {state:s,value:append(s,'initial',null)};
   });
   return dispatch(user,id);
  },
  async reconcile(user){
   const id=await lock(user,async s=>({state:s,value:open(s)?.id}));
   return id?dispatch(user,id):this.read(user);
  },
  async renew(user){
   const id=await lock(user,async s=>{
    if(s.status!=='active'||!s.method||Date.parse(s.nextChargeAt)>now())return {state:s,value:null};
    const o=open(s);
    return {state:s,value:o?.id??append(s,'renewal',s.nextChargeAt)};
   });
   return id?dispatch(user,id):this.read(user);
  },
  unlink:user=>lock(user,async s=>{
   if(s.status!=='cancelled'){s.revision++;s.status='cancelled';s.cancelledAt=new Date(now()).toISOString();}
   s.method=null;s.nextChargeAt=null;
   // Retain only payment IDs for read-only reconciliation; no reusable token survives unlink.
   for(const o of s.operations){o.confirmationUrl=null;if(!o.paymentId&&!o.finished)o.review=true;}
   return {state:s,value:{...view(s),unlinked:true}};
  }),
  async webhook(user,operation,payment){
   return lock(user,async s=>{
    const o=s.operations.find(o=>o.id===operation);if(!o)return {state:s,value:null};
    // Ignore supplied status, amount, method, recipient and metadata; fetch the actual object.
    apply(s,o,await provider.get(payment));return {state:s,value:view(s)};
   });
  }
 };
}
