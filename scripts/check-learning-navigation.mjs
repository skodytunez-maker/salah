import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const learning=await readFile(new URL('../dist/js/learning.js',import.meta.url),'utf8');
const style=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');

assert.match(learning,/id="lesson-prev"/);
assert.match(learning,/id="lesson-next"/);
assert.match(learning,/Завершить/);
assert.match(learning,/host\.querySelector\('#lesson-prev'\).*moveLesson\(-1\)/);
assert.match(learning,/host\.querySelector\('#lesson-next'\).*moveLesson\(1\)/);
assert.doesNotMatch(learning,/Свайп влево —/);

assert.match(style,/\.lesson-controls\{pointer-events:auto;/);
assert.match(style,/@media\(max-width:520px\)\{\.lesson-controls\{gap:10px\}/);
assert.match(style,/\.lesson-controls \.button\{width:auto;flex:1 1 0;/);

console.log('PASS: prayer learning has explicit Back/Next controls, swipe remains optional, and mobile controls are tappable.');
