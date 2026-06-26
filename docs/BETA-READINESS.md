# Blokd Public Beta Readiness

Blokd should be published as a beta, not a stable 1.0 release. The package version is `0.1.0-beta.0` and the public contract is intentionally narrow.

## Public beta target

Blokd is ready for public beta when the following pass in a clean machine with network access:

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

## Public beta checklist

- Package version is `0.1.0-beta.0`.
- `blokd`, `blokd/jsx-runtime`, `blokd/client`, `blokd/server`, `blokd/hono`, `blokd/vite`, and `blokd/resume` resolve from the packed tarball.
- Restaurant example builds, serves, handles reservation POST redirects, and renders 404 pages.
- `blokd.dev` example builds as a Cloudflare Workers SSR app with Tailwind and daisyUI styling.
- Static routes omit the client entry script.
- Interactive routes include the client entry script only when the manifest marks `hasClient`.
- Resumable handlers used in production are registered from the client entry or otherwise point to importable built modules.
- Browser tests pass against the built restaurant app.
- `docs/KNOWN-LIMITATIONS.md` is reviewed before publishing.

## Supported beta use cases

- Business websites.
- Restaurant/local service sites.
- Content pages with native forms.
- Hono apps that need SSR pages.
- Small internal tools and small SaaS control panels.
- Resumable widgets with JSON-serializable island state.

## Not yet supported as stable production guarantees

- Large enterprise applications.
- Full app resumability equivalent to Qwik.
- Compiler-emitted direct DOM templates.
- Marker-guided non-destructive hydration.
- Advanced cache/revalidation policy.
- First-party auth, database, image optimization, MDX, or i18n.

## Beta compatibility policy

During `0.x` releases, patch versions may include bug fixes and small API refinements. Minor versions may change experimental APIs, especially route-manifest internals, static analysis heuristics, and resumable refs.

Stable APIs intended for beta use:

- `signal`, `memo`, `effect`, `cleanup`, `batch`, `untrack`.
- `Show`, `For`.
- Route exports: `loader`, `action`, `meta`, `headers`, default component.
- `redirect`, `notFound`, `httpError`, `json`, `html`.
- `createPages`.
- `Island`, `resumable`, `startResumability`.

Experimental APIs:

- Vite route manifest shape.
- Static route client-analysis heuristics.
- Production resumable-ref rewriting strategy.
- `hydrate()` behavior.
