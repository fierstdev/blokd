import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = new URL('..', import.meta.url).pathname;
const restaurantRoot = join(repoRoot, 'examples/basic');
const restaurantEntry = join(restaurantRoot, 'dist/server/entry-server.js');
const siteWorkerEntry = join(repoRoot, 'examples/blokd-dev/dist/worker/entry-worker.js');

function fail(message) {
  console.error(`[blokd adapter smoke] ${message}`);
  process.exit(1);
}

if (!existsSync(restaurantEntry)) fail('missing restaurant server bundle; run pnpm build:restaurant first');
if (!existsSync(siteWorkerEntry)) fail('missing blokd.dev worker bundle; run pnpm build:site first');

const previousCwd = process.cwd();
process.chdir(restaurantRoot);
const restaurant = await import(pathToFileURL(restaurantEntry).href);
process.chdir(previousCwd);

async function fetchRestaurant(path, init) {
  const cwd = process.cwd();
  process.chdir(restaurantRoot);
  try {
    return await restaurant.default.fetch(new Request(`https://restaurant.example${path}`, init));
  } finally {
    process.chdir(cwd);
  }
}

const home = await fetchRestaurant('/');
if (home.status !== 200) fail(`restaurant / returned ${home.status}`);
const homeHtml = await home.text();
if (!homeHtml.includes('Juniper Table')) fail('restaurant / did not render page HTML');
if (!homeHtml.includes('/assets/client.js')) fail('restaurant / did not include client entry for resumable island');

const menu = await fetchRestaurant('/menu');
if (menu.status !== 200) fail(`restaurant /menu returned ${menu.status}`);
const menuHtml = await menu.text();
if (menuHtml.includes('/assets/client.js')) fail('static restaurant /menu emitted shared client entry');

const counter = await fetchRestaurant('/counter');
if (counter.status !== 200) fail(`restaurant /counter returned ${counter.status}`);
const counterHtml = await counter.text();
if (!counterHtml.includes('/assets/blokd-route-counter.js')) fail('/counter did not emit route-local island entry');
if (counterHtml.includes('/assets/client.js')) fail('/counter emitted shared client entry despite route-local island entry');

const previousLog = console.log;
console.log = () => undefined;
let reservation;
try {
  reservation = await fetchRestaurant('/reservations', {
    method: 'POST',
    body: new URLSearchParams({ name: 'Ada', email: 'ada@example.com', date: '2026-08-01', time: '19:00', partySize: '4' }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    redirect: 'manual'
  });
} finally {
  console.log = previousLog;
}
if (![302, 303].includes(reservation.status)) fail(`restaurant reservation action returned ${reservation.status}`);
if (reservation.headers.get('location') !== '/thanks') fail('restaurant reservation action did not redirect to /thanks');

const asset = await fetchRestaurant('/assets/client.js');
if (asset.status !== 200 || !String(asset.headers.get('content-type')).includes('javascript')) {
  fail('restaurant asset fetch did not return compiled JavaScript');
}

const siteWorker = await import(pathToFileURL(siteWorkerEntry).href);
const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      return new Response(`asset:${url.pathname}`, {
        headers: { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'text/plain' }
      });
    }
  },
  ENVIRONMENT: 'adapter-smoke'
};

const health = await siteWorker.default.fetch(new Request('https://blokd.dev/api/health'), env, {});
if (health.status !== 200) fail(`worker /api/health returned ${health.status}`);
const healthJson = await health.json();
if (healthJson.runtime !== 'cloudflare-workers') fail('worker health did not use Cloudflare-style fetch handler');

console.log('[blokd adapter smoke] Fetch adapter contracts look valid');
