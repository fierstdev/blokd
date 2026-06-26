import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('../examples/blokd-dev/dist/', import.meta.url).pathname;
const client = join(root, 'client');
const workerEntry = join(root, 'worker/entry-worker.js');

function fail(message) {
  console.error(`[blokd.dev smoke] ${message}`);
  process.exit(1);
}

if (!existsSync(client)) fail('missing examples/blokd-dev/dist/client; run pnpm build:site first');
if (!existsSync(workerEntry)) fail('missing Worker entry bundle');
if (!existsSync(join(client, 'assets/client.css'))) fail('missing compiled Tailwind/daisyUI stylesheet');
if (!existsSync(join(client, 'assets/client.js'))) fail('missing client asset entry');

const clientJs = readFileSync(join(client, 'assets/client.js'), 'utf8');
if (clientJs.includes('@babel/core')) fail('client bundle contains @babel/core');
if (clientJs.includes('node:fs') || clientJs.includes('node:path')) fail('client bundle contains Node built-ins');

const worker = await import(pathToFileURL(workerEntry).href);
const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      const relative = normalize(url.pathname.replace(/^\//, '') || 'index.html').replace(/^\.\.(\/|\\)/, '');
      const file = join(client, relative);
      if (!file.startsWith(client) || !existsSync(file)) return new Response('Not Found', { status: 404 });
      const body = await readFile(file);
      const headers = new Headers();
      if (file.endsWith('.css')) headers.set('content-type', 'text/css; charset=utf-8');
      else if (file.endsWith('.js')) headers.set('content-type', 'text/javascript; charset=utf-8');
      else if (file.endsWith('.svg')) headers.set('content-type', 'image/svg+xml');
      return new Response(body, { headers });
    }
  },
  ENVIRONMENT: 'smoke'
};

async function fetchWorker(path) {
  return worker.default.fetch(new Request(`https://blokd.dev${path}`), env, {});
}

for (const path of ['/', '/docs', '/docs/getting-started', '/docs/cloudflare-workers', '/deploy']) {
  const response = await fetchWorker(path);
  if (response.status !== 200) fail(`${path} returned ${response.status}`);
  const body = await response.text();
  if (!body.includes('Blokd')) fail(`${path} did not render Blokd content`);
  if (body.includes('src="/assets/client.js"')) fail(`${path} emitted client script for a static route`);
}

const missing = await fetchWorker('/missing');
if (missing.status !== 404) fail(`/missing returned ${missing.status}`);

const health = await fetchWorker('/api/health');
if (health.status !== 200) fail(`/api/health returned ${health.status}`);
const healthJson = await health.json();
if (healthJson.runtime !== 'cloudflare-workers') fail('/api/health did not report Cloudflare Workers runtime');

const css = await fetchWorker('/assets/client.css');
if (css.status !== 200 || !String(css.headers.get('content-type')).includes('text/css')) fail('/assets/client.css did not serve compiled CSS');

console.log('[blokd.dev smoke] Cloudflare Workers site build looks valid');
