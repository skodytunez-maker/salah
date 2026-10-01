export function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
export function toast(text){const el=document.getElementById('toast');el.textContent=text;el.hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.hidden=true,4000)}
export function modal(content){const el=document.getElementById('modal');document.getElementById('modal-content').innerHTML=content; if(!el.open)el.showModal();el.querySelector('[data-close]')?.addEventListener('click',()=>el.close())}
export function closeModal(){document.getElementById('modal').close()}
export function title(text,sub=''){return '<div class="page-head"><div><h1>'+esc(text)+'</h1><p class="muted">'+esc(sub)+'</p></div></div>'}
