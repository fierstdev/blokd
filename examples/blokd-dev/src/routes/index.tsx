import { For } from 'blokd';
import { docs, docsByCategory } from '../content/docs';
import { site } from '../components/SiteShell';

const pillars = [
  {
    tone: 'feature-panel-secondary',
    title: 'Server-first',
    body: 'Render pages through Hono and Web APIs before deciding whether the browser needs framework code.'
  },
  {
    tone: 'feature-panel-accent',
    title: 'HTML-first',
    body: 'Links, forms, loaders, metadata, and error boundaries work as documents before enhancement.'
  },
  {
    tone: 'feature-panel-warning',
    title: 'Event-resumable',
    body: 'Small islands resume specific handlers on demand instead of hydrating an entire application shell.'
  }
] as const;

const capabilities = [
  {
    tag: 'Server',
    title: 'Hono-native routing',
    body: 'Mount pages into a normal Hono app and keep Request, Response, FormData, and middleware visible.'
  },
  {
    tag: 'Runtime',
    title: 'HTML-first by default',
    body: 'Static routes ship document HTML and CSS. Client JavaScript is opt-in through islands and route analysis.'
  },
  {
    tag: 'Forms',
    title: 'Native actions',
    body: 'Post FormData back to the route that rendered it, then return redirects, validation state, or normal HTML.'
  },
  {
    tag: 'UI',
    title: 'Scoped islands',
    body: 'Attach resumable handlers where interaction belongs without turning every page into a hydrated app.'
  },
  {
    tag: 'Build',
    title: 'File routes and metadata',
    body: 'Let Vite discover routes, loaders, layouts, headers, and metadata while keeping pages plain JSX modules.'
  },
  {
    tag: 'Edge',
    title: 'Worker-ready output',
    body: 'Build a single Worker SSR entry plus static assets that Wrangler can validate before deployment.'
  }
] as const;

const workflow = [
  {
    label: 'Author',
    body: 'Write JSX routes, loaders, actions, and metadata in files that map to URLs.'
  },
  {
    label: 'Analyze',
    body: 'Blokd marks only routes with islands or resumable handlers for client assets.'
  },
  {
    label: 'Ship',
    body: 'Vite emits CSS, optional client chunks, and a Hono Worker entry for Cloudflare.'
  }
] as const;

const releaseSignals = [
  {
    value: '0 KB',
    label: 'client JS on static docs',
    tone: 'text-primary'
  },
  {
    value: 'Hono',
    label: 'server contract',
    tone: 'text-secondary'
  },
  {
    value: 'Workers',
    label: 'first deployment target',
    tone: 'text-accent'
  }
] as const;

const docsPreview = docs.slice(0, 4);

export const meta = () => ({
  title: 'Blokd - Hono-native HTML-first framework',
  description: site.description
});

export default function HomePage() {
  const docGroups = docsByCategory();
  return (
    <>
      <section class="hero-lattice overflow-hidden">
        <div class="mx-auto grid max-w-7xl min-w-0 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-28">
          <div class="min-w-0 max-w-3xl self-center">
            <div class="mb-5 flex flex-wrap gap-2">
              <span class="badge badge-primary">0.1.0-beta.0</span>
              <span class="badge badge-secondary badge-outline">Cloudflare-ready</span>
              <span class="badge badge-accent badge-outline">Hono-native</span>
            </div>
            <p class="section-kicker">HTML-first framework</p>
            <h1 class="mt-4 text-7xl font-black leading-none tracking-normal text-base-content sm:text-8xl">Blokd</h1>
            <p class="mt-6 max-w-2xl text-xl leading-9 text-base-content/75">
              A Hono-native framework for server-rendered apps that should ship HTML first, native forms first, and client JavaScript only where interaction proves it belongs.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a class="btn btn-primary" href="/docs/getting-started">Start building</a>
              <a class="btn btn-outline" href="/docs">Read docs</a>
              <a class="btn btn-ghost" href="/deploy">Deploy guide</a>
            </div>
            <div class="mt-6">
              <div class="command-pill">
                <span class="rounded bg-neutral px-2 py-1 text-neutral-content">$</span>
                <code class="truncate">pnpm add blokd hono</code>
              </div>
            </div>
            <div class="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
              <For each={releaseSignals}>
                {item => (
                  <div class="metric-tile p-4">
                    <div class={`text-2xl font-black ${item.tone}`}>{item.value}</div>
                    <div class="mt-1 text-sm leading-5 text-base-content/60">{item.label}</div>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="product-stage overflow-hidden p-3 sm:p-5">
            <div class="mockup-browser overflow-hidden border border-base-300 bg-base-200 shadow-sm">
              <div class="mockup-browser-toolbar">
                <div class="input input-sm border border-base-300 bg-base-100">blokd.dev/docs/getting-started</div>
              </div>
              <div class="bg-base-100 p-4">
                <div class="grid gap-4 lg:grid-cols-[1fr_13rem]">
                  <div class="code-surface p-3">
                    <div class="mockup-code bg-neutral text-sm text-neutral-content">
                      <pre data-prefix="$"><code>pnpm add blokd hono</code></pre>
                      <pre data-prefix="1"><code>{'app.route("/", createPages({ routes }))'}</code></pre>
                      <pre data-prefix="2"><code>{'export const action = async ctx => {'}</code></pre>
                      <pre data-prefix="3"><code>{'  const form = await ctx.request.formData()'}</code></pre>
                      <pre data-prefix="4"><code>{'  return { ok: form.has("email") }'}</code></pre>
                      <pre data-prefix="5"><code>{'}'}</code></pre>
                    </div>
                  </div>
                  <div class="grid gap-3">
                    <div class="metric-tile p-4">
                      <div class="text-xs font-bold uppercase tracking-normal text-base-content/50">Route</div>
                      <div class="mt-2 text-lg font-black">SSR</div>
                      <div class="mt-1 text-sm text-base-content/60">HTML plus CSS</div>
                    </div>
                    <div class="metric-tile p-4">
                      <div class="text-xs font-bold uppercase tracking-normal text-base-content/50">Scoped UI</div>
                      <div class="mt-2 text-lg font-black text-accent">Opt-in</div>
                      <div class="mt-1 text-sm text-base-content/60">Client chunk only when used</div>
                    </div>
                  </div>
                </div>
                <div class="mt-4 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-box border border-base-300 bg-base-200 p-3">
                    <div class="text-xs text-base-content/50">Framework</div>
                    <div class="mt-1 font-bold">JSX SSR</div>
                  </div>
                  <div class="rounded-box border border-base-300 bg-base-200 p-3">
                    <div class="text-xs text-base-content/50">Forms</div>
                    <div class="mt-1 font-bold">Web APIs</div>
                  </div>
                  <div class="rounded-box border border-base-300 bg-base-200 p-3">
                    <div class="text-xs text-base-content/50">Deploy</div>
                    <div class="mt-1 font-bold">Worker</div>
                  </div>
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
              <p class="section-kicker">What is Blokd?</p>
              <h2 class="mt-3 max-w-2xl text-5xl font-black leading-tight tracking-normal">A small framework surface for Hono apps.</h2>
            </div>
            <p class="max-w-2xl text-lg leading-8 text-base-content/70">
              Blokd is for teams that like the Web Platform but still want framework-level routing, SSR, metadata, native actions, layouts, and opt-in islands.
            </p>
          </div>
          <div class="mt-10 grid gap-4 md:grid-cols-3">
            <For each={pillars}>
              {item => (
                <article class={`feature-panel ${item.tone} p-6`}>
                  <h3 class="text-2xl font-black tracking-normal">{item.title}</h3>
                  <p class="mt-4 leading-7 text-base-content/70">{item.body}</p>
                </article>
              )}
            </For>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="mb-9 max-w-3xl">
          <p class="section-kicker">Framework primitives</p>
          <h2 class="mt-3 text-4xl font-black tracking-normal">Everything the beta is built to do well.</h2>
          <p class="mt-4 text-base leading-7 text-base-content/70">
            The public beta should feel complete for SSR pages, native forms, docs sites, local-service sites, and focused islands without claiming to be a full-stack platform.
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <For each={capabilities}>
            {item => (
              <article class="card card-border bg-base-100 shadow-sm transition-transform hover:-translate-y-0.5">
                <div class="card-body gap-4">
                  <span class="badge badge-outline w-fit">{item.tag}</span>
                  <div>
                    <h3 class="card-title text-xl">{item.title}</h3>
                    <p class="mt-2 leading-7 text-base-content/70">{item.body}</p>
                  </div>
                </div>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="bg-neutral text-neutral-content">
        <div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p class="section-kicker text-secondary-content/80">Release path</p>
            <h2 class="mt-3 text-4xl font-black tracking-normal">Built around a clear Worker deploy.</h2>
            <p class="mt-4 max-w-xl leading-7 text-neutral-content/70">
              This site is also the example app: Tailwind and daisyUI compile into static assets, the SSR entry runs on Hono, and Wrangler validates the Worker before deployment.
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <a class="btn btn-secondary" href="/deploy">Cloudflare guide</a>
              <a class="btn btn-outline border-neutral-content/30 text-neutral-content hover:bg-neutral-content hover:text-neutral" href="/docs/beta-checklist">Beta checklist</a>
            </div>
          </div>
          <div>
            <ul class="steps steps-vertical w-full lg:steps-horizontal">
              <For each={workflow}>
                {step => (
                  <li class="step step-secondary">
                    <span class="block text-left">
                      <span class="block font-bold">{step.label}</span>
                      <span class="mt-1 block max-w-xs text-sm leading-6 text-neutral-content/60">{step.body}</span>
                    </span>
                  </li>
                )}
              </For>
            </ul>
            <div class="mt-8 code-surface p-3">
              <div class="mockup-code bg-neutral text-neutral-content">
                <pre data-prefix="$"><code>pnpm build:site</code></pre>
                <pre data-prefix="$"><code>pnpm smoke:site</code></pre>
                <pre data-prefix="$"><code>pnpm --filter blokd-dev-site deploy:dry-run</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div class="max-w-2xl">
            <p class="section-kicker">Documentation</p>
            <h2 class="mt-3 text-4xl font-black tracking-normal">Reference docs, built with the framework.</h2>
            <p class="mt-4 leading-7 text-base-content/70">The public documentation is the canonical Blokd example: SSR pages, Tailwind and daisyUI styling, static docs with no client script, and a Cloudflare Worker deployment path.</p>
          </div>
          <a class="btn btn-outline" href="/docs">All docs</a>
        </div>
        <div class="grid gap-4 lg:grid-cols-3">
          <For each={docGroups}>
            {group => (
              <a class="docs-tile p-5 transition-transform hover:-translate-y-0.5" href="/docs">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-xl font-black tracking-normal">{group.category}</h3>
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
        <div class="mt-8 grid gap-4 md:grid-cols-2">
          <For each={docsPreview}>
            {doc => (
              <a class="doc-card card card-border bg-base-100 shadow-sm transition-colors hover:bg-base-200" href={`/docs/${doc.slug}`}>
                <div class="card-body">
                  <div class="flex items-center justify-between gap-3">
                    <h3 class="card-title text-lg">{doc.title}</h3>
                    <span class="badge badge-ghost">{doc.category}</span>
                  </div>
                  <p class="leading-7 text-base-content/70">{doc.summary}</p>
                </div>
              </a>
            )}
          </For>
        </div>
      </section>
    </>
  );
}
