# Blokd

Blokd is a tiny Hono-native meta-framework for HTML-first apps with Solid-familiar signals, JSX, SSR, file routing, native forms, and minimal resumable islands.

Version: `0.4.0-beta.0`.

## Install

```sh
pnpm add blokd hono
pnpm add -D vite typescript
```

## Imports

```ts
import { signal, memo, Show, For, Island, resumable, island } from 'blokd';
import { redirect, notFound } from 'blokd/server';
import { createPages } from 'blokd/hono';
import { defineAction, readForm, formString } from 'blokd/app';
import { clientComponent, serverComponent } from 'blokd/components';
import { blokd } from 'blokd/vite';
import { registerResumable, startResumability, startIslands } from 'blokd/client';
```

## Beta status

This package is beta software. Use it for small Hono-native SSR apps, business sites, restaurant/local service sites, native forms, and resumable widgets. Read the repository docs before public production use.

Production resumable handlers should be registered from the client entry with `registerResumable()` unless the handler ref points to an importable built module. Compiler-assisted islands are registered by generated `virtual:blokd/islands` modules. Route-local island entries are deterministic and expect stable client entry filenames such as `assets/[name].js`. Exported island declarations such as `export const Counter = island(() => ...)` receive a stable compiler-inferred name before production minification.

Document responses can opt into streaming with `createPages({ stream: true })`, or directly with `renderDocumentToStream()` from `blokd/server`.
