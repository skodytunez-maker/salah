// Decorative settings icons: text and native controls retain their own semantics.
const icons=Object.freeze({
 city:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
 travel:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M9 7V4h6v3M8 11v5m8-5v5M7 20v1m10-1v1"/>',
 source:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m9 3v3l2 1"/>',
 asr:'<circle cx="12" cy="12" r="5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M12 9v3l2 1"/>',
 calculation:'<path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h4m4 0h10M7 3v6m6 0v6m-6 0v6"/>',
 moon:'<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>',
 diagnostics:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm0 5v5m0 3v.1"/>',
 sky:'<path d="M4 16a4 4 0 1 1 1-8 6 6 0 0 1 11 1 3.5 3.5 0 0 1 1 7H4Z"/><path d="M17 3v2m4 2-2 1"/>',
 transitions:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z"/>',
 weather:'<path d="M4 15a4 4 0 1 1 1-8 6 6 0 0 1 11 1 3.5 3.5 0 0 1 1 7H4Zm3 3-1 3m6-3-1 3m6-3-1 3"/>',
 animation:'<path d="M3 7h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h7"/>',
 motion:'<path d="M4 8h8a3 3 0 1 0-3-3M4 13h16M4 18h10"/><path d="m17 10 3 3-3 3"/>',
 haptic:'<rect x="8" y="3" width="8" height="18" rx="2"/><path d="m4 8-2 4 2 4m16-8 2 4-2 4M11 18h2"/>',
 glass:'<rect x="3" y="3" width="13" height="13" rx="3"/><rect x="8" y="8" width="13" height="13" rx="3"/><path d="m10 14 4-4"/>',
 sound:'<path d="m11 4-5 4H3v8h3l5 4V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 adhkar:'<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
 dhikr:'<circle cx="12" cy="12" r="8" stroke-dasharray="1 3.2"/><path d="M12 4V2m-2 0h4M10 12l2 2 4-4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-12 5 2 2 4-4"/>',
 background:'<rect x="4" y="3" width="10" height="18" rx="2"/><path d="M8 18h2m9-10v5m0 3v.1"/>'
});
export function settingsSectionLabel(icon,label){
 const path=icons[icon];if(!path)throw Error('Unknown settings section icon');
 return '<span class="settings-section-label"><span class="settings-section-icon" aria-hidden="true"><svg focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg></span><span class="settings-section-text">'+label+'</span></span>';
}
