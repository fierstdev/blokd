import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const budgets = {
  'core.js': 3500,
  'jsx-runtime.js': 9000,
  'dom.js': 5000,
  'client.js': 3500,
  'resume.js': 4500,
  'server.js': 8000,
  'hono.js': 6500,
  'app.js': 3000,
  'components.js': 2500,
  'island.js': 4500
};
const dist = join(process.cwd(), 'packages/blokd/dist');
if (!existsSync(dist)) {
  console.log('dist missing; run pnpm build before pnpm size');
  process.exit(0);
}
let failed = false;
for (const [file, budget] of Object.entries(budgets)) {
  const path = join(dist, file);
  if (!existsSync(path)) continue;
  const size = gzipSync(readFileSync(path)).byteLength;
  console.log(`${file}: ${size} gzip bytes / ${budget}`);
  if (size > budget) failed = true;
}
if (failed) throw new Error('Size budget exceeded');
