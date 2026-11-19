import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{t}from '../dist/js/i18n.js';
import{mountGlassSettings}from '../dist/js/glass-settings.js';

const html=await fs.readFile(new URL('../dist/index.html',import.meta.url),'utf8');
const relevant=new Set(['style.css','home-selected.css','day-night.css','quran.css','iphone.css','quran-player.css','soft-depth.css','css/interface-language.css']);
const paths=[...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^\"]+)"[^>]*>/g)].map(x=>x[1]).filter(x=>relevant.has(x));
assert.equal(paths.length,relevant.size,'Exercise the actual stylesheet order of both approved surfaces');
const css=(await Promise.all(paths.map(p=>fs.readFile(new URL('../dist/'+p,import.meta.url),'utf8')))).join('\n').replaceAll('@media(','@media (');
const bar=await fs.readFile(new URL('../dist/js/quran-player-bar.js',import.meta.url),'utf8'),expression=bar.match(/^\s*panel\.innerHTML=(.*);$/m)?.[1];assert.ok(expression);
const playerMarkup=vm.runInNewContext(expression,{t,icon:()=>'',actionIcon:()=>'',previous:'',next:'',play:''});
const surfaces=['.central-prayer.timetable','#quran-global-player'];
const geometry=['display','position','top','right','bottom','left','transform','width','height','minHeight','maxWidth','padding','margin','gap','gridTemplateColumns','gridTemplateRows','borderRadius','overflow','fontSize','fontWeight','lineHeight','direction','color','opacity'];
const shape=(w,node)=>Object.fromEntries(geometry.map(p=>[p,w.getComputedStyle(node)[p]]));
const surface=(w,node)=>{const c=w.getComputedStyle(node);return{...shape(w,node),background:c.background,backgroundColor:c.backgroundColor,border:c.border,boxShadow:c.boxShadow,backdrop:c.getPropertyValue('backdrop-filter'),webkit:c.getPropertyValue('-webkit-backdrop-filter')};};
const rgba=value=>{if(/^#[\da-f]{6,8}$/i.test(value))return{rgb:[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)),alpha:value.length===9?parseInt(value.slice(7,9),16)/255:1};const nums=value.match(/[\d.]+/g)?.map(Number);assert.ok(nums?.length>=3,'Expected concrete computed RGB surface: '+value);return{rgb:nums.slice(0,3),alpha:nums[3]??1};};

// Happy DOM has no physical GPU/capability or accessibility-setting model.
// Expand the REAL CSSOM branches using explicit device fixtures; selectors and
// declarations still pass through its real cascade/computed-style engine.
// System colors use an explicit black/white fixture because Happy DOM has no
// OS high-contrast palette. The shipped source must retain the real keywords.
function activeCSS(w,rules,env){return Array.from(rules).map(rule=>{
 if(rule.type===4){const condition=rule.conditionText.replace(/\((prefers-reduced-motion|prefers-reduced-transparency|prefers-contrast|forced-colors)\s*:\s*([^\)]+)\)/g,(_all,key,value)=>env[key]===value.trim()?'(min-width:0px)':'(max-width:-1px)');return condition.split(',').some(query=>w.matchMedia(query.trim()).matches)?activeCSS(w,rule.cssRules,env):'';}
 if(rule.type===12){const supported=/backdrop-filter/.test(rule.conditionText)?env.backdrop||env.webkit:w.CSS.supports(rule.conditionText);return supported?activeCSS(w,rule.cssRules,env):'';}
 return rule.type===7?'':rule.cssText;
 }).join('\n');}
function setup(width,height,options={}){
 const env={backdrop:true,webkit:true,...options},w=new Window({width,height,url:'https://salah.invalid/#home'}),d=w.document,style=d.createElement('style');style.textContent=env['forced-colors']==='active'?css.replace(/\bCanvasText\b/g,'rgb(255,255,255)').replace(/\bCanvas\b/g,'rgb(0,0,0)'):css;d.head.append(style);style.textContent=activeCSS(w,style.sheet.cssRules,env);
 d.body.className='home-page';d.body.innerHTML='<div id="home-scene" data-live-sky="off"><div class="scene-day"></div></div><div class="workspace"><main id="app"><div class="app-home-shell"><div class="home-prayer-center"><section class="central-prayer timetable"><div class="central-table"><div class="central-row"><span>Фаджр</span><time>06:23</time></div><div class="central-row" data-prayer="Sunrise"><span>Восход</span><time>08:26</time></div><div class="central-row tahajjud-row"><span>Тахаджуд</span><time>01:43</time></div></div></section><section class="central-prayer focus"><div class="central-next"><span>До намаза</span><strong>01:23:45</strong></div></section></div></div></main></div><div id="app-bottom-dock"><section id="quran-global-player" class="quran-global-player"></section><nav id="mobile-nav"></nav></div><div id="glass-settings"></div>';
 d.querySelector('#quran-global-player').innerHTML=playerMarkup;
 const disposePreview=mountGlassSettings(d.querySelector('#glass-settings'),{doc:d,win:w});
 return{w,d,env,disposePreview,table:d.querySelector('.central-prayer.timetable'),player:d.querySelector('#quran-global-player'),counter:d.querySelector('.central-prayer.focus'),photo:d.querySelector('.scene-day')};
}

// Independent CSS-state fixtures avoid claiming that HappyDOM models browser
// style invalidation or GPU compositing. Runtime updates are exercised separately.
function enable(f,level=80){const alpha=String(Number((1-.82*level/100).toFixed(4)));f.d.documentElement.dataset.glassMode='on';f.d.documentElement.style.setProperty('--glass-table-alpha',alpha);f.d.documentElement.style.setProperty('--glass-player-alpha',alpha);f.d.documentElement.style.setProperty('--glass-blur',(14-.12*level).toFixed(2)+'px');}
for(const[width,height]of [[375,667],[393,852],[768,1024],[1440,900]]){
 const off=setup(width,height),baseline=surfaces.map(s=>surface(off.w,off.d.querySelector(s))),counter=surface(off.w,off.counter),photo=surface(off.w,off.photo),controlStyles=[...off.player.querySelectorAll('button,input,select,strong,small,img')].map(n=>surface(off.w,n));
 assert.deepEqual(rgba(baseline[0].backgroundColor),{rgb:[7,15,29],alpha:.82});assert.deepEqual(rgba(baseline[1].backgroundColor),{rgb:[11,20,36],alpha:1});
 for(const level of [0,100]){
  const f=setup(width,height);enable(f,level);const expected=level===0?1:.18;
  // Read the ID surface first; some DOM-fixture selector caches are not live.
  const playerStyle=f.w.getComputedStyle(f.player);assert.equal(rgba(playerStyle.backgroundColor).alpha,expected,'Shared player endpoint at '+width+'px');
  for(const selector of [...surfaces,'.glass-preview-table','.glass-preview-player']){const c=f.w.getComputedStyle(f.d.querySelector(selector));assert.equal(rgba(c.backgroundColor).alpha,expected,selector);assert.match(c.getPropertyValue('backdrop-filter'),level===100?/blur\(2(?:\.00)?px\)/:/blur\(14(?:\.00)?px\)/);assert.notEqual(c.textShadow,'none');}
  for(const[index,selector]of surfaces.entries())assert.deepEqual(shape(f.w,f.d.querySelector(selector)),Object.fromEntries(geometry.map(p=>[p,baseline[index][p]])),'Surface typography and geometry stay unchanged at '+width+'px');
  assert.deepEqual(surface(f.w,f.counter),counter);assert.deepEqual(surface(f.w,f.photo),photo,'Photograph quality and geometry are unchanged');[...f.player.querySelectorAll('button,input,select,strong,small,img')].forEach((n,i)=>{const actual=surface(f.w,n),before=controlStyles[i];if(n.matches('[data-expand],[data-dismiss-player]')){const {color:oldColor,...oldGeometry}=Object.fromEntries(geometry.map(p=>[p,before[p]])),{color:newColor,...newGeometry}=shape(f.w,n);assert.deepEqual(newGeometry,oldGeometry,'Bright-background action treatment preserves control geometry');assert.deepEqual(rgba(actual.backgroundColor),{rgb:[8,15,26],alpha:.84});assert.deepEqual(rgba(actual.color).rgb,[234,219,179]);}else assert.deepEqual(actual,before);});f.disposePreview();await f.w.happyDOM.close();
 }
 off.disposePreview();await off.w.happyDOM.close();
}
for(const env of [{backdrop:false,webkit:false},{backdrop:false,webkit:true},{'prefers-reduced-motion':'reduce'},{'prefers-reduced-transparency':'reduce'},{'prefers-contrast':'more'},{'forced-colors':'active'}]){
 const f=setup(393,852,env);enable(f,100);for(const selector of ['#quran-global-player','.central-prayer.timetable','.glass-preview-player','.glass-preview-table']){const c=f.w.getComputedStyle(f.d.querySelector(selector)),accessible=env['prefers-reduced-transparency']||env['prefers-contrast']||env['forced-colors'];assert.equal(rgba(c.backgroundColor).alpha,accessible?1:.18,JSON.stringify(env)+' '+selector);if(accessible||env.backdrop===false&&env.webkit===false)assert.equal(c.getPropertyValue('backdrop-filter'),'none');if(env['forced-colors'])assert.deepEqual(rgba(c.backgroundColor).rgb,[0,0,0]);}f.disposePreview();await f.w.happyDOM.close();
}
for(const kind of ['is-expanded','is-ruqyah']){const f=setup(393,852);f.player.classList.add(kind);enable(f,100);const computed=f.w.getComputedStyle(f.player);assert.equal(rgba(computed.backgroundColor).alpha,kind==='is-ruqyah'?.18:1,'Only the compact shared player gets glass');f.disposePreview();await f.w.happyDOM.close();}
console.log('PASS unified glass CSS-state fixtures: common 0/100 alpha and low-blur endpoints; unchanged photograph, text and surface geometry; readable compact Home actions preserve control geometry; default OFF, compact/ruqyah scope, fullscreen exclusion and accessibility overrides. No physical-phone/GPU/dynamic-style-invalidation claim.');
