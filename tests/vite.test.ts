import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analyzeRoutes,
  blokd,
  createRouteRuntimeReport,
  fileToRoutePath,
  layoutFilesFor,
  makeManifestCode,
  makeIslandRegistryCode,
  measureClientOutputBytes,
  nearestSpecialFile,
  parseByteSize,
  segmentToPath,
  validateRouteBudgets
} from '../packages/blokd/src/vite.js';

function createRouteFixture(name: string): { root: string; routes: string } {
  const root = join(tmpdir(), `${name}-${randomUUID()}`);
  const routes = join(root, 'src/routes');
  mkdirSync(routes, { recursive: true });
  return { root, routes };
}

describe('vite route conventions', () => {
  it('converts route segments', () => {
    expect(segmentToPath('index')).toBe('');
    expect(segmentToPath('[slug]')).toBe(':slug');
    expect(segmentToPath('[...path]')).toBe(':path*');
    expect(segmentToPath('(marketing)')).toBe('');
  });

  it('converts files to route paths', () => {
    expect(fileToRoutePath('/app/src/routes', '/app/src/routes/index.tsx')).toBe('/');
    expect(fileToRoutePath('/app/src/routes', '/app/src/routes/posts/[slug].tsx')).toBe('/posts/:slug');
    expect(fileToRoutePath('/app/src/routes', '/app/src/routes/(docs)/[...path].tsx')).toBe('/:path*');
  });

  it('generates a hardened manifest for groups, catch-alls, layouts, boundaries, and private files', () => {
    const { root, routes } = createRouteFixture('blokd-manifest-hardening');
    const app = join(routes, '(app)');
    const docs = join(app, 'docs');
    const admin = join(app, 'admin');
    const privateDir = join(routes, '_private');
    mkdirSync(docs, { recursive: true });
    mkdirSync(admin, { recursive: true });
    mkdirSync(privateDir, { recursive: true });

    writeFileSync(join(routes, '_layout.tsx'), 'export default function Root(props:any){ return <html>{props.children}</html> }');
    writeFileSync(join(routes, '_404.tsx'), 'export default function RootNotFound(){ return <h1>Root 404</h1> }');
    writeFileSync(join(routes, '_error.tsx'), 'export default function RootError(){ return <h1>Root Error</h1> }');
    writeFileSync(join(app, '_layout.tsx'), 'export default function App(props:any){ return <main>{props.children}</main> }');
    writeFileSync(join(app, '_404.tsx'), 'export default function AppNotFound(){ return <h1>App 404</h1> }');
    writeFileSync(join(app, '_error.tsx'), 'export default function AppError(){ return <h1>App Error</h1> }');
    writeFileSync(join(app, 'index.tsx'), 'export default function Home(){ return <h1>Home</h1> }');
    writeFileSync(join(docs, '[...path].tsx'), 'export default function Docs(){ return <h1>Docs</h1> }');
    writeFileSync(join(admin, '[id].tsx'), 'export default function Admin(){ return <h1>Admin</h1> }');
    writeFileSync(join(routes, '_secrets.tsx'), 'export default function Secrets(){ return <h1>nope</h1> }');
    writeFileSync(join(privateDir, 'token.tsx'), 'export default function Token(){ return <h1>nope</h1> }');

    const home = join(app, 'index.tsx');
    const docCatchAll = join(docs, '[...path].tsx');
    expect(fileToRoutePath(routes, home)).toBe('/');
    expect(fileToRoutePath(routes, docCatchAll)).toBe('/docs/:path*');
    expect(layoutFilesFor(routes, docCatchAll, ['.tsx'])).toEqual([
      join(routes, '_layout.tsx'),
      join(app, '_layout.tsx')
    ]);
    expect(nearestSpecialFile(routes, docCatchAll, '_404', ['.tsx'])).toBe(join(app, '_404.tsx'));
    expect(nearestSpecialFile(routes, docCatchAll, '_error', ['.tsx'])).toBe(join(app, '_error.tsx'));

    const analyzed = analyzeRoutes(root, routes, ['.tsx']);
    expect(analyzed.map(route => [route.id, route.path])).toEqual([
      ['(app)/index', '/'],
      ['(app)/admin/[id]', '/admin/:id'],
      ['(app)/docs/[...path]', '/docs/:path*']
    ]);

    const code = makeManifestCode(root, routes, ['.tsx']);
    expect(code).toContain('id: "(app)/docs/[...path]"');
    expect(code).toContain('path: "/docs/:path*"');
    expect(code).toContain(`import("/${join('src/routes/_layout.tsx').replaceAll('\\', '/')}")`);
    expect(code).toContain(`import("/${join('src/routes/(app)/_layout.tsx').replaceAll('\\', '/')}")`);
    expect(code).toContain(`notFound: () => import("/${join('src/routes/(app)/_404.tsx').replaceAll('\\', '/')}")`);
    expect(code).toContain(`error: () => import("/${join('src/routes/(app)/_error.tsx').replaceAll('\\', '/')}")`);
    expect(code).not.toContain('_secrets');
    expect(code).not.toContain('_private');
  });

  it('reports static routes without client runtime', () => {
    const { root, routes } = createRouteFixture('blokd-static-report');
    writeFileSync(join(routes, 'about.tsx'), 'export const runtime = "none"; export default function About(){ return <h1>About</h1> }');

    const analyzed = analyzeRoutes(root, routes);
    expect(analyzed).toMatchObject([{ path: '/about', hasClient: false, runtime: 'none', islands: [], refs: [], declaredRuntime: 'none' }]);
    expect(createRouteRuntimeReport(analyzed)).toBe([
      'Blokd route runtime report',
      'Route   Client  Runtime  Islands',
      '/about  no      none     -'
    ].join('\n'));
  });

  it('reports island routes with client runtime metadata', () => {
    const { root, routes } = createRouteFixture('blokd-island-report');
    writeFileSync(join(routes, 'index.tsx'), `
      import { Island, on } from "blokd";
      export default function Home(){
        return <Island name="counter"><button onClick={on("/src/resumables/counter.ts#increment")}>Run</button></Island>;
      }
    `);

    const analyzed = analyzeRoutes(root, routes);
    expect(analyzed).toMatchObject([{ path: '/', hasClient: true, runtime: 'islands', islands: ['counter'], refs: ['/src/resumables/counter.ts#increment'] }]);
    expect(createRouteRuntimeReport(analyzed)).toBe([
      'Blokd route runtime report',
      'Route  Client  Runtime  Islands',
      '/      yes     islands  counter'
    ].join('\n'));
    expect(makeManifestCode(root, routes)).toContain('runtime: "islands"');
    expect(makeManifestCode(root, routes)).toContain('islands: ["counter"]');
    expect(makeManifestCode(root, routes)).toContain('resumables: ["/src/resumables/counter.ts#increment"]');
  });

  it('reports non-island client runtime for direct client markers', () => {
    const { root, routes } = createRouteFixture('blokd-client-report');
    writeFileSync(join(routes, 'dashboard.tsx'), 'export default function Dashboard(){ return <button onClick={() => undefined}>Run</button> }');

    const analyzed = analyzeRoutes(root, routes);
    expect(analyzed).toMatchObject([{ path: '/dashboard', hasClient: true, runtime: 'client', islands: [] }]);
  });

  it('reports browser-only components as client runtime', () => {
    const { root, routes } = createRouteFixture('blokd-client-component-report');
    writeFileSync(join(routes, 'widget.tsx'), `
      import { clientComponent } from "blokd/components";
      const Widget = clientComponent(() => <button type="button">Run</button>, { fallback: <span>Loading</span> });
      export default function Page(){ return <Widget /> }
    `);

    const analyzed = analyzeRoutes(root, routes);
    expect(analyzed).toMatchObject([{ path: '/widget', hasClient: true, runtime: 'client' }]);
  });

  it('allows runtime none on static routes and rejects it on interactive routes', () => {
    const pass = createRouteFixture('blokd-runtime-none-pass');
    writeFileSync(join(pass.routes, 'about.tsx'), 'export const runtime = "none"; export default function About(){ return <h1>About</h1> }');
    expect(() => makeManifestCode(pass.root, pass.routes)).not.toThrow();

    const fail = createRouteFixture('blokd-runtime-none-fail');
    writeFileSync(join(fail.routes, 'index.tsx'), `
      import { Island } from "blokd";
      export const runtime = "none";
      export default function Home(){ return <Island name="counter" /> }
    `);
    expect(() => makeManifestCode(fail.root, fail.routes)).toThrow(/declares runtime = "none" but includes client runtime markers/);
  });

  it('creates deterministic runtime reports', () => {
    const { root, routes } = createRouteFixture('blokd-deterministic-report');
    writeFileSync(join(routes, 'z.tsx'), 'import { Island } from "blokd"; export default function Z(){ return <Island name="zeta" /> }');
    writeFileSync(join(routes, 'a.tsx'), 'export default function A(){ return <h1>A</h1> }');

    const first = createRouteRuntimeReport(analyzeRoutes(root, routes));
    const second = createRouteRuntimeReport(analyzeRoutes(root, routes));
    expect(first).toBe(second);
    expect(first).toBe([
      'Blokd route runtime report',
      'Route  Client  Runtime  Islands',
      '/a     no      none     -',
      '/z     yes     islands  zeta'
    ].join('\n'));
  });

  it('emits the runtime report during Vite builds', async () => {
    const { root, routes } = createRouteFixture('blokd-build-report');
    writeFileSync(join(routes, 'index.tsx'), 'export default function Home(){ return <h1>Home</h1> }');
    const messages: string[] = [];
    const previousInfo = console.info;
    console.info = (message?: unknown) => { messages.push(String(message)); };
    try {
      const plugin = blokd();
      await plugin.configResolved?.({ root, command: 'build' });
      await plugin.load?.('\0virtual:blokd/routes');
    } finally {
      console.info = previousInfo;
    }
    expect(messages).toEqual([[
      'Blokd route runtime report',
      'Route  Client  Runtime  Islands',
      '/      no      none     -'
    ].join('\n')]);
  });

  it('parses client budget byte strings', () => {
    expect(parseByteSize('0kb')).toBe(0);
    expect(parseByteSize('3kb')).toBe(3072);
    expect(parseByteSize('1.5kb')).toBe(1536);
    expect(parseByteSize('2mb')).toBe(2 * 1024 * 1024);
    expect(() => parseByteSize('small')).toThrow(/Invalid Blokd budget size/);
  });

  it('measures client JS and CSS output bytes', () => {
    const { root } = createRouteFixture('blokd-client-output');
    const assets = join(root, 'dist/client/assets');
    mkdirSync(assets, { recursive: true });
    writeFileSync(join(assets, 'client.js'), '12345');
    writeFileSync(join(assets, 'client.css'), '123');
    writeFileSync(join(assets, 'logo.svg'), 'ignored');
    expect(measureClientOutputBytes(join(root, 'dist/client'))).toBe(8);
  });

  it('enforces global client budgets', () => {
    const { root, routes } = createRouteFixture('blokd-global-budget');
    writeFileSync(join(routes, 'index.tsx'), 'import { Island } from "blokd"; export default function Home(){ return <Island name="counter" /> }');
    const analyzed = analyzeRoutes(root, routes);

    expect(() => validateRouteBudgets(analyzed, { '/': '3kb' }, 2048)).not.toThrow();
    expect(() => validateRouteBudgets(analyzed, { '/': '1kb' }, 2048)).toThrow(/\/: client 2.0kb exceeds budget 1kb/);
  });

  it('enforces route-level client budgets before global budgets', () => {
    const { root, routes } = createRouteFixture('blokd-route-budget');
    writeFileSync(join(routes, 'index.tsx'), `
      import { Island } from "blokd";
      export const budget = { client: "1kb" };
      export default function Home(){ return <Island name="counter" /> }
    `);
    const analyzed = analyzeRoutes(root, routes);
    expect(analyzed[0]?.clientBudget).toBe('1kb');
    expect(() => validateRouteBudgets(analyzed, { '/': '10kb' }, 2048)).toThrow(/\/: client 2.0kb exceeds budget 1kb/);
  });

  it('makes 0kb catch accidental client behavior', () => {
    const { root, routes } = createRouteFixture('blokd-zero-budget');
    writeFileSync(join(routes, 'about.tsx'), 'export default function About(){ return <h1>About</h1> }');
    writeFileSync(join(routes, 'index.tsx'), 'import { Island } from "blokd"; export default function Home(){ return <Island name="counter" /> }');
    const analyzed = analyzeRoutes(root, routes);

    expect(() => validateRouteBudgets(analyzed, { '/about': '0kb' }, null)).not.toThrow();
    expect(() => validateRouteBudgets(analyzed, { '/': '0kb' }, null)).toThrow(/Blokd route client budget exceeded/);
  });

  it('keeps static routes at 0 client runtime when island files exist elsewhere', () => {
    const { root, routes } = createRouteFixture('blokd-static-with-island-file');
    const islands = join(root, 'src/islands');
    mkdirSync(islands, { recursive: true });
    writeFileSync(join(routes, 'about.tsx'), 'export const runtime = "none"; export const budget = { client: "0kb" }; export default function About(){ return <h1>About</h1> }');
    writeFileSync(join(islands, 'Counter.tsx'), 'import { island, signal } from "blokd"; export const Counter = island(() => { const [count] = signal(0); return <button>{count()}</button> })');

    const analyzed = analyzeRoutes(root, routes);
    expect(analyzed).toMatchObject([{ path: '/about', hasClient: false, runtime: 'none' }]);
    expect(() => validateRouteBudgets(analyzed, { '/about': '0kb' }, null)).not.toThrow();
  });

  it('generates an island registry for route-reachable island exports', () => {
    const { root, routes } = createRouteFixture('blokd-island-registry');
    const islands = join(root, 'src/islands');
    mkdirSync(islands, { recursive: true });
    writeFileSync(join(routes, 'index.tsx'), 'import { Counter } from "../islands/Counter"; export default function Page(){ return <Counter /> }');
    writeFileSync(join(islands, 'Counter.tsx'), 'import { island, signal } from "blokd"; export const Counter = island(() => { const [count] = signal(0); return <button>{count()}</button> })');
    writeFileSync(join(islands, 'Unused.tsx'), 'import { island } from "blokd"; export const Unused = island(() => <button>Unused</button>)');

    const code = makeIslandRegistryCode(root, routes);
    expect(code).toContain('import { startIslands } from "blokd/client";');
    expect(code).toContain('import { Counter as island0 } from "/src/islands/Counter.tsx";');
    expect(code).toContain('export const islands = [island0];');
    expect(code).toContain('export const dispose = startIslands(islands);');
    expect(code).not.toContain('Unused');
  });

  it('adds route-local client entries for compiler-assisted island routes', async () => {
    const { root, routes } = createRouteFixture('blokd-route-client-entry');
    const islands = join(root, 'src/islands');
    mkdirSync(islands, { recursive: true });
    writeFileSync(join(routes, 'index.tsx'), 'import { Counter } from "../islands/Counter"; export default function Page(){ return <Counter /> }');
    writeFileSync(join(routes, 'about.tsx'), 'export default function About(){ return <h1>About</h1> }');
    writeFileSync(join(islands, 'Counter.tsx'), 'import { island, signal } from "blokd"; export const Counter = island(() => { const [count] = signal(0); return <button>{count()}</button> })');

    const plugin = blokd({ routeClientEntryBase: '/static/' });
    await plugin.configResolved?.({ root, command: 'build' });
    const code = await plugin.load?.('\0virtual:blokd/routes');

    expect(String(code)).toMatch(/id: "index"[\s\S]*clientEntry: "\/static\/blokd-route-index\.js"/);
    expect(String(code)).toMatch(/id: "about"[\s\S]*hasClient: false/);
    expect(String(code)).not.toMatch(/id: "about"[\s\S]*clientEntry:/);
  });

  it('adds route-local island virtual modules to client build inputs', () => {
    const { root, routes } = createRouteFixture('blokd-route-client-input');
    const islands = join(root, 'src/islands');
    mkdirSync(islands, { recursive: true });
    writeFileSync(join(routes, 'index.tsx'), 'import { Counter } from "../islands/Counter"; export default function Page(){ return <Counter /> }');
    writeFileSync(join(islands, 'Counter.tsx'), 'import { island } from "blokd"; export const Counter = island(() => <button>Count</button>)');

    const plugin = blokd();
    const config = plugin.config?.({
      root,
      build: {
        rollupOptions: {
          input: { client: 'src/client.ts' }
        }
      }
    }, { command: 'build', mode: 'production' });

    expect(config.build.rollupOptions.input).toMatchObject({
      client: 'src/client.ts',
      'blokd-route-index': 'virtual:blokd/islands/blokd-route-index'
    });
  });

  it('injects the generated island registry into the configured client entry', async () => {
    const { root } = createRouteFixture('blokd-island-entry');
    const plugin = blokd({ clientEntry: '/src/client.ts' });
    await plugin.configResolved?.({ root, command: 'build' });
    const result = await plugin.transform?.('console.log("client");', join(root, 'src/client.ts'));
    expect(typeof result).toBe('object');
    expect((result as { code: string }).code).toContain('import "virtual:blokd/islands";');
  });

  it('fails clearly for server-only imports inside dedicated island files', async () => {
    const { root } = createRouteFixture('blokd-island-server-import');
    const file = join(root, 'src/islands/Counter.tsx');
    const plugin = blokd();
    await plugin.configResolved?.({ root, command: 'build' });
    await expect(plugin.transform?.('import { readFileSync } from "node:fs"; import { island } from "blokd"; export const Counter = island(() => <button />);', file)).rejects.toThrow(/imports server-only module "node:fs"/);
  });

  it('fails Vite build loads when configured budgets are exceeded', async () => {
    const { root, routes } = createRouteFixture('blokd-plugin-budget');
    writeFileSync(join(routes, 'index.tsx'), 'import { Island } from "blokd"; export default function Home(){ return <Island name="counter" /> }');
    const messages: string[] = [];
    const previousInfo = console.info;
    console.info = (message?: unknown) => { messages.push(String(message)); };
    try {
      const plugin = blokd({ budgets: { '/': '0kb' } });
      await plugin.configResolved?.({ root, command: 'build' });
      expect(() => plugin.load?.('\0virtual:blokd/routes')).toThrow(/Blokd route client budget exceeded/);
    } finally {
      console.info = previousInfo;
    }
    expect(messages[0]).toContain('Blokd route runtime report');
  });
});
