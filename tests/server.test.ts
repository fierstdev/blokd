import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createPages, matchRoute, type RouteEntry } from '../packages/blokd/src/hono.js';
import { For, Show } from '../packages/blokd/src/dom.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';
import { notFound, redirect, renderToString, safeJsonScript } from '../packages/blokd/src/server.js';

describe('server rendering', () => {
  it('escapes HTML and renders control flow', () => {
    const output = renderToString(() => jsx('main', {
      children: [
        jsx('h1', { children: '<unsafe>' }),
        jsx(Show as any, { when: true, children: jsx('p', { children: 'Visible' }) }),
        jsx(For as any, { each: ['a', 'b'], by: (x: string) => x, children: (x: string) => jsx('span', { children: x }) })
      ]
    }));
    expect(output).toContain('&lt;unsafe&gt;');
    expect(output).toContain('<p>Visible</p>');
    expect(output).toContain('<span>a</span><span>b</span>');
  });

  it('safely serializes JSON for script tags', () => {
    expect(safeJsonScript({ x: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });
});

describe('hono pages', () => {
  it('matches static, dynamic, and catch-all routes', () => {
    const routes = [
      { id: 'home', path: '/', module: async () => ({}) },
      { id: 'post', path: '/posts/:slug', module: async () => ({}) },
      { id: 'docs', path: '/docs/:path*', module: async () => ({}) }
    ] satisfies RouteEntry[];
    expect(matchRoute(routes, '/')?.entry.id).toBe('home');
    expect(matchRoute(routes, '/posts/hello')?.params.slug).toBe('hello');
    expect(matchRoute(routes, '/docs/a/b')?.params.path).toBe('a/b');
  });

  it('serves document and data responses', async () => {
    const routes: RouteEntry[] = [{
      id: 'index',
      path: '/',
      layouts: [async () => ({ default: (props: any) => jsx('main', { children: props.children }), meta: () => ({ title: 'Root' }) })],
      module: async () => ({
        loader: () => ({ message: 'hello' }),
        meta: ({ data }: any) => ({ title: data.message }),
        default: (props: any) => jsx('h1', { children: props.data.message })
      })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes }));
    const html = await app.request('http://x/');
    expect(html.status).toBe(200);
    expect(await html.text()).toContain('<h1>hello</h1>');
    const data = await app.request('http://x/?__blokd', { headers: { accept: 'application/json' } });
    expect(await data.json()).toEqual({ data: { message: 'hello' }, meta: { htmlAttrs: {}, bodyAttrs: {}, meta: [], links: [], scripts: [], title: 'hello' } });
  });

  it('runs actions and supports redirects/notFound', async () => {
    const routes: RouteEntry[] = [
      { id: 'form', path: '/form', module: async () => ({ action: () => redirect('/thanks'), default: () => jsx('form', {}) }) },
      { id: 'missing', path: '/missing', module: async () => ({ loader: () => notFound(), default: () => null }) }
    ];
    const app = new Hono();
    app.route('/', createPages({ routes }));
    const action = await app.request('http://x/form', { method: 'POST' });
    expect(action.status).toBe(302);
    expect(action.headers.get('location')).toBe('/thanks');
    const missing = await app.request('http://x/missing');
    expect(missing.status).toBe(404);
  });

  it('re-renders native form action data without client JavaScript', async () => {
    const routes: RouteEntry[] = [{
      id: 'contact',
      path: '/contact',
      hasClient: false,
      module: async () => ({
        action: async ({ request }) => {
          const form = await request.formData();
          const email = String(form.get('email') ?? '');
          if (!email.includes('@')) return { ok: false, error: 'Enter a valid email.' };
          return { ok: true, email };
        },
        default: (props: any) => jsx('section', {
          children: [
            props.data?.error ? jsx('p', { role: 'alert', children: props.data.error }) : null,
            props.data?.ok ? jsx('p', { children: `Subscribed ${props.data.email}` }) : null,
            jsx('form', {
              method: 'post',
              children: [
                jsx('input', { name: 'email', type: 'email', required: true }),
                jsx('button', { children: 'Subscribe' })
              ]
            })
          ]
        })
      })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));

    const invalid = await app.request('http://x/contact', {
      method: 'POST',
      body: new URLSearchParams({ email: 'nope' }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    });
    const invalidHtml = await invalid.text();
    expect(invalid.status).toBe(200);
    expect(invalidHtml).toContain('Enter a valid email.');
    expect(invalidHtml).not.toContain('/assets/client.js');

    const valid = await app.request('http://x/contact', {
      method: 'POST',
      body: new URLSearchParams({ email: 'person@example.com' }),
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    });
    expect(await valid.text()).toContain('Subscribed person@example.com');
  });

  it('returns JSON action objects for data requests', async () => {
    const routes: RouteEntry[] = [{
      id: 'contact',
      path: '/contact',
      module: async () => ({
        action: async () => ({ ok: false, error: 'Enter a valid email.' }),
        default: () => jsx('form', { method: 'post' })
      })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes }));

    const response = await app.request('http://x/contact?__blokd', {
      method: 'POST',
      headers: { accept: 'application/json' }
    });

    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({ ok: false, error: 'Enter a valid email.' });
  });

  it('prefers route-local client entries over the global fallback', async () => {
    const routes: RouteEntry[] = [{
      id: 'interactive',
      path: '/',
      hasClient: true,
      clientEntry: '/assets/blokd-route-index.js',
      module: async () => ({ default: () => jsx('h1', { children: 'Interactive' }) })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));

    const response = await app.request('http://x/');
    const body = await response.text();
    expect(body).toContain('/assets/blokd-route-index.js');
    expect(body).not.toContain('/assets/client.js');
  });
});
