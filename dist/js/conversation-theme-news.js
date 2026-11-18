import{CONVERSATION_THEMES}from './conversation-themes.js';
import{uiLeaf}from './ui.js';

// Real catalogue images and palettes; fictional preview text, no user content.
// The track uses the gallery's shared active/hidden/reduced-motion lifecycle.
export function conversationThemeReleaseCard(){
 const scenes=CONVERSATION_THEMES.filter(theme=>theme.wallpaper).map(theme=>
  '<div class="release-theme-scene" style="--theme-preview-in:'+theme.incoming+';--theme-preview-out:'+theme.outgoing+';--theme-preview-accent:'+theme.accent+';background-color:'+theme.base+'">'+
  '<img src="'+theme.thumbnail+'" decoding="async" alt=""><div class="release-theme-scene-shade"></div><div class="release-theme-demo"><header><strong>SALAH</strong><span>'+uiLeaf(theme.key)+'</span></header><div class="release-theme-bubble">'+uiLeaf('conversationThemeUi.newsMessageA')+'</div><div class="release-theme-bubble is-mine">'+uiLeaf('conversationThemeUi.newsMessageB')+'</div><div class="release-theme-demo-input"><span></span></div></div></div>'
 ).join('');
 return '<article class="release-feature" data-theme-news><div class="release-new-art release-screen-art" aria-hidden="true"><div class="release-theme-preview release-motion-preview"><div class="release-theme-track" data-release-motion-part="element" style="--release-motion-keyframes:release-theme-tour">'+scenes+'</div></div></div><h3>'+uiLeaf('conversationThemeUi.newsTitle')+'</h3><p>'+uiLeaf('conversationThemeUi.newsText')+'</p><p class="release-feature-note">'+uiLeaf('conversationThemeUi.newsWhere')+'</p></article>';
}
