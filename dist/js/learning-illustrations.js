// Own SALAH diagrams for the actions already described in sourced lessons.
// School-specific finger, hand and foot details are deliberately omitted.
const drop=(x,y,s=1)=>'<path transform="translate('+x+' '+y+') scale('+s+')" d="M0-14C-4-7-10-1-10 6a10 10 0 0 0 20 0C10-1 4-7 0-14Z" fill="#86b9d8" stroke="none"/>';
const mat='<path d="M54 216h192" stroke="#bda47a"/><path d="M62 226h176" stroke="#d8c9af" stroke-width="2"/>';
const head='<ellipse cx="150" cy="100" rx="44" ry="57" fill="#f7f1e5"/><path d="M116 65q34-28 68 0" stroke="#bda47a"/>';
const shoulders='<path d="M106 174q44-25 88 0m-72-14-12 39m68-39 12 39"/>';
const hand='<path d="M-22 42-25 12q-1-10 6-9l8 14V-19q0-10 7-9V5-32q0-9 7-8l1 45 2-33q1-9 8-7l-1 39 4-24q2-9 8-5l-4 47q-2 13-15 20Z" fill="#f7f1e5"/>';
const standing='<circle cx="150" cy="49" r="18" fill="#f7f1e5"/><path d="M142 70h16l15 87h-46Zm-15 87-9 48h25l7-43 7 43h25l-9-48M137 80l-20 47 20 14m26-61 20 47-20 14" fill="#f7f1e5"/>';
const seated='<circle cx="129" cy="56" r="18" fill="#f7f1e5"/><path d="m119 77 22 2 8 74 41 16q17 7 11 19H116q-10-2-9-16Zm82 111-46 15h-49q-8 0-8-8m43-106 21 39-13 27m-23-57-10 36 16 19" fill="#f7f1e5"/><path d="m132 155 27 6m-43 32 50 2" stroke="#bda47a"/>';
const schemes={
 wudu:drop(150,118,3)+'<path d="M115 186q35 18 70 0" stroke="#bda47a"/>',
 prepare:'<rect x="103" y="81" width="94" height="132" rx="12" fill="#f7f1e5"/><path d="M114 198V106q36-39 72 0v92M150 68V33m-9 11 9-11 9 11" stroke="#bda47a"/>',
 intention:'<path d="M150 174 91 119c-29-29 17-75 59-31 42-44 88 2 59 31Z" fill="#f7f1e5" stroke="#bda47a"/>',
 rise:mat+standing+'<path d="M214 185V112m-8 11 8-11 8 11" stroke="#bda47a"/>',
 next:mat+standing+'<path d="M217 183V113m-8 11 8-11 8 11" stroke="#bda47a"/>',
 between:mat+seated,tashahhud:mat+seated,salawat:mat+seated,dua:mat+seated,
 taslim:mat+seated+'<path d="M99 50H76m8-7-8 7 8 7m74-7h23m-8-7 8 7-8 7" stroke="#bda47a"/>',
 wi:drop(150,114,3),
 wh:'<g transform="translate(113 140) rotate(-24)">'+hand+'</g><g transform="translate(176 140) rotate(24)">'+hand+'</g>'+drop(152,62,1.1)+drop(91,87,.65)+drop(211,91,.65),
 wm:head+shoulders+'<path d="M136 131q14 10 28 0" stroke="#80b3d4" stroke-width="7"/><path d="M212 148q-30-3-40-16m10 1-10-1 3 10" stroke="#80b3d4"/>'+drop(212,127,.8),
 wn:head+shoulders+'<path d="m150 99-7 17h14" stroke="#80b3d4" stroke-width="5"/><path d="M208 108h-34m8-7-8 7 8 7" stroke="#80b3d4"/>'+drop(211,83,.75),
 wf:head+shoulders+'<ellipse cx="150" cy="105" rx="35" ry="42" stroke="#80b3d4" stroke-width="6" fill="none"/>'+drop(93,112,.7)+drop(208,112,.7),
 wa:'<path d="M85 155h85q22 0 28-28l13-66m-31-5-16 67H85m0 0-31-11q-10-3-11 5l21 14-24-3q-12-1-11 7l38 10-20 2q-11 1-7 9l45 11" fill="#f7f1e5"/><path d="M101 137h65q11 0 15-18l12-46" stroke="#80b3d4" stroke-width="10"/>'+drop(130,88,1)+drop(160,94,.7),
 whead:head+shoulders+'<path d="M114 67q36-34 72 0" stroke="#80b3d4" stroke-width="9"/><path d="M108 35q43-30 84 0m-2-10 2 10-10-1" stroke="#bda47a"/>',
 wears:head+shoulders+'<path d="M105 87q-12-4-12 14t12 16m90-30q12-4 12 14t-12 16" stroke="#80b3d4" stroke-width="6"/><path d="M79 102h-9m151 0h9" stroke="#bda47a"/>',
 wfeet:'<path d="M125 58h37v73q0 26 24 38l37 14q13 5 9 19H105q-12 0-10-14l11-37 19-21Z" fill="#f7f1e5"/><path d="M137 135q-14 45-23 51h101" stroke="#80b3d4" stroke-width="9"/>'+drop(76,140,.8)+drop(87,94,.7)+'<path d="M81 212h158" stroke="#bda47a"/>',
 wdone:drop(150,107,2.7)+'<path d="m125 114 17 17 34-36" stroke="#f7f1e5" stroke-width="7"/>'
};
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function learningIllustration(step){const diagram=schemes[step.id];if(!diagram)return '';return '<div class="lesson-diagram" style="width:min(280px,100%);margin:24px auto 0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 250" role="img" aria-label="'+escape(step.title)+': схематичный пример" style="display:block;width:100%;height:auto;border-radius:22px"><rect width="300" height="250" rx="22" fill="#efeadd"/><g fill="none" stroke="#3a4b63" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+diagram+'</g></svg></div><p class="pose-caption">Схематичный пример. Детали действия описаны ниже.</p>'}
export const illustratedStepIds=Object.freeze(Object.keys(schemes));
