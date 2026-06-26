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
    <>
      <section class="section-band">
        <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div class="breadcrumbs text-sm text-base-content/60">
            <ul>
              <li><a href="/docs">Docs</a></li>
              <li>{doc.category}</li>
            </ul>
          </div>
          <span class="badge badge-primary mt-4">{doc.category}</span>
          <h1 class="mt-4 max-w-3xl text-5xl font-black leading-tight tracking-normal">{doc.title}</h1>
          <p class="mt-4 max-w-3xl text-lg leading-8 text-base-content/75">{doc.summary}</p>
        </div>
      </section>

      <section class="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
        <DocsNav active={doc.slug} />
        <article class="prose-lite min-w-0 max-w-4xl">
          <For each={doc.sections}>
            {section => (
              <section class="doc-section border-b soft-divider pb-10 last:border-b-0">
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
                  <div role="note" class="alert alert-info alert-soft my-5 border border-info/20">
                    <span>{section.note}</span>
                  </div>
                ) : null}
                {section.warning ? (
                  <div role="alert" class="alert alert-warning alert-soft my-5 border border-warning/20">
                    <span>{section.warning}</span>
                  </div>
                ) : null}
                {section.examples ? (
                  <div class="mt-5 grid gap-4">
                    <For each={section.examples}>
                      {example => (
                        <div class="code-example">
                          {(example.title || example.filename) ? (
                            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-content/10 px-4 py-2 text-xs font-bold text-neutral-content/65">
                              <span>{example.title ?? 'Example'}</span>
                              {example.filename ? <span>{example.filename}</span> : null}
                            </div>
                          ) : null}
                          <div class="mockup-code bg-neutral text-neutral-content">
                            <pre data-prefix=""><code>{example.code}</code></pre>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                ) : null}
              </section>
            )}
          </For>
        </article>
      </section>
    </>
  );
}
