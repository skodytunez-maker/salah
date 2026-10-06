export function normalizeStandaloneLaunch({locationObject,historyObject,isStandalone}) {
  if (!isStandalone || locationObject.hash.split('?')[0] !== '#settings') return false;
  historyObject.replaceState(historyObject.state, '', locationObject.pathname + locationObject.search + '#home');
  return true;
}
