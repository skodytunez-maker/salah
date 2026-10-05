// Server-only adapter. A signed Auth hook and durable quota reservation are
// required before send. Never expose this directly as a public endpoint.
const ENDPOINT='https://smsc.ru/sys/send.php';
function message(phone,otp){
 if(!/^\+(?:79\d{9}|992\d{9})$/.test(phone)||!/^\d{6,8}$/.test(otp))throw Error('invalid_sms');
 return 'SALAH / SAHABA: '+otp+'. Do not share this code.';
}
export function createSmscProvider({apiKey,sender='',fetcher=fetch,authorizeSend=async()=>false}){
 const request=async(phone,otp,cost)=>{
  if(!apiKey)throw Error('sms_not_configured');
  const mes=message(phone,otp),body=new URLSearchParams({apikey:apiKey,phones:phone,mes,fmt:'3',charset:'utf-8',cost:String(cost),...(sender?{sender}: {})});
  try{
   const response=await fetcher(ENDPOINT,{method:'POST',body,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('sms_provider_unavailable');
   const data=await response.json();if(data.error||data.cnt!==1)throw Error('sms_provider_unavailable');return data;
  }catch{throw Error('sms_provider_unavailable');}
 };
 return {
  async quote(phone,otp){
   const data=await request(phone,otp,1);if(!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(String(data.cost)))throw Error('invalid_sms_cost');
   const kopecks=Math.round(Number(data.cost)*100);if(!Number.isSafeInteger(kopecks)||kopecks<=0)throw Error('invalid_sms_cost');return{kopecks,parts:1};
  },
  async send(phone,otp){
   message(phone,otp);if(!await authorizeSend(phone,otp))throw Error('sms_send_disabled');
   const data=await request(phone,otp,0);if(typeof data.id!=='number'&&typeof data.id!=='string')throw Error('sms_provider_unavailable');return{id:String(data.id)};
  }
 };
}
