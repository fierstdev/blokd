import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createPages } from 'blokd/hono';
import routes from 'virtual:blokd/routes';

const app = new Hono<{ Variables: { requestId: string; startedAt: number } }>();

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  c.set('startedAt', Date.now());
  await next();
});

app.get('/api/health', c => c.json({ ok: true, requestId: c.get('requestId') }));
app.get('/assets/*', async c => serveAsset(c.req.path));
app.get('/styles.css', async () => servePublicAsset('styles.css'));
app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));

async function serveAsset(pathname: string): Promise<Response> {
  const relative = normalize(pathname.replace(/^\/assets\//, '')).replace(/^\.\.(\/|\\)/, '');
  return serveFile(join(process.cwd(), 'dist/client/assets', relative));
}

async function servePublicAsset(name: string): Promise<Response> {
  return serveFile(join(process.cwd(), 'public', name));
}

async function serveFile(path: string): Promise<Response> {
  try {
    const body = await readFile(path);
    return new Response(body, { headers: { 'content-type': contentType(path), 'cache-control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Not Found', { status: 404 });
  }
}

function contentType(path: string): string {
  const ext = extname(path);
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 3000);
  serve({ fetch: app.fetch, port });
  console.log(`listening on http://localhost:${port}`);
}

export default app;
