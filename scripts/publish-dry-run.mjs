import { mkdtempSync, rmSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const pkgDir = join(root, 'packages/blokd');
const tmp = mkdtempSync(join(tmpdir(), 'blokd-pack-'));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  run('pnpm', ['--filter', 'blokd', 'build'], { cwd: root });
  run('pnpm', ['pack', '--pack-destination', tmp], { cwd: pkgDir });
  const tarball = readdirSync(tmp).find(file => file.endsWith('.tgz'));
  if (!tarball) throw new Error('pnpm pack did not create a tarball');

  const app = mkdtempSync(join(tmpdir(), 'blokd-consumer-'));
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'blokd-consumer-test', private: true, type: 'module' }, null, 2));
  mkdirSync(join(app, 'src/routes'), { recursive: true });
  writeFileSync(join(app, 'src/env.d.ts'), `
declare module 'virtual:blokd/routes' {
  import type { RouteEntry } from 'blokd/hono';
  const routes: RouteEntry[];
  export default routes;
}
`);
  writeFileSync(join(app, 'src/client.ts'), `
import { registerResumable, startResumability } from 'blokd/client';

registerResumable('local#noop', () => undefined);
startResumability({ allowRef: ref => ref === 'local#noop' });
`);
  writeFileSync(join(app, 'src/server.ts'), `
import { Hono } from 'hono';
import { createPages } from 'blokd/hono';
import routes from 'virtual:blokd/routes';

const app = new Hono();
app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));

export default app;
`);
  writeFileSync(join(app, 'src/routes/index.tsx'), `
import { For, Island, Show, memo, resumable, signal } from 'blokd';

export const meta = () => ({ title: 'External Blokd App' });

export default function Home() {
  const [count] = signal(1);
  const doubled = memo(() => count() * 2);
  return (
    <main>
      <h1>External Blokd App</h1>
      <Show when={doubled() > 1}><p>ready</p></Show>
      <ul><For each={['one', 'two']}>{item => <li>{item}</li>}</For></ul>
      <Island name="demo" state={{ count: count() }}>
        <button onClick={resumable('local#noop')}>Click</button>
      </Island>
    </main>
  );
}
`);
  writeFileSync(join(app, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
      jsx: 'preserve',
      jsxImportSource: 'blokd',
      types: ['node', 'vite/client']
    },
    include: ['src', 'vite.config.ts', 'vite.client.config.ts']
  }, null, 2));
  writeFileSync(join(app, 'vite.config.ts'), `
import { defineConfig } from 'vite';
import { blokd } from 'blokd/vite';

export default defineConfig({
  plugins: [blokd()],
  build: {
    outDir: 'dist/server',
    ssr: 'src/server.ts',
    rollupOptions: {
      output: { entryFileNames: 'entry-server.js' }
    }
  },
  ssr: {
    noExternal: ['blokd']
  }
});
`);
  writeFileSync(join(app, 'vite.client.config.ts'), `
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: 'src/client.ts',
      output: { entryFileNames: 'assets/client.js' }
    }
  }
});
`);
  run('pnpm', ['add', join(tmp, tarball), 'hono', 'vite', 'typescript', '@types/node'], { cwd: app });
  run('node', ['--input-type=module', '-e', `
    import { signal } from 'blokd';
    import { redirect } from 'blokd/server';
    import { createPages } from 'blokd/hono';
    import { blokd } from 'blokd/vite';
    import { startResumability } from 'blokd/client';
    if (typeof signal !== 'function' || typeof redirect !== 'function' || typeof createPages !== 'function' || typeof blokd !== 'function' || typeof startResumability !== 'function') throw new Error('blokd exports did not resolve');
  `], { cwd: app });
  run('pnpm', ['exec', 'tsc', '--noEmit'], { cwd: app });
  run('pnpm', ['exec', 'vite', 'build', '--config', 'vite.client.config.ts'], { cwd: app });
  run('pnpm', ['exec', 'vite', 'build', '--config', 'vite.config.ts'], { cwd: app });
  console.log(`[blokd dry-run] packed, installed, typechecked, and built ${tarball} in ${app}`);
} finally {
  if (!process.env.BLOKD_KEEP_DRY_RUN && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
}
