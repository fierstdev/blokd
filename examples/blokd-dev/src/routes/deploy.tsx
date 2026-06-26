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
          <h1 class="mt-4 max-w-3xl text-5xl font-black leading-tight tracking-normal">Deploy Blokd as an SSR Worker.</h1>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-base-content/75">
            The official site is designed to be the deployment example: static CSS and assets through Workers static assets, document rendering through Blokd, and 404 boundaries owned by the framework.
          </p>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <div>
          <p class="section-kicker">Build pipeline</p>
          <h2 class="mt-3 text-3xl font-black tracking-normal">One Worker entry, static assets, dry-run validation.</h2>
          <div class="mt-8 grid gap-4">
            <For each={steps}>
              {(step, index) => (
                <article class="alert alert-soft border border-base-300 bg-base-100 shadow-sm">
                  <span class="badge badge-primary">{String(index() + 1)}</span>
                  <div>
                    <h3 class="font-bold">{step.title}</h3>
                    <p class="text-sm leading-6 opacity-75">{step.body}</p>
                  </div>
                </article>
              )}
            </For>
          </div>
        </div>

        <div class="product-stage p-3 sm:p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="section-kicker">Commands</p>
              <h2 class="mt-1 text-2xl font-black tracking-normal">Workers deploy path</h2>
            </div>
            <span class="badge badge-accent badge-outline">wrangler</span>
          </div>
          <div class="code-surface p-3">
            <div class="mockup-code bg-neutral text-neutral-content">
              <For each={commands}>
                {command => <pre data-prefix="$"><code>{command}</code></pre>}
              </For>
            </div>
          </div>
          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="metric-tile p-4">
              <div class="text-xs font-bold uppercase tracking-normal text-base-content/50">Assets</div>
              <div class="mt-2 font-black">dist/client</div>
              <p class="mt-1 text-sm leading-6 text-base-content/60">CSS, favicon, and future client chunks.</p>
            </div>
            <div class="metric-tile p-4">
              <div class="text-xs font-bold uppercase tracking-normal text-base-content/50">Worker</div>
              <div class="mt-2 font-black">entry-worker.js</div>
              <p class="mt-1 text-sm leading-6 text-base-content/60">Hono SSR entry with the route manifest.</p>
            </div>
          </div>
          <div role="alert" class="alert alert-warning alert-soft mt-5 border border-warning/25">
            <span>Set the real blokd.dev route in Wrangler only after the Cloudflare zone is ready.</span>
          </div>
        </div>
      </section>
    </>
  );
}
