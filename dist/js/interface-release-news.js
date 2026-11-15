import{uiLeaf}from './ui.js';
export function interfaceReleaseCard(kind){
 const language=kind==='interface-languages-501',name=language?'interface-languages':'quran-translations',prefix=language?'languages':'translations';
 const highlight=language?'left:50%;top:68.57%;width:42.65%;height:12.14%;':'left:6.88%;top:49.76%;width:86.25%;height:33.1%;';
 return '<article class="release-feature"><div class="release-new-art release-screen-art" aria-hidden="true"><div class="release-interface-preview release-motion-preview"><img src="./assets/updates/'+name+'-501.svg" alt=""><span data-release-motion-part="element" style="'+highlight+'--release-motion-keyframes:release-guest-top-glow"></span></div></div><h3>'+uiLeaf('releaseUi.'+prefix+'Title')+'</h3><p>'+uiLeaf('releaseUi.'+prefix+'Text')+'</p><p class="release-feature-note">'+uiLeaf('releaseUi.'+prefix+'Where')+'</p></article>';
}
