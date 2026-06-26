import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../examples/basic/dist/', import.meta.url).pathname;
const client = join(root, 'client');
const server = join(root, 'server');

function fail(message) {
  console.error(`[blokd smoke] ${message}`);
  process.exit(1);
}

if (!existsSync(client)) fail('missing examples/basic/dist/client; run pnpm build:restaurant first');
if (!existsSync(server)) fail('missing examples/basic/dist/server; run pnpm build:restaurant first');
if (!existsSync(join(server, 'entry-server.js'))) fail('missing server entry bundle');
if (!existsSync(join(client, 'assets/client.js'))) fail('missing client entry bundle');

function walk(dir, out = []) {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const clientFiles = walk(client).filter(file => file.endsWith('.js'));
const combined = clientFiles.map(file => readFileSync(file, 'utf8')).join('\n');
if (combined.includes('@babel/core')) fail('client bundle contains @babel/core');
if (combined.includes('node:fs') || combined.includes('node:path')) fail('client bundle contains Node built-ins');
if (!combined.includes('data-blokd-on') || !combined.includes('data-blokd-island')) {
  fail('client bundle does not appear to include resumability runtime');
}
if (!combined.includes('/src/resumables/private-dining.ts#updateGuests')) {
  fail('client bundle does not register the production private dining handler');
}

console.log(`[blokd smoke] restaurant build looks valid (${clientFiles.length} client JS files checked)`);
