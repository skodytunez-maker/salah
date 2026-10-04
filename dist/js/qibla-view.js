import { esc } from './ui.js';

// The controller owns the heading, alignment state and light intensity.
// The SVG is decorative; the instruction and angles provide the same information in text.
const rug = `<svg class="qibla-rug" viewBox="0 0 340 340" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="qibla-rug-weave" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#143c42"/><stop offset=".52" stop-color="#102c38"/><stop offset="1" stop-color="#15243a"/>
    </linearGradient>
    <linearGradient id="qibla-rug-edge" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#cab687"/><stop offset="1" stop-color="#8a805f"/>
    </linearGradient>
    <radialGradient id="qibla-ivory-halo">
      <stop stop-color="#fffef6" stop-opacity=".8"/><stop offset=".4" stop-color="#fffaf0" stop-opacity=".32"/><stop offset="1" stop-color="#e8d7aa" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="qibla-light-trail" x1="0" y1="1" x2="0" y2="0">
      <stop stop-color="#fffdf4" stop-opacity="0"/><stop offset=".5" stop-color="#fffdf4" stop-opacity=".26"/><stop offset="1" stop-color="#fffdf4" stop-opacity="0"/>
    </linearGradient>
    <filter id="qibla-soft-light" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
  </defs>
  <g class="qibla-rug-body" transform="translate(170 190) scale(1.25) translate(-170 -190)">
    <path d="M115 107v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9m6 9v-9" stroke="#b9aa83" stroke-width="1.1" opacity=".6"/>
    <rect x="112" y="105" width="116" height="173" rx="3" fill="url(#qibla-rug-weave)" stroke="url(#qibla-rug-edge)" stroke-width="1.4"/>
    <rect x="117" y="110" width="106" height="163" rx="1" fill="none" stroke="#b5a474" stroke-width=".75" opacity=".8"/>
    <rect x="124" y="117" width="92" height="149" fill="none" stroke="#a39169" stroke-width=".65" opacity=".65"/>
    <path d="M128 253V164c0-17 17-29 42-43 25 14 42 26 42 43v89z" fill="#0c2631" stroke="#bfae80" stroke-width="1.1"/>
    <path d="M134 247v-82c0-13 14-24 36-36 22 12 36 23 36 36v82z" fill="none" stroke="#8d855f" stroke-width=".65"/>
    <path d="M140 240v-72c0-10 12-20 30-30 18 10 30 20 30 30v72" fill="none" stroke="#a3936a" stroke-width=".7" opacity=".55"/>
    <path d="m170 163 7 9-7 9-7-9zM157 211h26m-21 8h16m-21 8h26" stroke="#c5b385" stroke-width=".8" fill="none" opacity=".5"/>
    <path d="m121 123 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4z" fill="#bba779" opacity=".55"/>
    <path d="m219 123 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4zm0 16 2 4-2 4-2-4z" fill="#bba779" opacity=".55"/>
    <path d="M115 278v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9m6-9v9" stroke="#b9aa83" stroke-width="1.1" opacity=".6"/>
    <g class="qibla-rug-light">
      <ellipse cx="170" cy="141" rx="73" ry="61" fill="url(#qibla-ivory-halo)"/>
      <path d="M128 188v-24c0-17 17-29 42-43 25 14 42 26 42 43v24" stroke="#fffef6" stroke-width="8" fill="none" filter="url(#qibla-soft-light)" opacity=".7"/>
      <path d="M128 171v-7c0-17 17-29 42-43 25 14 42 26 42 43v7" stroke="#fffef7" stroke-width="1.35" fill="none" opacity=".9"/>
    </g>
  </g>
  <g class="qibla-direction">
    <path class="qibla-light-trail" d="M137 143c9-38 12-66 21-92h24c9 26 12 54 21 92z" fill="url(#qibla-light-trail)"/>
    <g class="qibla-arrow-light" fill="url(#qibla-ivory-halo)">
      <ellipse cx="170" cy="82" rx="39" ry="43"/><ellipse cx="170" cy="43" rx="36" ry="33"/>
    </g>
    <path class="qibla-arrow" transform="translate(170 78) scale(1.4) translate(-170 -78)" d="m170 69 9 18-9-4-9 4z" fill="#d0bf95"/>
    <g class="qibla-kaaba" transform="translate(170 43) scale(1.4) translate(-170 -43)">
      <path d="m159 34 11-5 11 5v18l-11 5-11-5z" fill="#16212f" stroke="#c7b483" stroke-width="1"/>
      <path d="m159 34 11 5 11-5m-11 5v18" stroke="#c7b483" stroke-width=".7" fill="none"/>
      <path d="m159 40 11 5 11-5v3l-11 5-11-5z" fill="#c7b483"/>
    </g>
  </g>
</svg>`;

export function renderQiblaView({ cityName = '', bearing, hasCity = false } = {}) {
  const angle = Number.isFinite(bearing) ? `${Math.round((bearing % 360 + 360) % 360) % 360}°` : '—';
  return `<section class="qibla-page" aria-labelledby="qibla-title">
    <div class="qibla-head"><div><h1 id="qibla-title">Кибла</h1><p class="qibla-location">${hasCity ? esc(cityName) : 'Выберите город, чтобы рассчитать направление'}</p></div></div>
    <div class="qibla-card">
      <div id="qibla-stage" class="qibla-stage" style="--qibla-rotation:0deg;--compass-rotation:0deg;--qibla-light:0" aria-hidden="true">
        <span class="qibla-phone-axis"></span>
        <div class="qibla-compass"><div class="qibla-ticks"></div><span class="qibla-north">N</span><span class="qibla-east">E</span><span class="qibla-south">S</span><span class="qibla-west">W</span></div>
        <div class="qibla-orientation">${rug}</div>
      </div>
      <div class="qibla-guidance" role="status" aria-live="polite" aria-atomic="true"><svg id="qibla-check" class="qibla-check" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" hidden><path d="m4 9 3.1 3.1L14 5.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><p id="qibla-instruction">Определяем направление Киблы</p></div>
      <p class="qibla-light-hint">Чем точнее направление, тем ярче становится свет.</p>
      <div class="qibla-readouts"><div><span class="qibla-readout-label">Угол Киблы</span><strong class="qibla-bearing">${hasCity ? angle : '—'}</strong><span class="qibla-readout-note">от географического севера</span></div><div><span class="qibla-readout-label">Отклонение телефона</span><strong id="qibla-error">—</strong><span class="qibla-readout-note">от направления Киблы</span></div></div>
      <p id="sensor-state" class="qibla-sensor-state" role="status">Для определения направления Киблы требуется доступ к датчикам устройства.</p>
      ${hasCity ? '' : '<button class="button qibla-enable" id="qibla-city">Выбрать город</button>'}
      <p class="qibla-signature"><span>SALAH</span><small>by Saadi Kobilov</small></p>
    </div>
  </section>`;
}
