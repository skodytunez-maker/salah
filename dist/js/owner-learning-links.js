const previews=Object.freeze({
 'online-lessons':{href:'#knowledge?preview=online-lessons',label:'Открыть проверку'},
 muallim:{href:'#knowledge?preview=muallim',label:'Открыть проверку'},
 'live-stream':{href:'#knowledge?preview=live-stream',label:'Открыть макет'}
});
export function ownerLearningPreview(id,verified=false){return verified===true?previews[id]||null:null;}
