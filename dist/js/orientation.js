// iPhone Safari leaves rotation locking to Control Center.
export function initPortraitMode(environment = globalThis) {
 let pending = false;
 const installed = () => environment.navigator?.standalone === true || environment.matchMedia?.('(display-mode: standalone)').matches === true;
 async function lock() {
  if (!installed() || pending || typeof environment.screen?.orientation?.lock !== 'function') return;
  pending = true;
  try { await environment.screen.orientation.lock('portrait-primary'); }
  catch { /* Browser support varies; do not force fullscreen. */ }
  finally { pending = false; }
 }
 environment.document?.addEventListener('visibilitychange', () => { if (!environment.document.hidden) lock(); });
 environment.document?.addEventListener('pointerup', lock, { passive: true });
 lock();
}
