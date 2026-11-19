// SALAH local patch of the pinned MIT-licensed 2.117.2 bundle. No SDK upgrade.
export const PATCH_ID='salah-stale-implicit-refresh-v1';
const changes=[
 ['async _callRefreshToken(e){var t,n;', 'async _callRefreshToken(e,salahStoredGuard=!1){var t,n;'],
 ['let t=await U(this.storage,this.storageKey),{data:n,error:i}=await this._refreshAccessToken(e);', 'let t=await U(this.storage,this.storageKey);if(salahStoredGuard&&(t===null||t.refresh_token!==e)){let e={data:null,error:new cr};return this.refreshingDeferred.resolve(e),e}let{data:n,error:i}=await this._refreshAccessToken(e);'],
];
const sections=[
 ['async __loadSession()', 'async _hydrateSessionUser(', 'this._callRefreshToken(e.refresh_token)', 'this._callRefreshToken(e.refresh_token,!0)'],
 ['async _recoverAndRefresh()', 'async _callRefreshToken(', 'this._callRefreshToken(t.refresh_token)', 'this._callRefreshToken(t.refresh_token,!0)'],
 ['async _autoRefreshTokenTick()', 'async _handleVisibilityChange()', 'this._callRefreshToken(n.refresh_token)', 'this._callRefreshToken(n.refresh_token,!0)'],
 ['async _refreshSession(e){', 'async _getSessionFromURL(', 'this._callRefreshToken(e.refresh_token)', 'this._callRefreshToken(e.refresh_token,!salahExplicitRefresh)'],
];
function replace(source,from,to,count=1){const occurrences=source.split(from).length-1;if(occurrences!==count)throw Error('Pinned SDK patch context changed: '+from.slice(0,70)+' ('+occurrences+')');return source.replaceAll(from,to);}
export function applySupabaseRefreshPatch(source){
 for(const [from,to]of changes)source=replace(source,from,to);
 for(const [start,end,from,to]of sections){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Pinned SDK section missing');const part=source.slice(a,b);source=source.slice(0,a)+replace(part,from,to,start.includes('_autoRefresh')?2:1)+source.slice(b);}
 return replace(source,'async _refreshSession(e){try{','async _refreshSession(e){const salahExplicitRefresh=!!e;try{');
}
export function removeSupabaseRefreshPatch(source){
 source=replace(source,'async _refreshSession(e){const salahExplicitRefresh=!!e;try{','async _refreshSession(e){try{');
 for(const [start,end,from,to]of sections){const a=source.indexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw Error('Patched SDK section missing');source=source.slice(0,a)+replace(source.slice(a,b),to,from,start.includes('_autoRefresh')?2:1)+source.slice(b);}
 for(const [from,to]of [...changes].reverse())source=replace(source,to,from);
 return source;
}
