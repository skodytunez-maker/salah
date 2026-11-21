// Run from monitoring infrastructure with a dedicated read-only health token.
const {SALAH_DIAGNOSTIC_URL:url,SALAH_DIAGNOSTIC_HEALTH_TOKEN:token}=process.env;
try{
 if(!url||!token)throw Error();
 const endpoint=new URL(url);
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||!endpoint.pathname.endsWith('/functions/v1/error-summary'))throw Error();
 endpoint.hash='';endpoint.search='mode=health';
 const response=await fetch(endpoint,{
  headers:{Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)
 });
 if(!response.ok||(await response.json())?.ok!==true)throw Error();
 console.log('SALAH diagnostics available');
}catch{
 console.error('SALAH diagnostics health check failed');
 process.exitCode=1;
}
