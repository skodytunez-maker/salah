import{read}from './storage.js';
import{dateKey}from './prayers.js';
import{esc}from './ui.js';
import{readingLinks}from './home-reading-core.js';
let catalogPromise;
function loadCatalog(){return catalogPromise??=(async()=>{const r=await fetch('./data/adhkar.json');if(!r.ok)throw Error();return r.json()})().catch(e=>{catalogPromise=null;throw e});}
export async function mountHomeReading(host,{resumeEvening=false}={}){
 if(!host)return;
 const token={};host.readingToken=token;
 const catalog=await loadCatalog().catch(()=>null);
 if(!host.isConnected||host.readingToken!==token)return;
 const day=dateKey(),date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-1);
 const links=readingLinks({catalog,progress:read('adhkar-progress-v2',null),day,previousDay:date.toISOString().slice(0,10),resumeEvening,selected:read('adhkar-selected',null)});
 host.hidden=!links.length;
 host.innerHTML=links.length?'<section class="home-reading" aria-label="Продолжить азкары"><h2>Продолжить азкары</h2>'+links.map(link=>'<a class="home-reading-link" href="'+esc(link.href)+'"><span><strong>'+esc(link.title)+'</strong><small>'+esc(link.detail)+'</small></span><span aria-hidden="true">›</span></a>').join('')+'</section>':'';
}
