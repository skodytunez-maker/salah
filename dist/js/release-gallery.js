import{awardArtwork,safeAwardState}from './quran-awards-core.js';
import{competitionOwn}from './competition-client.js';
import{closeModal}from './ui.js';
const photo=(kind,cls='')=>'<img class="'+cls+'" src="'+awardArtwork(kind)+'" alt="">';
export function illustratedReleaseMarkup(version){if(version!==320)return '';return '<div class="release-gallery"><div class="release-gallery-strip" tabindex="0" aria-label="Новые возможности SALAH">'+
 '<article class="release-feature"><div class="release-feature-art release-medals">'+[7,30,100,200,365].map(n=>photo('streak'+n)).join('')+'</div><h3>Награды за постоянство</h3><p>7, 30, 100, 200 и 365 дней прослушивания. Каждая награда остаётся в аккаунте.</p></article>'+
 '<article class="release-feature"><div class="release-feature-art release-series-icons"><img src="./assets/icons/shield-heart.svg" alt=""><img src="./assets/icons/arrows-rotate.svg" alt=""></div><h3>С Кораном каждый день</h3><p>Минута прослушивания засчитывает день. Новый день отмечается анимацией в Коране.</p><p>Есть 3 защищённых пропуска. Каждые 7 дней прослушивания запас восстанавливается. Без запаса пропуск обнуляет серию; рекорд и награды сохраняются.</p></article>'+
 '<article class="release-feature"><div class="release-feature-art release-leaders">'+photo('week')+photo('month')+'</div><h3>Лидер недели и месяца</h3><p>Награды за первое место в ТОП SALAH по времени одного любимого чтеца.</p></article>'+
 '<article class="release-feature"><div class="release-feature-art">'+photo('founder')+'</div><h3>Первопроходец SALAH</h3><p>Для первых 100 пользователей. Спасибо, что вы с нами с самого начала.</p><button type="button" class="button secondary" data-release-gift hidden>Посмотреть подарок</button></article>'+
 '<article class="release-feature"><div class="release-feature-art release-profile-icons"><img src="./assets/icons/user.svg" alt=""><img src="./assets/icons/pen.svg" alt=""></div><h3>Удобный аккаунт</h3><p>Фото, ник и награды — рядом. Нажатие на дни переключает серию и рекорд. Устройства — в данных аккаунта.</p></article>'+
 '<article class="release-feature"><div class="release-feature-art release-home-icon"><img src="./assets/house.svg" alt=""></div><h3>Главная при запуске</h3><p>Новый запуск открывает главную. После сворачивания сохраняется прежнее место.</p></article>'+
 '</div><div class="release-gallery-controls"><button type="button" data-release-prev aria-label="Предыдущая карточка"><img src="./assets/arrow-left.svg" alt=""></button><span data-release-page aria-live="polite">1/6</span><button type="button" data-release-next aria-label="Следующая карточка"><img src="./assets/arrow-left.svg" alt=""></button></div></div>';}
export function bindIllustratedRelease(root){
 const strip=root.querySelector('.release-gallery-strip');if(!strip)return;const cards=[...strip.children],prev=root.querySelector('[data-release-prev]'),next=root.querySelector('[data-release-next]'),page=root.querySelector('[data-release-page]'),gift=root.querySelector('[data-release-gift]');let index=0;
 const reflect=()=>{prev.disabled=index===0;next.disabled=index===cards.length-1;page.textContent=(index+1)+'/'+cards.length;cards.forEach((c,i)=>{c.inert=i!==index;c.setAttribute('aria-hidden',String(i!==index));});};
 const move=n=>{index=Math.max(0,Math.min(cards.length-1,n));reflect();strip.scrollTo({left:index*(strip.clientWidth+12),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});};
 prev.onclick=()=>move(index-1);next.onclick=()=>move(index+1);strip.onkeydown=e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(index+(e.key==='ArrowRight'?1:-1));}};
 strip.onscroll=()=>{const i=Math.max(0,Math.min(cards.length-1,Math.round(strip.scrollLeft/(strip.clientWidth+12))));if(i!==index){index=i;reflect();}};
 const eligible=()=>{try{gift.hidden=!(safeAwardState(competitionOwn()?.awards).counts.founder>0);}catch{gift.hidden=true;}};eligible();for(const e of ['salah:competition-updated','salah:counter-status'])window.addEventListener(e,eligible);
 gift.onclick=()=>{if(gift.hidden)return;closeModal();location.hash='home?gift=founder';};
 document.getElementById('modal').addEventListener('close',()=>{for(const e of ['salah:competition-updated','salah:counter-status'])window.removeEventListener(e,eligible);},{once:true});reflect();
}
