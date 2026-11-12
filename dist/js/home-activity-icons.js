const paths={
 count:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 1-2Zm16 0h-3v8h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-1-2Z"/>',
 readers:'<path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
 dhikr:'<circle cx="12" cy="4" r="2"/><circle cx="6" cy="7" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/><circle cx="19" cy="13" r="2"/><circle cx="18" cy="7" r="2"/><path d="M12 6v9m0 0-2 7m2-7 2 7"/>'
};
export const homeActivityIcon=kind=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[kind]||'')+'</svg>';
