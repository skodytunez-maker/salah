// Auth-free URLs are navigation targets only; the private classroom still requires its own authenticated session.
const origin='https://desktop-jecm5lt.taila4556d.ts.net';
const previews=Object.freeze({
 'online-lessons':{href:origin+'/#knowledge',label:'Открыть проверку'},
 muallim:{href:origin+'/#view=muallim',label:'Открыть проверку'},
 'live-stream':{href:origin+'/#view=live-preview',label:'Открыть макет'}
});
export function ownerLearningPreview(id,verified=false){return verified===true?previews[id]||null:null;}

