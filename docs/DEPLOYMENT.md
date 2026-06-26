# Deployment Guide

Blokd is Hono-native. Deployment should follow the target runtime's Hono adapter.

## Node server

Build the example:

```sh
pnpm build:restaurant
pnpm start:restaurant
```

The example server serves static assets from `dist/client` and mounts Blokd pages into a Hono app.

## Static assets

In production, serve `dist/client/assets/*` with immutable cache headers:

```txt
Cache-Control: public, max-age=31536000, immutable
```

Serve HTML responses without long immutable caching unless the route is explicitly static.

## Cloudflare Workers

The `examples/blokd-dev` app is the reference Workers deployment shape for the public `blokd.dev` site:

```sh
pnpm build:site
pnpm smoke:site
pnpm --filter blokd-dev-site deploy:dry-run
pnpm --filter blokd-dev-site deploy
```

The example builds:

- client assets to `examples/blokd-dev/dist/client`
- the SSR Worker entry to `examples/blokd-dev/dist/worker/entry-worker.js`

`wrangler.jsonc` uses Workers static assets with an `ASSETS` binding:

```jsonc
{
  "main": "./dist/worker/entry-worker.js",
  "assets": {
    "directory": "./dist/client",
    "binding": "ASSETS",
    "not_found_handling": "none"
  }
}
```

Keep `not_found_handling` as `none` for SSR apps so Blokd can render `_404.tsx` boundaries. Add the real `blokd.dev` custom domain route only after the Cloudflare zone is configured.

## Environment variables

Use runtime environment variables in `src/server.ts` and Hono middleware. Do not serialize secrets through loaders or island state.

## Edge runtimes

Blokd's server contract uses `Request` and `Response`, so edge deployment should be possible through Hono's runtime adapters. Each target must be tested separately because filesystem access, static asset serving, and environment bindings differ.

## Production checklist

- Build server and client bundles.
- Run `pnpm smoke:restaurant`.
- Run browser integration tests against the built app.
- Verify security headers.
- Verify form submissions and redirects.
- Verify 404 and 500 boundaries.
- Verify static routes do not emit client JS unless needed.
