import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'packages/blokd/src/core.ts',
  'packages/blokd/src/jsx-runtime.ts',
  'packages/blokd/src/dom.ts',
  'packages/blokd/src/server.ts',
  'packages/blokd/src/hono.ts',
  'packages/blokd/src/vite.ts',
  'packages/blokd/src/client.ts',
  'packages/blokd/src/resume.ts',
  'examples/basic/src/server.ts',
  'examples/blokd-dev/src/worker.ts',
  'examples/blokd-dev/wrangler.jsonc'
];
for (const file of required) {
  if (!existsSync(join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const pkg = JSON.parse(readFileSync(join(root, 'packages/blokd/package.json'), 'utf8'));
for (const subpath of ['.', './core', './dom', './jsx-runtime', './server', './hono', './vite', './client', './resume']) {
  if (!pkg.exports[subpath]) throw new Error(`Missing export: ${subpath}`);
}
console.log('blokd package structure verified');
