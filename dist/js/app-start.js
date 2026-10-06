export function normalizeStandaloneLaunch({locationObject,historyObject,isStandalone}) {
  if (!isStandalone || locationObject.hash.split('?')[0] !== '#settings') return false;
  // Browser navigation is optional: a denied history operation must not abort startup.
  if (typeof historyObject?.replaceState !== 'function') return false;
  try {
    historyObject.replaceState(historyObject.state, '', locationObject.pathname + locationObject.search + '#home');
    return true;
  } catch {
    return false;
  }
}
