import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createPages, type RouteEntry } from '../packages/blokd/src/hono.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';
import { httpError, notFound } from '../packages/blokd/src/server.js';
import { makeManifestCode } from '../packages/blokd/src/vite.js';

describe('beta route boundaries', () => {
  it('renders a matched _404 boundary for notFound()', async () => {
    const routes: RouteEntry[] = [{
      id: 'missing',
      path: '/missing',
      layouts: [async () => ({ default: (props: any) => jsx('main', { children: props.children }) })],
      notFound: async () => ({ default: () => jsx('h1', { children: 'Custom 404' }) }),
      module: async () => ({ loader: () => notFound(), default: () => jsx('p', { children: 'unreachable' }) })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));
    const response = await app.request('http://x/missing');
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain('<main><h1>Custom 404</h1></main>');
  });

  it('renders a root _404 boundary for unmatched paths', async () => {
    const routes: RouteEntry[] = [{
      id: 'index',
      path: '/',
      notFound: async () => ({ default: () => jsx('h1', { children: 'Root 404' }) }),
      module: async () => ({ default: () => jsx('p', { children: 'home' }) })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes }));
    const response = await app.request('http://x/nope');
    expect(response.status).toBe(404);
    expect(await response.text()).toContain('<h1>Root 404</h1>');
  });

  it('prefers the root _404 boundary for unmatched paths even when nested routes are listed first', async () => {
    const routes: RouteEntry[] = [
      {
        id: 'admin/index',
        path: '/admin',
        notFound: async () => ({ default: () => jsx('h1', { children: 'Nested 404' }) }),
        module: async () => ({ default: () => jsx('p', { children: 'admin' }) })
      },
      {
        id: 'index',
        path: '/',
        notFound: async () => ({ default: () => jsx('h1', { children: 'Root 404' }) }),
        module: async () => ({ default: () => jsx('p', { children: 'home' }) })
      }
    ];
    const app = new Hono();
    app.route('/', createPages({ routes }));
    const response = await app.request('http://x/nope');
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).toContain('<h1>Root 404</h1>');
    expect(body).not.toContain('Nested 404');
  });

  it('renders _error for thrown 5xx HttpError', async () => {
    const routes: RouteEntry[] = [{
      id: 'boom',
      path: '/boom',
      error: async () => ({ default: (props: any) => jsx('h1', { children: `Error ${props.status}` }) }),
      module: async () => ({ loader: () => httpError(503, 'Unavailable'), default: () => null })
    }];
    const app = new Hono();
    app.route('/', createPages({ routes }));
    const response = await app.request('http://x/boom');
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('<h1>Error 503</h1>');
  });

  it('does not serialize stack traces in production error boundary data', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const routes: RouteEntry[] = [{
        id: 'boom',
        path: '/boom',
        error: async () => ({ default: () => jsx('h1', { children: 'Error' }) }),
        module: async () => ({ loader: () => { throw new Error('secret stack'); }, default: () => null })
      }];
      const app = new Hono();
      app.route('/', createPages({ routes }));
      const response = await app.request('http://x/boom');
      const body = await response.text();
      expect(response.status).toBe(500);
      expect(body).toContain('<h1>Error</h1>');
      expect(body).toContain('"error":{"status":500}');
      expect(body).not.toContain('secret stack');
      expect(body).not.toContain('stack');
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});

describe('beta static-route analysis', () => {
  it('marks non-interactive routes as hasClient false and interactive imported routes as true', () => {
    const root = mkdtempSync(join(tmpdir(), 'blokd-routes-'));
    const routes = join(root, 'src/routes');
    const components = join(root, 'src/components');
    mkdirSync(routes, { recursive: true });
    mkdirSync(components, { recursive: true });
    writeFileSync(join(routes, '_layout.tsx'), 'export default function Layout(props:any){ return <main>{props.children}</main> }');
    writeFileSync(join(routes, 'about.tsx'), 'export default function About(){ return <h1>About</h1> }');
    writeFileSync(join(components, 'Counter.tsx'), 'import { signal } from "blokd"; export function Counter(){ const [n,setN]=signal(0); return <button onClick={()=>setN(n()+1)}>{n()}</button> }');
    writeFileSync(join(routes, 'interactive.tsx'), 'import { Counter } from "../components/Counter"; export default function Page(){ return <Counter/> }');
    writeFileSync(join(routes, '_404.tsx'), 'export default function NotFound(){ return <h1>Not Found</h1> }');
    writeFileSync(join(routes, '_error.tsx'), 'export default function Error(){ return <h1>Error</h1> }');

    const code = makeManifestCode(root, routes);
    expect(code).toContain('id: "about"');
    expect(code).toContain('path: "/about"');
    expect(code).toContain('hasClient: false');
    expect(code).toContain('id: "interactive"');
    expect(code).toContain('hasClient: true');
    expect(code).toContain('notFound: () => import');
    expect(code).toContain('error: () => import');
  });

  it('marks direct client markers as interactive', () => {
    const root = mkdtempSync(join(tmpdir(), 'blokd-client-markers-'));
    const routes = join(root, 'src/routes');
    mkdirSync(routes, { recursive: true });
    writeFileSync(join(routes, 'event.tsx'), 'export default function Page(){ return <button onClick={() => undefined}>Run</button> }');
    writeFileSync(join(routes, 'signal.tsx'), 'import { signal } from "blokd"; export default function Page(){ const [n]=signal(1); return <p>{n()}</p> }');
    writeFileSync(join(routes, 'memo.tsx'), 'import { memo } from "blokd"; export default function Page(){ const n=memo(() => 1); return <p>{n()}</p> }');
    writeFileSync(join(routes, 'effect.tsx'), 'import { effect } from "blokd"; export default function Page(){ effect(() => undefined); return <p>effect</p> }');
    writeFileSync(join(routes, 'client-component.tsx'), 'import { clientComponent } from "blokd/components"; const Widget = clientComponent(() => <button>Run</button>); export default function Page(){ return <Widget /> }');
    writeFileSync(join(routes, 'island.tsx'), 'import { Island } from "blokd"; export default function Page(){ return <Island name="x" /> }');
    writeFileSync(join(routes, 'resumable.tsx'), 'import { resumable } from "blokd"; export default function Page(){ return <button onClick={resumable("local#noop")}>Run</button> }');
    writeFileSync(join(routes, 'on.tsx'), 'import { on } from "blokd"; export default function Page(){ return <button onClick={on("local#noop")}>Run</button> }');
    writeFileSync(join(routes, 'client-entry.tsx'), 'import { startResumability } from "blokd/client"; startResumability(); export default function Page(){ return <p>client</p> }');

    const code = makeManifestCode(root, routes);
    for (const id of ['event', 'signal', 'memo', 'effect', 'client-component', 'island', 'resumable', 'on', 'client-entry']) {
      expect(code).toMatch(new RegExp(`id: "${id}"[\\s\\S]*?hasClient: true`));
    }
  });

  it('does not mark documentation code strings as interactive', () => {
    const root = mkdtempSync(join(tmpdir(), 'blokd-doc-snippets-'));
    const routes = join(root, 'src/routes');
    const content = join(root, 'src/content');
    mkdirSync(routes, { recursive: true });
    mkdirSync(content, { recursive: true });
    writeFileSync(join(content, 'docs.ts'), `
      export const snippets = [
        "import { Island, resumable } from 'blokd';",
        "import { startResumability } from 'blokd/client';",
        "<button onClick={resumable('/src/counter.ts#run')}>Run</button>"
      ];
    `);
    writeFileSync(join(routes, 'docs.tsx'), `
      import { snippets } from '../content/docs';
      export default function Docs(){ return <pre>{snippets.join('\\n')}</pre> }
    `);

    const code = makeManifestCode(root, routes);
    expect(code).toContain('id: "docs"');
    expect(code).toContain('hasClient: false');
  });
});
