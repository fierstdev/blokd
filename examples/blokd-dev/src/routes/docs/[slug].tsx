import { For } from 'blokd';
import { notFound } from 'blokd/server';
import { DocsNav } from '../../components/SiteShell';
import { getDoc, type DocPage } from '../../content/docs';

export const loader = ({ params }: any) => {
  const doc = getDoc(String(params.slug ?? ''));
  if (!doc) notFound();
  return { doc };
};

export const meta = ({ data }: any) => {
  const doc = data.doc as DocPage;
  return {
    title: `${doc.title} | Blokd Docs`,
    description: doc.summary
  };
};

export default function DocPageRoute(props: { data: { doc: DocPage } }) {
  const doc = props.data.doc;
  return (
    <section class="docs-shell">
      <div class="docs-sidebar-slot">
        <DocsNav active={doc.slug} />
      </div>
      <div class="docs-main-slot">
        <header class="docs-hero section-band">
          <div class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="breadcrumbs text-sm text-base-content/60">
              <ul>
                <li><a href="/docs">Docs</a></li>
                <li>{doc.category}</li>
              </ul>
            </div>
            <span class="badge badge-primary mt-4">{doc.category}</span>
            <h1 class="mt-4 max-w-3xl text-5xl font-black leading-tight sm:text-6xl">{doc.title}</h1>
            <p class="muted-copy mt-4 max-w-3xl text-lg leading-8">{doc.summary}</p>
          </div>
        </header>

        <div class="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_13rem] lg:px-8">
          <article class="prose-lite min-w-0">
            <For each={doc.sections}>
              {section => (
                <section class="doc-section border-b soft-divider pb-10 last:border-b-0" id={section.heading.toLowerCase().replaceAll(' ', '-')}>
                  <h2>{section.heading}</h2>
                  <For each={section.body}>
                    {paragraph => <p>{paragraph}</p>}
                  </For>
                  {section.bullets ? (
                    <ul>
                      <For each={section.bullets}>
                        {item => <li>{item}</li>}
                      </For>
                    </ul>
                  ) : null}
                  {section.note ? (
                    <div role="note" class="alert alert-info alert-soft my-5 border border-base-300 bg-base-100">
                      <span>{section.note}</span>
                    </div>
                  ) : null}
                  {section.warning ? (
                    <div role="alert" class="alert alert-warning alert-soft my-5 border border-warning/30 bg-base-100">
                      <span>{section.warning}</span>
                    </div>
                  ) : null}
                  {section.examples ? (
                    <div class="mt-5 grid gap-4">
                      <For each={section.examples}>
                        {example => (
                          <div class="code-example">
                            {(example.title || example.filename) ? (
                              <div class="code-titlebar flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                                <span>{example.title ?? 'Example'}</span>
                                {example.filename ? <span>{example.filename}</span> : null}
                              </div>
                            ) : null}
                            <pre class="plain-code"><code>{example.code}</code></pre>
                          </div>
                        )}
                      </For>
                    </div>
                  ) : null}
                </section>
              )}
            </For>
          </article>
          <aside class="hidden lg:block lg:self-start">
            <div class="surface-panel sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
              <p class="label-caps">On this page</p>
              <nav class="mt-3 grid gap-2 text-sm">
                <For each={doc.sections}>
                  {section => (
                    <a class="text-base-content/70 hover:text-primary" href={`#${section.heading.toLowerCase().replaceAll(' ', '-')}`}>
                      {section.heading}
                    </a>
                  )}
                </For>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
