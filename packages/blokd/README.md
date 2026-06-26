# Blokd

Blokd is a tiny Hono-native meta-framework for HTML-first apps with Solid-familiar signals, JSX, SSR, file routing, native forms, and minimal resumable islands.

Version: `0.1.0-beta.0`.

## Install

```sh
pnpm add blokd hono
pnpm add -D vite typescript
```

## Imports

```ts
import { signal, memo, Show, For, Island, resumable } from 'blokd';
import { redirect, notFound } from 'blokd/server';
import { createPages } from 'blokd/hono';
import { blokd } from 'blokd/vite';
import { registerResumable, startResumability } from 'blokd/client';
```

## Beta status

This package is beta software. Use it for small Hono-native SSR apps, business sites, restaurant/local service sites, native forms, and resumable widgets. Read the repository docs before public production use.

Production resumable handlers should be registered from the client entry with `registerResumable()` unless the handler ref points to an importable built module.
