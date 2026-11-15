import{uiLeaf}from './ui.js';
const cards=Object.freeze({
 'quran-offline-502':{prefix:'mushaf',part:'left:50.94%;top:52.62%;width:37.5%;height:1.43%;--release-motion-keyframes:release-nature-volume;transform-origin:left center;background:#dfc791;border-radius:3px;'},
 'prayer-offline-502':{prefix:'prayer',part:'left:59.06%;top:38.1%;width:21.25%;height:32.38%;--release-motion-keyframes:release-guest-top-glow;border:2px solid #ead49f;border-radius:50%;'},
 'audio-offline-502':{prefix:'audio',part:'left:7.66%;top:39.29%;width:84.69%;height:18.33%;--release-motion-keyframes:release-guest-top-glow;border:2px solid #dfc791;border-radius:13px;'}
});
export function offlineReleaseCard(kind){
 const card=cards[kind];if(!card)throw Error('unknown_offline_release_card');
 const key='offlineReleaseUi.'+card.prefix;
 return '<article class="release-feature"><div class="release-new-art release-screen-art" aria-hidden="true"><div class="release-interface-preview release-offline-preview release-motion-preview"><img src="./assets/updates/'+kind+'.svg" alt=""><span data-release-motion-part="element" style="box-sizing:border-box;'+card.part+'"></span></div></div><h3>'+uiLeaf(key+'Title')+'</h3><p>'+uiLeaf(key+'Text')+'</p><p class="release-feature-note">'+uiLeaf(key+'Where')+'</p></article>';
}
