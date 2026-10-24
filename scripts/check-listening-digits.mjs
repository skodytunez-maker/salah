import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {listeningSummaryMarkup,updateListeningSummary} from '../dist/js/listening-summary.js';
import {formatListeningTime} from '../dist/js/reciter-popularity-core.js';
const window=new Window(),host=window.document.createElement('main');window.document.body.append(host);
host.innerHTML=listeningSummaryMarkup(3658);const total=host.querySelector('[data-listening-total]'),visual=total.firstElementChild;
const digits=[...visual.querySelectorAll('[data-listening-place]')];
assert.equal(total.textContent,'1 ч 0 мин 58 с');
updateListeningSummary(host,3659);
assert.equal(total.textContent,'1 ч 0 мин 59 с');assert.equal(total.getAttribute('aria-label'),total.textContent);
assert.equal(total.firstElementChild,visual);assert.equal(total.querySelectorAll('[data-listening-place]').length,digits.length);
digits.forEach(digit=>assert.ok(visual.contains(digit),'Normal ticks reuse the same digit slots'));
assert.equal(digits.at(-1).dataset.previous,'8');assert.equal(digits.at(-1).textContent,'9','Old glyph is CSS-only, never duplicated in accessible text');
const unchanged=total.innerHTML;updateListeningSummary(host,3659);assert.equal(total.innerHTML,unchanged,'An unchanged tick does not restart animation');
updateListeningSummary(host,3660);assert.equal(total.textContent,'1 ч 1 мин');assert.equal(total.querySelector('[data-listening-place="мин-0"]').dataset.previous,'0');
updateListeningSummary(host,3661);assert.equal(total.textContent,'1 ч 1 мин 1 с');
updateListeningSummary(host,120);assert.equal(total.textContent,'0 ч 2 мин');assert.equal(total.querySelector('[data-previous]'),null,'Corrections have no backwards rolling animation');
updateListeningSummary(host,36000);assert.equal(total.textContent,'10 ч 0 мин');
updateListeningSummary(host,null);assert.equal(total.textContent,'…');
updateListeningSummary(host,100);assert.equal(total.textContent,'0 ч 1 мин 40 с');assert.equal(total.querySelector('[data-previous]'),null);
for(const seconds of [0,1,9,10,59,60,61,3599,3600,3601,359999,360000,987654321]){updateListeningSummary(host,seconds);assert.equal(total.textContent,formatListeningTime(seconds),'Original format, units and spaces remain unchanged');}
for(const seconds of [NaN,-1,null]){updateListeningSummary(host,seconds);assert.equal(total.textContent,'…');}
host.innerHTML=listeningSummaryMarkup(60,{personal:true});updateListeningSummary(host,61);assert.equal(host.querySelector('strong').textContent,'0 ч 1 мин 1 с','Personal total preserves its existing format');
assert.equal(host.querySelector('[data-listening-animated]'),null);
await window.happyDOM.close();console.log('PASS: stable digit slots, hour/minute carry, silent duplicate ticks, forward-only transitions, correction/reset/unknown values, accessible text and unchanged personal totals.');
