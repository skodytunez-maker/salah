import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { RECITERS, adjacentReciterSurah, reciterHasSurah, reciterOptions } from '../dist/js/quran-reciters.js';
import { audioUrl, loadIndex } from '../dist/js/quran-data.js';
import { COMPETITION_RECITERS } from '../supabase/functions/reciter-competition/core.mjs';
import { COMPETITION_RECITERS as GUEST_RECITERS } from '../supabase/functions/guest-competition/competition-core.mjs';

const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');
const sources = new Map([
  ['ar.abdullahbasfar', ['abdullah-basfar', 60]],
  ['ar.ibrahimalakhdar', ['ibrahim-akhdar', 1]],
  ['ar.khalidalqahtani', ['khalid-qahtani', 21]],
  ['ar.tawfeeqalsayegh', ['tawfeeq-sayegh', 17]],
  ['ar.khalifaaltunaiji', ['khalifa-tunaiji', 24]],
  ['ar.ahmadamer', ['ahmad-amer', 203]],
  ['ar.abdulhadikanakeri', ['abdulhadi-kanakeri', 70]],
  ['ar.abdullahalmatroud', ['abdullah-matrood', 59]],
  ['ar.abdullahkhayyat', ['abdullah-khayyat', 61]],
  ['ar.abdulwadoodhaneef', ['abdulwadood-haneef', 71]],
  ['ar.zainmuhammadahmad', ['zain-ahmad', 13]],
  ['ar.muhammadalmuhaisni', ['muhammad-muhaisni', 108]],
  ['ar.nabilalrifai', ['nabil-rifai', 87]],
  ['ar.yahyahawwa', ['yahya-hawwa', 96]],
  ['ar.muhammadrashidalsharif', ['muhammad-shareef', 198]],
  ['ar.abdullahalkhalaf', ['abdullah-khalaf', 244]],
  ['ar.hasansaleh', ['hassan-saleh', 286]],
  ['ar.abdurrahmanalshahhat', ['abdulrahman-shahat', 287]],
]);
const index = JSON.parse(await read('dist/data/quran-index.json'));
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async () => Response.json(index);
try {
  await loadIndex();
} finally {
  globalThis.fetch = fetchOriginal;
}

const popularity = await read('supabase/functions/reciter-popularity/index.ts');
const omarId = 'ar.omaribndiyaaldin';
const omar = RECITERS.find(reciter => reciter.id === omarId);
const omarDirectory = 'https://media.way2quran.com/omar-diaa-al-din/hafs-an-asim/';
const omarSurahs = [2,3,4,5,6,8,9,10,12,15,17,18,19,20,23,24,25,29,31,32,33,34,35,40,44,47,49,50,53,55,56,57,58,59,60,62,63,64,66,67,68,69,70,71,72,73,74,75,76,77,78];
assert.deepEqual(omar.availableSurahs, omarSurahs);
assert.equal(omar.offline, false);
assert.ok(reciterOptions(omarId).includes('value="' + omarId + '" selected'));
assert.ok(!reciterOptions(omarId, [], { offline: true }).includes('value="' + omarId + '"'));
assert.equal(reciterHasSurah(omarId, 1), false);
const csp = (await read('dist/index.html')).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
const mediaSources = csp.split(';').find(directive => directive.trim().startsWith('media-src ')).trim().split(/\s+/);
assert.ok(mediaSources.includes(omarDirectory));
assert.ok(!mediaSources.includes(new URL(omarDirectory).origin));
for (const [position, number] of omarSurahs.entries()) {
  const url = omarDirectory + String(number).padStart(3, '0') + '.mp3';
  assert.equal(audioUrl(1, omarId, number), url);
  assert.equal(adjacentReciterSurah(omarId, number, 1), omarSurahs[position + 1] ?? null);
}
assert.ok(COMPETITION_RECITERS.includes(omarId));
assert.ok(GUEST_RECITERS.includes(omarId));
assert.ok(popularity.includes(JSON.stringify(omarId)));

for (const [id, [source, sourceId]] of sources) {
  const entry = RECITERS.find(reciter => reciter.id === id);
  assert.equal(entry.format, 'surah');
  assert.equal(entry.offline, false);
  assert.match(entry.sourceApi, new RegExp('reciter=' + sourceId + '$'));
  assert.ok(reciterOptions(id).includes('value="' + id + '" selected'));
  assert.ok(!reciterOptions(id, [], { offline: true }).includes('value="' + id + '"'));
  for (const chapter of index.surahs) {
    const number = chapter.number;
    assert.ok(reciterHasSurah(id, number));
    assert.equal(audioUrl(1, id, number), 'https://cdn.mp3quran.net/audio/' + source + '/r1/' + String(number).padStart(3, '0') + '.mp3');
    assert.equal(adjacentReciterSurah(id, number, 1), number < 114 ? number + 1 : null);
  }
  assert.ok(COMPETITION_RECITERS.includes(id));
  assert.ok(GUEST_RECITERS.includes(id));
  assert.ok(popularity.includes(JSON.stringify(id)));
}

const { PGlite } = createRequire(import.meta.url)('../tests/staff/node_modules/@electric-sql/pglite');
const db = await PGlite.create();
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  const baseline = await read('supabase/reciter-popularity.sql');
  await db.exec(baseline.replace(/select cron\.schedule[\s\S]*$/, ''));
  await db.exec(await read('supabase/migrations/20261111000000_recorded_listening_minutes.sql'));
  const routines = async () => (await db.query(`
    select pronargs, pg_get_functiondef(oid) as body, prosecdef, proconfig, proacl::text as grants
    from pg_proc
    where pronamespace = 'public'::regnamespace and proname = 'reciter_popularity_add'
    order by pronargs
  `)).rows;
  const before = await routines();
  const migration = await read('supabase/migrations/20261121140524_quran_streaming_reciters.sql');
  await db.exec(migration);
  const omarMigration = await read('supabase/migrations/20261127030930_omar_ibn_diya_al_din_listening.sql');
  await db.exec(omarMigration);
  const after = await routines();
  await db.exec(omarMigration);
  assert.deepEqual(await routines(), after);
  const ids = [...sources.keys(), omarId];
  const added = ids.map(id => ",'" + id + "'").join('');
  assert.deepEqual(after.map(row => ({ ...row, body: row.body.replace(added, '') })), before);

  for (const [position, id] of ids.entries()) {
    for (const argumentCount of [3, 4]) {
      const listener = (argumentCount * 100 + position).toString(16).padStart(64, '0');
      const event = '22222222-2222-4222-8222-' + String(argumentCount * 100 + position).padStart(12, '0');
      const query = 'select public.reciter_popularity_add($1,$2,$3::uuid' + (argumentCount === 4 ? ',current_date' : '') + ') as accepted';
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await db.query(query, [listener, id, event]);
        assert.equal(result.rows[0].accepted, true);
      }
      const result = await db.query('select minutes from public.reciter_popularity_minutes where listener_hash = $1 and reciter = $2', [listener, id]);
      assert.equal(result.rows[0].minutes, 1);
    }
  }
  await assert.rejects(() => db.query('select public.reciter_popularity_add($1,$2,$3::uuid,current_date)', [
    'd'.repeat(64), 'ar.unknownreciter', '44444444-4444-4444-8444-444444444444',
  ]), /invalid_input/);
} finally {
  await db.close();
}

console.log('PASS: streaming reciter sources, Omar’s 51 playable surahs and sparse handoffs, offline selection and deduplicated listening in both PostgreSQL overloads.');
