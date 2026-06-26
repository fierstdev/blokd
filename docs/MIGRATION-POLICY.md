# Migration and Versioning Policy

Blokd is in beta. The package version starts at `0.1.0-beta.0`.

## Semver before 1.0

- Patch beta releases fix bugs and may tighten validation.
- Minor beta releases may change experimental APIs.
- Breaking changes must be documented in `CHANGELOG.md` once public publishing starts.

## Stable beta APIs

The public beta intends to preserve the primary authoring model:

```ts
import { signal, memo, Show, For, Island, resumable } from 'blokd';
import { redirect, notFound } from 'blokd/server';
import { createPages } from 'blokd/hono';
import { blokd } from 'blokd/vite';
```

## Expected future migration areas

- Direct DOM compiler output may replace parts of the runtime JSX IR.
- Resumable refs may move from raw module refs to a manifest-backed production strategy.
- Static-route analysis may become stricter and more precise.
- Error boundary props may receive stronger typing.
