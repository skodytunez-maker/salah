// Compatibility exports keep cached version310 entry modules loading without a broken import.
export const COLOR_THEMES=[];
export function applyColorTheme(_value,documentRef=document){documentRef.documentElement.dataset.colorTheme='classic';const meta=documentRef.querySelector('meta[name="theme-color"]');if(meta)meta.content='#070b16';return 'classic';}
export function initColorTheme(){applyColorTheme('classic');}
export function mountColorThemeSetting(container){const host=container.querySelector('#color-theme-setting');if(host){host.innerHTML='';host.hidden=true;}return()=>{};}
