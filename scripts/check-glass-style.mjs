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
function enable(f,table=.792,player=.857){f.d.documentElement.dataset.glassMode='on';f.d.documentElement.style.setProperty('--glass-table-alpha',String(table));f.d.documentElement.style.setProperty('--glass-player-alpha',String(player));}
function disable(f){f.d.documentElement.removeAttribute('data-glass-mode');f.d.documentElement.style.removeProperty('--glass-table-alpha');f.d.documentElement.style.removeProperty('--glass-player-alpha');}

for(const[width,height]of [[375,667],[393,852],[768,1024],[1440,900]]){
 const f=setup(width,height),{w,d,table,player}=f,baseline=surfaces.map(s=>surface(w,d.querySelector(s))),counter=surface(w,f.counter),photo=surface(w,f.photo);
 assert.deepEqual(rgba(baseline[0].backgroundColor),{rgb:[7,15,29],alpha:.82});assert.deepEqual(rgba(baseline[1].backgroundColor),{rgb:[11,20,36],alpha:1});
 const controls=[...player.querySelectorAll('button,input,select,strong,small,img')],originalNodes=controls.slice(),controlStyles=controls.map(n=>surface(w,n)),range=player.querySelector('input[type="range"]'),focused=player.querySelector('[data-toggle]');range.value='0.42';focused.focus();let changes=0;range.addEventListener('change',()=>changes++);
 enable(f,.74,.78);
 assert.deepEqual(rgba(w.getComputedStyle(table).backgroundColor),{rgb:[7,15,29],alpha:.74},'Opt-in uses the independent table alpha');assert.deepEqual(rgba(w.getComputedStyle(player).backgroundColor),{rgb:[11,20,36],alpha:.78},'Opt-in overrides the opaque compact-ID background');
 assert.match(w.getComputedStyle(table).getPropertyValue('backdrop-filter'),/blur\(18px\)/);assert.match(w.getComputedStyle(player).getPropertyValue('backdrop-filter'),/blur\(16px\)/);
 for(const[s,index]of surfaces.map((s,i)=>[s,i]))assert.deepEqual(shape(w,d.querySelector(s)),Object.fromEntries(geometry.map(p=>[p,baseline[index][p]])),'Glass never changes surface geometry/text at '+width+'px');
 assert.deepEqual(surface(w,f.counter),counter,'The focused countdown is outside the glass scope');assert.deepEqual(surface(w,f.photo),photo,'Glass never filters or dims the photograph');
 controls.forEach((n,i)=>{assert.equal(n,originalNodes[i]);assert.deepEqual(surface(w,n),controlStyles[i],'Control/portrait/text styles stay unchanged');});assert.equal(d.activeElement,focused);assert.equal(range.value,'0.42');range.dispatchEvent(new w.Event('change'));assert.equal(changes,1);
 enable(f,1,.78);assert.equal(rgba(w.getComputedStyle(table).backgroundColor).alpha,1);assert.equal(rgba(w.getComputedStyle(player).backgroundColor).alpha,.78,'One slider never changes the other alpha');enable(f,.74,1);assert.equal(rgba(w.getComputedStyle(table).backgroundColor).alpha,.74);assert.equal(rgba(w.getComputedStyle(player).backgroundColor).alpha,1);
 const previewTable=d.querySelector('.glass-preview-table'),previewPlayer=d.querySelector('.glass-preview-player');assert.equal(rgba(w.getComputedStyle(previewTable).backgroundColor).alpha,.74);assert.equal(rgba(w.getComputedStyle(previewPlayer).backgroundColor).alpha,1);assert.equal(d.querySelector('.glass-preview button,.glass-preview audio,.glass-preview video,.glass-preview input'),null,'Preview is a labelled noninteractive illustration');
 enable(f,.74,.78);player.classList.add('is-ruqyah');assert.equal(rgba(w.getComputedStyle(player).backgroundColor).alpha,.78,'The shared ruqyah compact widget uses the same selected surface');player.classList.remove('is-ruqyah');
 player.classList.add('is-expanded');const expandedOn=surface(w,player);disable(f);assert.deepEqual(surface(w,player),expandedOn,'No glass setting may touch the expanded player');player.classList.remove('is-expanded');assert.deepEqual(surfaces.map(s=>surface(w,d.querySelector(s))),baseline,'OFF returns the exact original514 surface cascade');
 d.documentElement.classList.add('soft-depth');const depthControls=controls.map(n=>surface(w,n));enable(f);controls.forEach((n,i)=>assert.deepEqual(surface(w,n),depthControls[i],'Glass preserves optional soft-depth controls'));f.disposePreview();await w.happyDOM.close();
}

for(const env of [{backdrop:false,webkit:false},{backdrop:false,webkit:true},{'prefers-reduced-transparency':'reduce'},{'prefers-reduced-motion':'reduce'},{'prefers-contrast':'more'},{'forced-colors':'active'}]){
 const f=setup(393,852,env);enable(f,.74,.78);const cs=[...surfaces,'.glass-preview-table','.glass-preview-player'].map(s=>f.w.getComputedStyle(f.d.querySelector(s)));
 if(env.webkit&&!env.backdrop){assert.equal(rgba(cs[0].backgroundColor).alpha,.74);assert.equal(rgba(cs[1].backgroundColor).alpha,.78,'The WebKit-only support branch remains usable');}
 else for(const[index,c]of cs.entries()){assert.equal(c.getPropertyValue('backdrop-filter'),'none','Unsupported/accessibility fixture '+JSON.stringify(env)+' surface '+index+' never depends on blur');if(env['forced-colors']){assert.deepEqual(rgba(c.backgroundColor),{rgb:[0,0,0],alpha:1});assert.equal(c.boxShadow,'none');assert.deepEqual(rgba(c.borderTopColor),{rgb:[255,255,255],alpha:1});}else assert.equal(rgba(c.backgroundColor).alpha,1,'A readable opaque fallback wins over the requested transparency');}
 assert.equal(f.d.documentElement.dataset.glassMode,'on','Accessibility fallbacks do not rewrite the saved preference');f.disposePreview();await f.w.happyDOM.close();
}
{
 const f=setup(393,852);enable(f,.74,.78);f.d.body.classList.add('reduce-motion');for(const selector of [...surfaces,'.glass-preview-table','.glass-preview-player']){const c=f.w.getComputedStyle(f.d.querySelector(selector));assert.equal(rgba(c.backgroundColor).alpha,1,'The existing app-level motion preference also selects the readable fallback');assert.equal(c.getPropertyValue('backdrop-filter'),'none');}f.disposePreview();await f.w.happyDOM.close();
}

const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
for(const[base,alpha,colors]of [[[7,15,29],.74,[[230,235,243],[193,202,217],[190,200,217]]],[[11,20,36],.78,[[184,196,213],[217,195,152]]]])for(const color of colors)assert.ok(ratio(color,base.map(c=>c*alpha+255*(1-alpha)))>=4.5,'Minimum tint preserves current small-text contrast even over a white backdrop');
for(const property of ['backdrop-filter','-webkit-backdrop-filter'])for(const radius of[18,16])assert.match(css,new RegExp(property+':\\s*blur\\('+radius+'px\\)'),'Both standard and WebKit filter declarations are required');
assert.ok((css.match(/background:\s*Canvas\s*;border-color:\s*CanvasText/g)||[]).length>=2,'Forced colors delegates both surfaces to the real OS palette');
console.log('PASS: actual glass cascade keeps514 OFF exact, independent safe endpoints, original connected controls/text/geometry/photos, compact/ruqyah scope and fullscreen exclusion; preview, support/accessibility fallbacks and worst-bright-backdrop text contrast. CSS/media capability fixtures only, no device pixel or GPU claim.');
