import { For } from 'blokd';
import { docs, docsByCategory } from '../content/docs';

export const site = {
  name: 'Blokd',
  domain: 'blokd.dev',
  description: 'A thin ergonomic layer over the Web Platform for HTML-first apps, JSX SSR, native forms, and scoped resumable islands.'
} as const;

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/docs', label: 'Docs' },
  { href: '/docs/project-structure', label: 'Examples' },
  { href: '/docs/known-limitations', label: 'Compare' },
  { href: '/deploy', label: 'Deploy' }
] as const;

export function Wordmark() {
  return (
    <svg class="brand-logo" viewBox="0 0 200 60" role="img" aria-label="Blokd">
      <text x="10" y="42" class="brand-logo-text">
        blokd<tspan class="brand-logo-accent">.</tspan>
      </text>
      <rect x="12" y="50" width="105" height="2" class="brand-logo-accent" />
    </svg>
  );
}

export function Header() {
  return (
    <header class="shell-glass sticky top-0 z-40">
      <div class="navbar mx-auto min-h-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="navbar-start">
          <details class="dropdown lg:hidden">
            <summary class="btn btn-outline btn-sm" aria-label="Open navigation">Menu</summary>
            <ul class="menu dropdown-content z-10 mt-3 w-60 rounded-box border border-base-300 bg-base-100 p-2">
              <For each={navItems}>{item => <li><a href={item.href}>{item.label}</a></li>}</For>
            </ul>
          </details>
          <a href="/" class="btn btn-ghost px-2">
            <Wordmark />
          </a>
        </div>
        <nav class="navbar-center hidden lg:flex" aria-label="Primary navigation">
          <ul class="menu menu-horizontal px-1">
            <For each={navItems}>{item => <li><a href={item.href}>{item.label}</a></li>}</For>
          </ul>
        </nav>
        <div class="navbar-end gap-2">
          <a class="hidden text-sm font-medium text-base-content/70 hover:text-base-content sm:inline-flex" href="/docs/beta-checklist">Beta 0.1</a>
          <a class="btn btn-primary btn-sm" href="/docs/getting-started">Get started</a>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const groups = docsByCategory();
  return (
    <footer class="section-band">
      <div class="footer-grid mx-auto max-w-7xl px-6 py-12 text-base-content lg:px-8">
        <aside class="max-w-sm">
          <a href="/" class="inline-flex items-center">
            <Wordmark />
          </a>
          <p class="mt-4 text-sm leading-6 text-base-content/70">{site.description}</p>
          <p class="label-caps mt-4">Public beta target: 0.4.0-beta.0</p>
        </aside>
        <For each={groups}>
          {group => (
            <nav class="grid content-start gap-2">
              <h2 class="footer-title text-base-content">{group.category}</h2>
              <For each={group.docs}>
                {doc => <a class="link link-hover" href={`/docs/${doc.slug}`}>{doc.title}</a>}
              </For>
            </nav>
          )}
        </For>
      </div>
    </footer>
  );
}

export function DocsNav(props: { active?: string }) {
  const groups = docsByCategory();
  const activeDoc = docs.find(doc => doc.slug === props.active);
  return (
    <aside class="docs-nav surface-panel p-3 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:self-start lg:overflow-y-auto lg:rounded-none">
      <details class="collapse lg:hidden">
        <summary class="collapse-title px-3 py-2 text-sm font-black">
          {activeDoc ? activeDoc.title : 'Documentation'}
        </summary>
        <div class="collapse-content px-0">
          <ul class="menu w-full">
            <For each={groups}>
              {group => (
                <li>
                  <details>
                    <summary>{group.category}</summary>
                    <ul>
                      <For each={group.docs}>
                        {doc => (
                          <li>
                            <a class={props.active === doc.slug ? 'menu-active font-semibold' : ''} href={`/docs/${doc.slug}`}>{doc.title}</a>
                          </li>
                        )}
                      </For>
                    </ul>
                  </details>
                </li>
              )}
            </For>
          </ul>
        </div>
      </details>
      <div class="hidden lg:block">
        <h2 class="label-caps px-3 pb-2">Documentation</h2>
        <ul class="menu w-full">
          <For each={groups}>
            {group => (
              <li>
                <details open>
                  <summary>{group.category}</summary>
                  <ul>
                    <For each={group.docs}>
                      {doc => (
                        <li>
                          <a class={props.active === doc.slug ? 'menu-active font-semibold' : ''} href={`/docs/${doc.slug}`}>{doc.title}</a>
                        </li>
                      )}
                    </For>
                  </ul>
                </details>
              </li>
            )}
          </For>
        </ul>
      </div>
    </aside>
  );
}

export function PageShell(props: { children?: any }) {
  return (
    <>
      <Header />
      <main>{props.children}</main>
      <Footer />
    </>
  );
}
