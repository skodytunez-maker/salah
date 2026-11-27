const origins = new Set(['https://skodytunez-maker.github.io', 'capacitor://localhost', 'http://localhost', 'https://localhost']);
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function createReferralHandler({issuer,getUser,getClaims,isSessionActive,readSummary,ensureCode,readInvitees=null}) {
  if(typeof issuer!=='string'||!issuer.endsWith('/auth/v1'))throw Error('invalid_auth_issuer');
  return async request => {
    const origin=request.headers.get('Origin');
    const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
    if(origin&&!origins.has(origin))return reply(403,{error:'forbidden'});
    if(origin)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST'||new URL(request.url).search)return reply(405,{error:'invalid_request'});
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'json_required'});
    const bearer=request.headers.get('Authorization')||'';
    if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
    let input;
    try{
      const body=await request.text();
      if(body.length>128)return reply(413,{error:'too_large'});
      input=JSON.parse(body);
    }catch{return reply(400,{error:'invalid_request'});}
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!['summary','create'].includes(input.action))return reply(400,{error:'invalid_request'});
    try{
      const token=bearer.slice(7);
      const [account,verified]=await Promise.all([getUser(token),getClaims(token)]);
      const user=account.data?.user,claims=verified.data?.claims;
      if(account.error||verified.error||!uuid.test(user?.id||'')||user.is_anonymous||!user.email_confirmed_at||claims?.sub!==user.id||claims.iss!==issuer||!uuid.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
      if(!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});
      if(input.action==='create')await ensureCode(user.id);
      const row=await readSummary(user.id);
      if(!row&&input.action==='summary')return reply(200,{code:null,seconds:0});
      if(!row)throw Error('missing_summary');
      const seconds=Number(row.seconds);
      const code=row.code??null;
      const scope=row.scope==='community'?'community':null;
      if((code===null ? input.action==='create'||(!scope&&seconds!==0) : !/^SALAH-[A-F0-9]{8}$/.test(code))||
          !Number.isSafeInteger(seconds)||seconds<0)throw Error('invalid_summary');
      let invitees=null;
      try{if(readInvitees&&code)invitees=await readInvitees(user.id);}catch{/* Keep code and listening summary available. */}
      return reply(200,{code,seconds,...(scope?{scope}:{}),...(invitees?{referrals:invitees}:{}),
       ...(row.recommendations?.length?{recommendations:row.recommendations}:{})});
    }catch{return reply(503,{error:'temporarily_unavailable'});}
  };
}
