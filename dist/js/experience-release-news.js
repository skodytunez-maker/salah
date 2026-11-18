import{uiLeaf}from './ui.js';
const cards=Object.freeze({'glass-controls-515':'glass','message-actions-515':'messages'});
export function experienceReleaseCard(kind){
 const prefix=Object.hasOwn(cards,kind)?cards[kind]:null;if(!prefix)throw Error('unknown_experience_release_card');
 const key='experienceReleaseUi.'+prefix;
 return '<article class="release-feature" data-experience-release="'+kind+'"><div class="release-new-art release-screen-art" aria-hidden="true"><div class="release-interface-preview"><img src="./assets/updates/'+kind+'.svg" alt=""></div></div><h3>'+uiLeaf(key+'Title')+'</h3><p>'+uiLeaf(key+'Text')+'</p><p class="release-feature-note">'+uiLeaf(key+'Where')+'</p></article>';
}
