// Starts json-server against a working copy of the seed data so that
// POST/PATCH/DELETE during development never modify the committed seed.
//   node mock-api/serve.mjs            start (reuses existing data)
//   node mock-api/serve.mjs --reset    start from a fresh copy of seed.json
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, 'seed.json');
const db = join(here, 'db.json');
const port = process.env.API_PORT ?? '3000';

if (process.argv.includes('--reset') || !existsSync(db)) {
  copyFileSync(seed, db);
  console.log('mock-api: database reset from seed.json');
}

const bin = join(here, '..', 'node_modules', 'json-server', 'lib', 'bin.js');
const child = spawn(process.execPath, [bin, db, '--port', port], { stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code) => process.exit(code ?? 0));
