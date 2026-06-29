# Codex Handoff

Goal: continue hardening Blokd as the smallest useful meta-framework over vanilla web development.

## Current state

The repository contains:

- `blokd` package with source and prebuilt `dist`.
- Solid-familiar reactivity: `signal`, `memo`, `effect`, `cleanup`, `batch`, `untrack`.
- JSX runtime and SSR renderer.
- Hono page mounting via `createPages()`.
- Vite plugin that transforms JSX, emits cached templates for static intrinsic JSX, infers stable names for exported compiler-assisted islands, and generates `virtual:blokd/routes` plus `virtual:blokd/islands`.
- Route loaders/actions/meta/headers.
- Minimal resumable islands: `Island`, `resumable`, `startResumability`, and compiler-assisted `island()`.
- Restaurant website example.

## Immediate validation after package install

```sh
pnpm install
pnpm check
pnpm build:restaurant
pnpm start:restaurant
```

## Priority hardening tasks

1. Broaden compiler template coverage beyond static intrinsic JSX.
2. Replace conservative source scanning with compiler-grade static-route analysis.
3. Add public benchmark fixtures versus Astro, SvelteKit, Remix, Qwik, SolidStart, and Next.

## Guardrails

Do not add a custom server object. Hono remains the app.
Do not add a data/query client to core.
Do not add a custom form component to core.
Do not add a custom CSS system.
Do not make resumability serialize arbitrary closures.
