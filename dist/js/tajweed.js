import{t}from './i18n.js';
import{uiLeaf,uiAttribute}from './quran-ui.js';
const escapeHtml=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RULE_CLASSES={h:'silent',s:'silent',l:'silent',n:'madd',p:'madd-p',m:'madd-m',o:'madd-o',q:'qalqalah',c:'ikhfa',f:'ikhfa',w:'idgham',i:'iqlab',a:'idgham',u:'idgham',d:'silent',b:'silent',g:'ghunnah'};
export const TAJWEED_RULES=Object.fromEntries(Object.entries(RULE_CLASSES).map(([key,className])=>[key,Object.defineProperties([className],{1:{enumerable:true,get:()=>t('quranUi.tajweed.'+key+'.title')},2:{enumerable:true,get:()=>t('quranUi.tajweed.'+key+'.description')}})]));
export function parseTajweed(source){
 const parts=[],stack=[];let text='',active;
 const flush=()=>{if(text){parts.push(active?{text,rule:active}:{text});text=''}};
 for(let i=0;i<source.length;){
  if(source[i]==='['){
   const bare=/^\[([\u0600-\u06ff]+)\]/.exec(source.slice(i));if(bare){text+=bare[1];i+=bare[0].length;continue}
   const match=/^\[([a-z])(?::\d+)?\[/.exec(source.slice(i));
   if(!match||!TAJWEED_RULES[match[1]])throw Error('Неизвестная разметка таджвида');
   flush();stack.push(match[1]);active=stack.at(-1);i+=match[0].length;
  }else if(source[i]===']'){
   if(!stack.length)throw Error('Неполная разметка таджвида');
   flush();stack.pop();active=stack.at(-1);i++;
  }else{text+=source[i++];}
 }
 flush();if(stack.length)throw Error('Неполная разметка таджвида');return parts;
}
export function arabicWithHints(verse){
 if(!verse.tajweed)return escapeHtml(verse.arabic);
 try{return parseTajweed(verse.tajweed).map(p=>p.rule?'<span class="tajweed-'+TAJWEED_RULES[p.rule][0]+'" data-tajweed-rule="'+p.rule+'" tabindex="0" role="button" '+uiAttribute('quranUi.tajweed.'+p.rule+'.title',{},'aria-label')+' '+uiAttribute('quranUi.tajweed.'+p.rule+'.title',{},'title')+'>'+escapeHtml(p.text)+'</span>':escapeHtml(p.text)).join('')}catch{return escapeHtml(verse.arabic)}
}
export function hintsLegend(){return '<details class="quran-hint-guide"><summary>'+uiLeaf('quranUi.tajweed.legendTitle')+'</summary><div class="quran-hint-legend">'+[['madd','madd'],['ghunnah','ghunnah'],['ikhfa','ikhfa'],['idgham','idgham'],['iqlab','iqlab'],['qalqalah','qalqalah'],['silent','silent']].map(([className,key])=>'<span class="tajweed-'+className+'">'+uiLeaf('quranUi.tajweed.'+key)+'</span>').join('')+'</div><p>'+uiLeaf('quranUi.tajweed.hint')+'</p><a href="https://alquran.cloud/tajweed-guide" target="_blank" rel="noopener">'+uiLeaf('quranUi.tajweed.source')+'</a></details>';}
