const customMetadata = new URL(location.href).searchParams.get('mode') === 'metadata';
const modeLink = document.getElementById(customMetadata ? 'metadata-mode' : 'page-mode');
const audio = document.getElementById('recitation');
const session = navigator.mediaSession;

modeLink.setAttribute('aria-current', 'page');
document.getElementById('mode').textContent = customMetadata
  ? 'Портрет передаётся из плеера, как в рабочем SALAH.'
  : 'Портрет передаётся через значок страницы, который WebKit может использовать как обложку.';

if (session) {
  if (customMetadata && typeof MediaMetadata === 'function') {
    session.metadata = new MediaMetadata({
      title: 'Аль Имран',
      artist: 'Ясир ад-Даусари',
      album: 'SALAH',
      artwork: [{ src: document.getElementById('portrait-icon').href, type: 'image/jpeg' }],
    });
  }

  for (const [action, handler] of Object.entries({
    play: () => audio.play().catch(() => {}),
    pause: () => audio.pause(),
    seekto: ({ seekTime }) => seek(seekTime),
    seekbackward: ({ seekOffset = 10 }) => seek(audio.currentTime - seekOffset),
    seekforward: ({ seekOffset = 10 }) => seek(audio.currentTime + seekOffset),
  })) {
    try { session.setActionHandler(action, handler); } catch {}
  }
}

function seek(time) {
  if (Number.isFinite(audio.duration) && Number.isFinite(time)) {
    audio.currentTime = Math.max(0, Math.min(time, audio.duration));
  }
}
