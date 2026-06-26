import { Hono } from 'hono';
import { createPages } from 'blokd/hono';
import routes from 'virtual:blokd/routes';

const app = new Hono<{ Bindings: Env; Variables: { requestId: string } }>();

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  c.header('x-content-type-options', 'nosniff');
  c.header('referrer-policy', 'strict-origin-when-cross-origin');
  c.header('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  await next();
});

app.get('/api/health', c => c.json({
  ok: true,
  site: 'blokd.dev',
  runtime: 'cloudflare-workers',
  requestId: c.get('requestId')
}));

app.get('/assets/*', c => c.env.ASSETS.fetch(c.req.raw));
app.get('/favicon.svg', c => c.env.ASSETS.fetch(c.req.raw));

app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
} satisfies ExportedHandler<Env>;
