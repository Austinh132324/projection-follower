// Copy non-TS runtime assets into dist/ after tsc. Currently just the SQL
// schema, which db/client.ts reads at startup.
import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await cp(
  path.join(root, 'src/db/schema.sql'),
  path.join(root, 'dist/db/schema.sql'),
);
console.log('copied schema.sql -> dist/db/schema.sql');
