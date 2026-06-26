import { For } from 'blokd';

const steps = [
  {
    title: 'Build client assets',
    body: 'Tailwind and daisyUI compile to a stylesheet in dist/client/assets/client.css.'
  },
  {
    title: 'Build the Worker',
    body: 'Vite bundles the Hono SSR entry to dist/worker/entry-worker.js with the Blokd route manifest.'
  },
  {
    title: 'Dry run with Wrangler',
    body: 'Wrangler validates the Worker and static assets before a real deploy.'
  }
] as const;

const commands = [
  'pnpm build:site',
  'pnpm smoke:site',
  'pnpm --filter blokd-dev-site deploy:dry-run',
  'pnpm --filter blokd-dev-site deploy'
] as const;

export const meta = () => ({
  title: 'Deploy Blokd to Cloudflare Workers',
  description: 'Cloudflare Workers deployment pattern for the blokd.dev example site.'
});

export default function DeployPage() {
  return (
    <>
      <section class="section-band">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <span class="badge badge-secondary">Cloudflare Workers</span>
          <h1 class="mt-4 max-w-3xl text-5xl font-black leading-tight sm:text-6xl">Deploy Blokd as an SSR Worker.</h1>
          <p class="muted-copy mt-4 max-w-3xl text-lg leading-8">
            The official site is designed to be the deployment example: static CSS and assets through Workers static assets, document rendering through Blokd, and 404 boundaries owned by the framework.
          </p>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <p class="section-kicker">Build pipeline</p>
          <h2 class="mt-3 text-3xl font-black">One Worker entry, static assets, dry-run validation.</h2>
          <div class="mt-8 grid gap-4">
            <For each={steps}>
              {(step, index) => (
                <article class="block-panel flex items-start gap-4 p-5">
                  <span class="badge badge-primary">{String(index() + 1)}</span>
                  <div>
                    <h3 class="font-bold">{step.title}</h3>
                    <p class="muted-copy mt-1 text-sm leading-6">{step.body}</p>
                  </div>
                </article>
              )}
            </For>
          </div>
        </div>

        <div class="block-panel block-panel-strong p-5 sm:p-6">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="section-kicker">Commands</p>
              <h2 class="mt-1 text-2xl font-black">Workers deploy path</h2>
            </div>
            <span class="badge badge-accent badge-outline">wrangler</span>
          </div>
          <div class="code-surface">
            <div class="mockup-code">
              <For each={commands}>
                {command => <pre data-prefix="$"><code>{command}</code></pre>}
              </For>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="metric-tile p-4">
              <div class="label-caps">Assets</div>
              <div class="mt-2 font-black">dist/client</div>
              <p class="dim-copy mt-1 text-sm leading-6">CSS, favicon, and future client chunks.</p>
            </div>
            <div class="metric-tile p-4">
              <div class="label-caps">Worker</div>
              <div class="mt-2 font-black">entry-worker.js</div>
              <p class="dim-copy mt-1 text-sm leading-6">Hono SSR entry with the route manifest.</p>
            </div>
          </div>
          <div role="alert" class="alert alert-warning alert-soft mt-5 border border-warning/30 bg-base-100">
            <span>Set the real blokd.dev route in Wrangler only after the Cloudflare zone is ready.</span>
          </div>
        </div>
      </section>
    </>
  );
}
