// Own line artwork; messages keep standard Unicode for older SALAH clients.
export const MESSAGE_EMOJIS=[["🙂","Улыбка","smile"],["😊","Тёплая улыбка","kind"],["😄","Смех","laugh"],["😉","Подмигивание","wink"],["😌","Спокойствие","calm"],["😍","Восхищение","love"],["😮","Удивление","surprise"],["🤔","Размышление","thought"],["😢","Грусть","sad"],["🤲","Дуа","dua"],["🤍","Белое сердце","heart"],["❤️","Сердце","heart"],["👍","Согласен","thumb"],["👏","Аплодисменты","clap"],["✨","Искры","spark"],["🌙","Полумесяц","moon"]].map(([value,label,kind])=>Object.freeze({value,label,kind}));
const shapes={"heart":"<path d=\"M20.5 5.6a5.2 5.2 0 0 0-7.4 0L12 6.7l-1.1-1.1a5.2 5.2 0 0 0-7.4 7.4L12 21l8.5-8a5.2 5.2 0 0 0 0-7.4Z\"/>","thumb":"<path d=\"M8 10l4-7c2 0 2 2 1 5h5a2 2 0 0 1 2 2l-1 8a2 2 0 0 1-2 2H8M3 10h5v11H3z\"/>","clap":"<path d=\"M7 17l-3-6c-1-2 1-3 2-1l2 3-3-7c-1-2 1-3 2-1l4 7-1-7c0-2 2-2 2 0l1 6 2-4c1-2 3-1 2 1l-2 6c3-1 4 1 2 3l-3 3c-3 2-5 0-7-3ZM17 3l1-1m2 4h2m-3-1 2-2\"/>","spark":"<path d=\"m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3ZM20 2v4m-2-2h4M3 18v4m-2-2h4\"/>","moon":"<path d=\"M20.3 14.2A9 9 0 0 1 9.8 3.7a9 9 0 1 0 10.5 10.5Z\"/><path d=\"m18 3 .7 2.3L21 6l-2.3.7L18 9l-.7-2.3L15 6l2.3-.7Z\"/>","dua":"<path d=\"M10 20H5l-3-5V9c0-2 2-2 2 0v4m0-1c0-2 2-2 2 0l1 3 3 2v3ZM14 20h5l3-5V9c0-2-2-2-2 0v4m0-1c0-2-2-2-2 0l-1 3-3 2v3M9 5l1-2m5 2-1-2m-2 4V4\"/>"};
const face='<circle cx="12" cy="12" r="9"/>';
const eyes='<path d="M8 9h.01M16 9h.01" stroke-width="2.8"/>';
const expressions={
 smile:eyes+'<path d="M8 14a4.5 4.5 0 0 0 8 0"/>',
 kind:'<path d="M6.5 9.5Q8 7.5 9.5 9.5m5 0Q16 7.5 17.5 9.5M8 14a4.5 4.5 0 0 0 8 0M6 12h1m10 0h1"/>',
 laugh:'<path d="M6.5 9.5Q8 7.5 9.5 9.5m5 0Q16 7.5 17.5 9.5M7 13h10a5 5 0 0 1-10 0Zm2 2h6"/>',
 wink:'<path d="M7 9h.01" stroke-width="2.8"/><path d="m14 9 3-1M8 14a4.5 4.5 0 0 0 8 0"/>',
 calm:'<path d="M6.5 9q1.5 2 3 0m5 0q1.5 2 3 0m-8 5q2.5 2 5 0"/>',
 love:'<path d="m6 9 2 2 2-2c1-2-1-3-2-1-1-2-3-1-2 1Zm8 0 2 2 2-2c1-2-1-3-2-1-1-2-3-1-2 1ZM8 15q4 4 8 0"/>',
 surprise:eyes+'<ellipse cx="12" cy="15" rx="2" ry="2.5"/>',
 thought:'<path d="m6 7 4 1m4-1 3-1M8 10h.01m7 0h.01M9 16l4-1m-1 5 3-4 4-1-1 4-4 2" />',
 sad:eyes+'<path d="M8 17q4-4 8 0m2-6c0 2-2 3-2 4a2 2 0 0 0 4 0c0-1-2-2-2-4Z"/>'
};
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byValue=new Map(MESSAGE_EMOJIS.map(item=>[item.value,item]));
export function messageEmojiIcon(value){const item=byValue.get(value);if(!item)return '';return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(shapes[item.kind]||face+expressions[item.kind])+'</svg>';}
export function messageEmojiPalette(){return '<div class="salah-emoji-heading"><span>Смайлики</span><button type="button" data-emoji-close aria-label="Закрыть смайлики">×</button></div><div class="salah-emoji-grid">'+MESSAGE_EMOJIS.map(item=>'<button type="button" class="salah-emoji-choice" data-emoji="'+item.value+'" aria-label="'+item.label+'" title="'+item.label+'">'+messageEmojiIcon(item.value)+'</button>').join('')+'</div><span class="salah-emoji-status" role="status" aria-live="polite"></span>';}
const tokens=new RegExp(MESSAGE_EMOJIS.map(x=>x.value).join('|'),'gu');
export function messageTextMarkup(value){return escapeText(value).replace(tokens,token=>{const item=byValue.get(token);return '<span class="salah-message-emoji" role="img" aria-label="'+item.label+'" title="'+item.label+'">'+messageEmojiIcon(token)+'<span class="salah-emoji-character" aria-hidden="true">'+token+'</span></span>';});}
const mounted=new WeakMap();let sequence=0;
export function mountMessageEmoji(input,{button=null,panel=null}={}){
 if(!input||!input.closest('form'))return {close(){},dispose(){}};
 if(mounted.has(input))return mounted.get(input);
 const doc=input.ownerDocument,win=doc.defaultView,form=input.closest('form');let wrapper=null,disposed=false;
 if(!button||!panel){wrapper=doc.createElement('div');wrapper.className='salah-message-composer';panel=doc.createElement('div');const row=doc.createElement('div');row.className='salah-message-input-row';button=doc.createElement('button');button.type='button';input.before(wrapper);wrapper.append(panel,row);row.append(input,button);}
 button.classList.add('salah-emoji-toggle');button.setAttribute('aria-label','Смайлики');button.setAttribute('title','Смайлики');button.innerHTML=messageEmojiIcon('🙂');
 panel.classList.add('salah-emoji-panel');panel.id='salah-message-emojis-'+(++sequence);panel.setAttribute('role','group');panel.setAttribute('aria-label','Смайлики SALAH');panel.innerHTML=messageEmojiPalette();panel.hidden=true;button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
 let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
 const remember=()=>{start=input.selectionStart??input.value.length;end=input.selectionEnd??start;};
 const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');};
 const toggle=()=>{if(disposed||input.disabled||input.readOnly||button.disabled)return;remember();panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)input.scrollIntoView?.({block:'nearest',inline:'nearest'});};
 const hold=event=>{if(event.button!==undefined&&event.button!==0)return;remember();event.preventDefault();};
 const choose=event=>{
  const choice=event.target.closest('[data-emoji]');if(!choice||!panel.contains(choice)||disposed||input.disabled||input.readOnly||choice.disabled)return;
  const value=choice.dataset.emoji;if(!byValue.has(value))return;
  start=Math.max(0,Math.min(start,input.value.length));end=Math.max(start,Math.min(end,input.value.length));
  const line=panel.querySelector('[role=status]');
  if(input.maxLength>=0&&input.value.length-(end-start)+value.length>input.maxLength){line.textContent='Достигнут предел длины сообщения.';return;}
  const caret=start+value.length;input.setRangeText(value,start,end,'end');line.textContent='';input.focus({preventScroll:true});input.setSelectionRange(caret,caret);remember();input.dispatchEvent(new win.Event('input',{bubbles:true}));
 };
 const dismiss=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopPropagation();close();button.focus({preventScroll:true});}};
 const shut=()=>{const a=start,b=end;close();input.focus({preventScroll:true});input.setSelectionRange(a,b);remember();};
 button.addEventListener('pointerdown',hold);button.addEventListener('click',toggle);panel.addEventListener('pointerdown',hold);panel.addEventListener('click',choose);panel.querySelector('[data-emoji-close]').addEventListener('click',shut);
 for(const name of ['select','input','keyup','click'])input.addEventListener(name,remember);
 form.addEventListener('keydown',dismiss);form.addEventListener('submit',close);
 const controller={close,dispose(){if(disposed)return;disposed=true;close();button.removeEventListener('pointerdown',hold);button.removeEventListener('click',toggle);panel.removeEventListener('pointerdown',hold);panel.removeEventListener('click',choose);panel.querySelector('[data-emoji-close]').removeEventListener('click',shut);for(const name of ['select','input','keyup','click'])input.removeEventListener(name,remember);form.removeEventListener('keydown',dismiss);form.removeEventListener('submit',close);mounted.delete(input);if(wrapper&&wrapper.contains(input)){wrapper.before(input);wrapper.remove();}}};
 mounted.set(input,controller);return controller;
}
export function mountMessageEmojis(root){const pickers=[...root.querySelectorAll('form textarea')].map(input=>mountMessageEmoji(input));return()=>pickers.forEach(picker=>picker.dispose());}
