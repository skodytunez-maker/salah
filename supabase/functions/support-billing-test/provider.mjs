export function testConfiguration(get){
 const shop=get('YOOKASSA_TEST_SHOP_ID')||'',key=get('YOOKASSA_TEST_SECRET_KEY')||'';
 const enabled=get('SALAH_BILLING_TEST_ENABLED')==='true';
 // Live shop 1489995 cannot be used even if someone accidentally supplies its credentials.
 if(!enabled||!/^\d{4,12}$/.test(shop)||shop==='1489995'||!/^test_[A-Za-z0-9_-]{10,}$/.test(key))return null;
 return {shop,key};
}
export function createTestProvider({shop,key,fetcher=fetch}){
 if(!testConfiguration(n=>({YOOKASSA_TEST_SHOP_ID:shop,YOOKASSA_TEST_SECRET_KEY:key,SALAH_BILLING_TEST_ENABLED:'true'})[n]))throw Error('test_configuration_required');
 const headers={'Authorization':'Basic '+btoa(shop+':'+key),'Content-Type':'application/json'};
 async function call(path,options={}){
  const r=await fetcher('https://api.yookassa.ru/v3/payments'+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('provider_unavailable');
  const p=await r.json();if(p.test!==true)throw Error('live_payment_forbidden');return p;
 }
 return {create:(body,id)=>call('',{method:'POST',headers:{'Idempotence-Key':id},body:JSON.stringify(body)}),
  get:id=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('invalid_payment_id');return call('/'+id);}};
}
