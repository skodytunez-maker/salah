// iPhone Safari leaves rotation locking to Control Center.
export function initPortraitMode(environment = globalThis) {
 let pending = false, held = false;
 const tablet = () => Math.min(environment.innerWidth ?? Infinity, environment.innerHeight ?? Infinity) >= 600;
 const installed = () => environment.navigator?.standalone === true || environment.matchMedia?.('(display-mode: standalone)').matches === true;
 async function lock() {
  if (!installed() || pending || typeof environment.screen?.orientation?.lock !== 'function') return;
  if (tablet()) {
   if (held) { environment.screen.orientation.unlock?.(); held = false; }
   return;
  }
  pending = true;
  try { await environment.screen.orientation.lock('portrait-primary'); held = true; }
  catch { /* Browser support varies; do not force fullscreen. */ }
  finally { pending = false; }
 }
 environment.document?.addEventListener('visibilitychange', () => { if (!environment.document.hidden) lock(); });
 environment.document?.addEventListener('pointerup', lock, { passive: true });
 environment.addEventListener?.('resize', lock, { passive: true });
 lock();
}
