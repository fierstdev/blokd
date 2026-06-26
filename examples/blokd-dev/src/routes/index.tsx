import { For } from 'blokd';
import { docsByCategory } from '../content/docs';
import { site, Wordmark } from '../components/SiteShell';

const principles = [
  {
    title: 'HTML first',
    body: 'Routes render documents that work before enhancement. Links, forms, redirects, metadata, and errors stay normal browser behavior.'
  },
  {
    title: 'Web APIs underneath',
    body: 'Blokd is built from the platform blocks already in the runtime: Request, Response, FormData, DOM events, URLs, headers, and streams.'
  },
  {
    title: 'Hono where it fits',
    body: 'Server routing stays a normal Hono app, so middleware, context variables, API routes, and deployment adapters remain visible.'
  }
] as const;

const refusals = [
  'No React runtime',
  'No VDOM',
  'No synthetic event system',
  'No custom server abstraction',
  'No custom form abstraction'
] as const;

const commands = [
  'pnpm create blokd@beta my-app',
  'cd my-app',
  'pnpm dev'
] as const;

export const meta = () => ({
  title: 'Blokd - A thin ergonomic layer over the Web Platform',
  description: site.description
});

export default function HomePage() {
  const docGroups = docsByCategory();
  return (
    <>
      <section class="hero-lattice">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div class="block-panel block-panel-strong grid overflow-hidden lg:grid-cols-[1fr_0.92fr]">
            <div class="border-b border-base-300 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
              <div class="flex flex-wrap items-center gap-3">
                <Wordmark />
                <span class="badge badge-primary">0.1.0-beta.0</span>
                <span class="badge badge-outline">Cloudflare-ready</span>
              </div>
              <p class="section-kicker mt-10">Web Platform building blocks</p>
              <h1 class="mt-4 max-w-3xl text-5xl font-black leading-none text-base-content sm:text-6xl lg:text-7xl">
                A thin ergonomic layer over the Web Platform.
              </h1>
              <p class="muted-copy mt-6 max-w-2xl text-lg leading-8">
                Blokd is named for the browser and Web API building blocks it stands on. It gives Hono apps JSX SSR, file routes, loaders, native form actions, metadata, and resumable islands only where interaction belongs.
              </p>
              <div class="mt-8 flex flex-wrap gap-3">
                <a class="btn btn-primary" href="/docs/getting-started">Get started</a>
                <a class="btn btn-outline" href="/docs">Read docs</a>
                <a class="btn btn-ghost" href="/deploy">Deploy on Workers</a>
              </div>
              <div class="mt-8">
                <div class="command-pill">
                  <span class="command-prompt">$</span>
                  <code class="truncate">pnpm add blokd hono</code>
                </div>
              </div>
            </div>

            <div class="bg-neutral p-4 sm:p-6 lg:p-8">
              <div class="code-surface">
                <div class="code-titlebar flex items-center justify-between gap-3 px-4 py-3 text-xs">
                  <span>src/routes/reservations.tsx</span>
                  <span>server route</span>
                </div>
                <div class="mockup-code text-sm">
                  <pre data-prefix="1"><code>{'export const loader = async ctx => {'}</code></pre>
                  <pre data-prefix="2"><code>{'  const rooms = await ctx.var.db.rooms.list()'}</code></pre>
                  <pre data-prefix="3"><code>{'  return { rooms }'}</code></pre>
                  <pre data-prefix="4"><code>{'}'}</code></pre>
                  <pre data-prefix="5"><code>{''}</code></pre>
                  <pre data-prefix="6"><code>{'export const action = async ctx => {'}</code></pre>
                  <pre data-prefix="7"><code>{'  const form = await ctx.req.formData()'}</code></pre>
                  <pre data-prefix="8"><code>{'  await ctx.var.db.rooms.reserve(form)'}</code></pre>
                  <pre data-prefix="9"><code>{'  return ctx.redirect("/reservations")'}</code></pre>
                  <pre data-prefix="10"><code>{'}'}</code></pre>
                  <pre data-prefix="11"><code>{''}</code></pre>
                  <pre data-prefix="12"><code>{'export default function Reservations({ data }) {'}</code></pre>
                  <pre data-prefix="13"><code>{'  return <form method="post">...</form>'}</code></pre>
                  <pre data-prefix="14"><code>{'}'}</code></pre>
                </div>
              </div>
              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <div class="metric-tile p-4">
                  <p class="label-caps">Static docs</p>
                  <p class="mt-2 text-2xl font-black text-primary">0 KB</p>
                  <p class="dim-copy mt-1 text-sm">client script</p>
                </div>
                <div class="metric-tile p-4">
                  <p class="label-caps">Server</p>
                  <p class="mt-2 text-2xl font-black">Hono</p>
                  <p class="dim-copy mt-1 text-sm">native context</p>
                </div>
                <div class="metric-tile p-4">
                  <p class="label-caps">Deploy</p>
                  <p class="mt-2 text-2xl font-black">Workers</p>
                  <p class="dim-copy mt-1 text-sm">dry-run ready</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section-band">
        <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p class="section-kicker">Runtime discipline</p>
              <h2 class="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">Most apps do not need a large client runtime.</h2>
            </div>
            <p class="muted-copy max-w-2xl text-lg leading-8">
              Blokd starts with the browser as the runtime, documents as the default output, server data as plain request work, and form posts as native Web APIs. JavaScript becomes a route-level consequence of specific interactive code rather than a tax every page pays.
            </p>
          </div>
          <div class="mt-10 grid gap-4 md:grid-cols-3">
            <For each={principles}>
              {item => (
                <article class="feature-panel p-6">
                  <h3 class="text-2xl font-black">{item.title}</h3>
                  <p class="muted-copy mt-4 leading-7">{item.body}</p>
                </article>
              )}
            </For>
          </div>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div class="block-panel p-6 sm:p-8">
          <p class="section-kicker">Blocks, not replacements</p>
          <h2 class="mt-3 max-w-2xl text-4xl font-black leading-tight">Small because it builds directly on the platform.</h2>
          <p class="muted-copy mt-4 max-w-2xl leading-7">
            Blokd is intentionally narrow. It gives you framework conventions for pages, data, actions, metadata, and enhancement while keeping the browser, Web APIs, and Hono primitives recognizable.
          </p>
          <div class="mt-8 grid gap-3 sm:grid-cols-2">
            <For each={refusals}>
              {item => (
                <div class="flex items-center gap-3 border border-base-300 bg-base-100 p-3">
                  <span class="h-2.5 w-2.5 bg-primary" aria-hidden="true"></span>
                  <span class="font-semibold">{item}</span>
                </div>
              )}
            </For>
          </div>
          <p class="mt-8 border-l-2 border-primary pl-4 text-xl font-black">
            DOM is DOM. Forms are forms. Requests are Requests. Hono is Hono.
          </p>
        </div>

        <div class="block-panel block-panel-strong p-6 sm:p-8">
          <p class="section-kicker">Five minute start</p>
          <h2 class="mt-3 text-4xl font-black leading-tight">Build a Blokd app in five minutes.</h2>
          <p class="muted-copy mt-4 leading-7">
            Create a project, keep routes as JSX modules, and deploy the same Hono app to Cloudflare Workers when the beta target is ready.
          </p>
          <div class="mt-7 code-surface">
            <div class="mockup-code text-sm">
              <For each={commands}>
                {command => <pre data-prefix="$"><code>{command}</code></pre>}
              </For>
            </div>
          </div>
          <div class="mt-7 flex flex-wrap gap-3">
            <a class="btn btn-primary" href="/docs/getting-started">Start tutorial</a>
            <a class="btn btn-outline" href="/docs/cloudflare-workers">Worker deploy</a>
          </div>
        </div>
      </section>

      <section class="section-band">
        <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div class="max-w-2xl">
              <p class="section-kicker">Documentation</p>
              <h2 class="mt-3 text-4xl font-black leading-tight">The official docs are the example app.</h2>
              <p class="muted-copy mt-4 leading-7">
                This website runs as a Blokd site with Tailwind, daisyUI, static docs, SSR routes, and a Cloudflare Workers deployment path.
              </p>
            </div>
            <a class="btn btn-outline" href="/docs">All docs</a>
          </div>
          <div class="grid gap-4 lg:grid-cols-3">
            <For each={docGroups}>
              {group => (
                <a class="docs-tile block-hover block p-5" href="/docs">
                  <div class="flex items-center justify-between gap-3">
                    <h3 class="text-xl font-black">{group.category}</h3>
                    <span class="badge badge-primary badge-outline">{group.docs.length}</span>
                  </div>
                  <div class="mt-5 grid gap-2">
                    <For each={group.docs.slice(0, 3)}>
                      {doc => <span class="text-sm font-semibold text-base-content/70">{doc.title}</span>}
                    </For>
                  </div>
                </a>
              )}
            </For>
          </div>
        </div>
      </section>
    </>
  );
}
