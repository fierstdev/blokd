# Blokd

Blokd is a tiny Hono-native meta-framework for building HTML-first web applications with Solid-familiar signals, JSX, SSR, file routing, native forms, and minimal resumable islands.

Current package version: **0.3.0-beta.0**.

Blokd is intentionally a thin layer over vanilla web development:

- **Hono is the server shell.** Blokd mounts pages into a normal Hono app.
- **Web APIs stay visible.** Route actions and loaders receive real `Request`, `Response`, `URL`, and `FormData` objects.
- **JSX is ergonomic syntax, not a VDOM contract.** The current runtime is small; the compiler roadmap moves static JSX to direct DOM/template operations.
- **Static/server pages can ship no client framework JS.** The Vite route manifest marks non-interactive routes with `hasClient: false`, and `createPages()` omits `entryClient` for those routes.
- **Resumability is island/event scoped.** Blokd does not serialize an entire app graph; it lazily resumes behavior only where marked.

## Repository layout

```txt
packages/blokd/       package source and prebuilt dist
examples/basic/       restaurant website example
examples/blokd-dev/   blokd.dev docs site example for Cloudflare Workers
scripts/              package verification, dry-run, and size budgets
tests/                unit/integration tests
tests/browser/        Playwright browser integration tests
docs/                 architecture, hardening, beta, deployment, security
```

## Local install and test

```sh
corepack enable
pnpm install
pnpm check
pnpm build:restaurant
pnpm smoke:restaurant
pnpm build:site
pnpm smoke:site
pnpm test:browser
pnpm pack:dry-run
```

The zip includes a prebuilt `packages/blokd/dist` folder so local workspace installs can resolve `blokd` immediately.

## Public API

```ts
import { signal, memo, effect, cleanup, Show, For, island } from 'blokd';
import { redirect, notFound, json } from 'blokd/server';
import { createPages } from 'blokd/hono';
import { defineAction, readForm, formString } from 'blokd/app';
import { clientComponent, serverComponent } from 'blokd/components';
import { blokd } from 'blokd/vite';
import { Island, resumable, startResumability } from 'blokd/resume';
import { startIslands } from 'blokd/client';
```

Compiler-assisted islands use `island()` in route-imported island files. With the Vite plugin `clientEntry` option, Blokd injects `virtual:blokd/islands` into the client entry and registers those islands automatically. The plugin can also emit deterministic route-local island entries for builds that use stable entry filenames. Use `island(Component, { name: 'Counter' })` when a production build may minify function names.

## Hono server

```ts
import { Hono } from 'hono';
import { createPages } from 'blokd/hono';
import routes from 'virtual:blokd/routes';

const app = new Hono();

app.get('/api/health', c => c.json({ ok: true }));
app.route('/', createPages({ routes, entryClient: '/assets/client.js' }));

export default app;
```

## Route module

```tsx
import { notFound } from 'blokd/server';

export const loader = async ({ params, ctx }) => {
  const post = await ctx.get('db').posts.find(params.slug);
  if (!post) notFound();
  return { post };
};

export const meta = ({ data }) => ({ title: data.post.title });

export default function Page(props) {
  return <article><h1>{props.data.post.title}</h1></article>;
}
```

## Error and 404 boundaries

```txt
src/routes/_404.tsx
src/routes/_error.tsx
src/routes/admin/_404.tsx
src/routes/admin/_error.tsx
```

Nearest boundary wins. `_404.tsx` handles `notFound()` and unmatched paths. `_error.tsx` handles unexpected errors and 5xx `httpError()` responses for document requests.

## Native form action

```tsx
import { redirect } from 'blokd/server';
import { defineAction, formString, readForm } from 'blokd/app';

export const action = defineAction(async ({ request }) => {
  const form = await readForm(request);
  await saveReservation({ email: formString(form, 'email', { required: true }) });
  redirect('/thanks');
});

export default function Reservations() {
  return <form method="post"><input name="email" type="email" required /><button>Reserve</button></form>;
}
```

## Minimal resumable island

```tsx
import { Island, resumable } from 'blokd';

export function Estimator() {
  const state = { guests: 12, perGuest: 75 };

  return (
    <Island name="estimator" state={state}>
      <input type="range" value={state.guests} onInput={resumable('/src/resumables/estimator.ts#updateGuests')} />
      <p data-estimate-output>{state.guests} guests</p>
    </Island>
  );
}
```

```ts
// src/resumables/estimator.ts
import type { ResumableContext } from 'blokd/resume';

export function updateGuests(event: Event, ctx: ResumableContext<{ guests: number; perGuest: number }>) {
  const input = event.target as HTMLInputElement;
  const next = { ...(ctx.state ?? { guests: 12, perGuest: 75 }), guests: Number(input.value) };
  ctx.setState(next);
  ctx.island!.querySelector('[data-estimate-output]')!.textContent = `${next.guests} guests`;
}
```

The client only needs the tiny delegator:

```ts
import { registerResumable, startResumability } from 'blokd/client';
import { updateGuests } from './resumables/estimator';

registerResumable('/src/resumables/estimator.ts#updateGuests', updateGuests);
startResumability({ allowRef: ref => ref.startsWith('/src/resumables/') });
```

## Public beta docs

Read these before publishing or building production apps:

- `docs/BETA-READINESS.md`
- `docs/KNOWN-LIMITATIONS.md`
- `docs/SECURITY-MODEL.md`
- `docs/DEPLOYMENT.md`
- `docs/MIGRATION-POLICY.md`
- `docs/ERROR-BOUNDARIES.md`
- `docs/HARDENING.md`
- `docs/EDGE-CASES.md`
