# Codex Handoff

Goal: continue hardening Blokd as the smallest useful meta-framework over vanilla web development.

## Current state

The repository contains:

- `blokd` package with source and prebuilt `dist`.
- Solid-familiar reactivity: `signal`, `memo`, `effect`, `cleanup`, `batch`, `untrack`.
- JSX runtime and SSR renderer.
- Hono page mounting via `createPages()`.
- Vite plugin that transforms JSX and generates `virtual:blokd/routes`.
- Route loaders/actions/meta/headers.
- Minimal resumable islands: `Island`, `resumable`, `startResumability`.
- Restaurant website example.

## Immediate validation after package install

```sh
pnpm install
pnpm check
pnpm build:restaurant
pnpm start:restaurant
```

## Priority hardening tasks

1. Add browser integration tests for `startResumability()` using Playwright or happy-dom.
2. Add client build smoke test for the restaurant app.
3. Add static route analysis so routes without interactivity omit client entries by default.
4. Replace runtime JSX IR with compiler-emitted DOM templates.
5. Add marker-guided hydration for interactive islands that need signal bindings beyond manual event handlers.
6. Add route manifest tests for pathless groups, catch-alls, layouts, and private files.
7. Add error boundary conventions (`_error.tsx`, `_404.tsx`).
8. Add security middleware recipes for CSP, CSRF/spam protection, and secure headers.

## Guardrails

Do not add a custom server object. Hono remains the app.
Do not add a data/query client to core.
Do not add a custom form component to core.
Do not add a custom CSS system.
Do not make resumability serialize arbitrary closures.
