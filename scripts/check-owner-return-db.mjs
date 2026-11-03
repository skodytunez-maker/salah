import {createRequire} from 'node:module';
await createRequire(import.meta.url)('../tests/engagement/check-owner-database.cjs').run();
