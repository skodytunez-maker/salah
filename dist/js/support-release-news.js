import{uiLeaf}from './ui.js';
export function supportReleaseCard(){
 return '<article class="release-feature" data-support-release="516"><div class="release-new-art release-screen-art" aria-hidden="true"><div class="release-interface-preview"><img src="./assets/updates/support-inbox-516.svg" alt=""></div></div><h3>'+uiLeaf('supportReleaseUi.title')+'</h3><p>'+uiLeaf('supportReleaseUi.text')+'</p><p class="release-feature-note">'+uiLeaf('nav.menu')+' → '+uiLeaf('menu.supportUser')+'. '+uiLeaf('supportReleaseUi.where')+'</p></article>';
}
