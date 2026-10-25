import assert from 'node:assert/strict';import{NATIVE_UNIT_IDS,validNativeProgress,normalizeNativeProgress,NATIVE_BOOK_ID}from '../dist/js/owner-native-progress.js';
assert.equal(NATIVE_UNIT_IDS.length,51);assert.equal(new Set(NATIVE_UNIT_IDS).size,51);
const value={version:1,bookId:NATIVE_BOOK_ID,last:'letter-mim',completed:['letter-ra','rule-madd-types']};
assert.ok(validNativeProgress(value));assert.deepEqual(normalizeNativeProgress(value),value);
for(const bad of [null,[],{...value,bookId:'other'},{...value,last:'__proto__'},{...value,role:'teacher'},{...value,completed:['letter-ra','letter-ra']},{...value,completed:['root-owner']},{...value,completed:NATIVE_UNIT_IDS.concat('extra')}])assert.equal(validNativeProgress(bad),false);
assert.ok(validNativeProgress({...value,completed:[...NATIVE_UNIT_IDS]}));const copy=normalizeNativeProgress(value);copy.completed.push('letter-ba');assert.equal(value.completed.length,2);
console.log('PASS:51 bounded native-course IDs, independent progress, strict schema and no privilege/unknown-unit payloads.');
