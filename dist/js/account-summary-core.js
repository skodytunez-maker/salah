import{t}from './i18n.js';
import{esc,uiAttribute,uiTextAttributes}from './ui.js';
export function accountProfileMarkup(value){const name=typeof value==='string'?Array.from(value.trim()).slice(0,40).join(''):'';return '<div class="account-profile-heading"><h2><button type="button" id="account-profile-edit" '+uiAttribute('accountUi.editNickname')+'><span id="account-profile-name" '+(name?'':uiTextAttributes('accountUi.myProfile'))+'>'+esc(name||t('accountUi.myProfile'))+'</span><img src="./assets/icons/pen.svg" alt=""></button></h2></div>';}
