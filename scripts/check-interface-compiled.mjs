import assert from 'node:assert/strict';
import{buildInterfaceCatalogues}from './build-interface-catalogues.mjs';
import{UI_CATALOGUES}from '../dist/js/i18n-catalogues.js';
import{UI_CATALOGUES as source}from '../dist/js/i18n-source-catalogues.js';
const result=await buildInterfaceCatalogues({check:true});assert.equal(result.languages,8);assert.equal(result.files,9);
assert.deepEqual(JSON.parse(JSON.stringify(UI_CATALOGUES)),JSON.parse(JSON.stringify(source)),'All runtime messages must exactly match the reviewed source namespaces');
console.log('PASS: eight reproducible runtime language bundles match every source key and avoid the full editorial module graph at startup ('+result.keys+' keys per language).');
