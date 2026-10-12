export function competitionMotionPlan(previous,next,reduced=false){
 if(reduced||!previous?.size)return[];const plans=[];for(const entry of next){if(entry.role!=='podium')continue;const old=previous.get(entry.id),changedLeader=entry.rank===1&&old&&old.rank!==1,medal=(!old||old.role!=='podium'||old.rank!==entry.rank)?({1:'gold',2:'silver',3:'bronze'}[entry.rank]||''):'';
 if(!old||old.role!=='podium')plans.push({id:entry.id,type:'enter',leader:changedLeader,medal});
 else{const x=old.x-entry.x,y=old.y-entry.y;if(Math.abs(x)>1||Math.abs(y)>1||old.rank!==entry.rank)plans.push({id:entry.id,type:'move',x,y,leader:changedLeader,medal});else if(old.reciter!==entry.reciter)plans.push({id:entry.id,type:'portrait',leader:false,medal:''});}
 }return plans;
}
export const COMPETITION_GLOW_COLORS={gold:'#d8be88',silver:'#c2cbd8',bronze:'#bf926c'};
export function competitionGlowFrames(medal,base='none'){
 const color=COMPETITION_GLOW_COLORS[medal];return color?[{boxShadow:base},{boxShadow:'0 0 0 2px '+color+'b3, 0 0 26px 7px '+color+'66, inset 0 0 18px '+color+'24',offset:.38},{boxShadow:base}]:[];
}
export function captureCompetitionLayout(host){
 const map=new Map();for(const element of host.querySelectorAll('[data-competition-entry]')){for(const animation of element.getAnimations?.()||[])animation.finish();const rect=element.getBoundingClientRect();map.set(element.dataset.competitionEntry,{id:element.dataset.competitionEntry,rank:Number(element.dataset.competitionRank),reciter:element.dataset.competitionReciter,role:element.classList.contains('competition-card')?'podium':'row',x:rect.left,y:rect.top});}return map;
}
export function animateCompetitionChange(host,before){
 const after=captureCompetitionLayout(host),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 for(const plan of competitionMotionPlan(before,[...after.values()],reduced)){
  const element=[...host.querySelectorAll('[data-competition-entry]')].find(el=>el.dataset.competitionEntry===plan.id);if(!element?.animate)continue;
  if(plan.type==='move')element.animate([{transform:'translate('+plan.x+'px,'+plan.y+'px)',zIndex:3},{transform:'translate(0,0)',zIndex:3}],{duration:520,easing:'cubic-bezier(.2,.75,.2,1)'});
  else if(plan.type==='enter')element.animate([{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'});
  else element.querySelector('.reciter-portrait')?.animate([{opacity:.25},{opacity:1}],{duration:260,easing:'ease-out'});
  if(plan.medal){const options={duration:1100,easing:'ease-in-out'},base=typeof getComputedStyle==='function'?getComputedStyle(element).boxShadow:'none';element.animate(competitionGlowFrames(plan.medal,base),options);const portrait=element.querySelector('.reciter-portrait');if(portrait?.animate){const ring=typeof getComputedStyle==='function'?getComputedStyle(portrait).boxShadow:'none',color=COMPETITION_GLOW_COLORS[plan.medal];portrait.animate([{boxShadow:ring},{boxShadow:'0 0 0 5px '+color+'88, 0 0 22px '+color+'aa',offset:.38},{boxShadow:ring}],options);}}
 }
}
