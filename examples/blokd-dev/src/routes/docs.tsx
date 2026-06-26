import { For } from 'blokd';
import { docs, docsByCategory } from '../content/docs';
import { DocsNav } from '../components/SiteShell';

export const meta = () => ({
  title: 'Docs | Blokd',
  description: 'Blokd documentation for getting started, islands, Cloudflare Workers, and beta validation.'
});

export default function DocsIndexPage() {
  const groups = docsByCategory();
  return (
    <>
      <section class="section-band">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <span class="badge badge-primary">Documentation</span>
          <h1 class="mt-4 max-w-4xl text-5xl font-black leading-tight tracking-normal">Build production-minded HTML-first apps with Blokd.</h1>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-base-content/75">
            A complete public beta guide to routing, loaders, native form actions, metadata, Hono integration, resumable islands, Cloudflare Workers, security, limitations, and release validation.
          </p>
          <div class="mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
            <div class="metric-tile p-4">
              <div class="text-3xl font-black text-primary">{docs.length}</div>
              <p class="mt-1 text-sm text-base-content/60">docs pages</p>
            </div>
            <div class="metric-tile p-4">
              <div class="text-3xl font-black text-secondary">0 KB</div>
              <p class="mt-1 text-sm text-base-content/60">client JS on static docs</p>
            </div>
            <div class="metric-tile p-4">
              <div class="text-3xl font-black text-accent">Workers</div>
              <p class="mt-1 text-sm text-base-content/60">reference deployment</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[17rem_1fr] lg:px-8">
        <DocsNav />
        <div>
          <div class="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p class="section-kicker">Guides</p>
              <h2 class="mt-2 text-3xl font-black tracking-normal">Start narrow, then go deep.</h2>
            </div>
            <a class="btn btn-outline btn-sm" href="/deploy">Deploy guide</a>
          </div>
          <div class="grid gap-8">
            <For each={groups}>
              {group => (
                <section>
                  <div class="mb-3 flex items-center gap-3">
                    <h3 class="text-xl font-black tracking-normal">{group.category}</h3>
                    <div class="h-px flex-1 bg-base-300"></div>
                  </div>
                  <div class="grid gap-4 md:grid-cols-2">
                    <For each={group.docs}>
                      {doc => (
                        <a class="doc-card card card-border bg-base-100 shadow-sm transition-colors hover:bg-base-200" href={`/docs/${doc.slug}`}>
                          <div class="card-body">
                            <div class="flex items-center justify-between gap-3">
                              <h4 class="card-title text-lg">{doc.title}</h4>
                              <span class="badge badge-ghost">{doc.category}</span>
                            </div>
                            <p class="leading-7 text-base-content/70">{doc.summary}</p>
                          </div>
                        </a>
                      )}
                    </For>
                  </div>
                </section>
              )}
            </For>
          </div>
        </div>
      </section>
    </>
  );
}
