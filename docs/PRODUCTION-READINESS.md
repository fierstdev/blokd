# Production Readiness

Blokd is now structured as a beta candidate. It is not a stable 1.0 framework.

## Required public beta gates

```sh
pnpm install
pnpm check
pnpm build:restaurant
pnpm smoke:restaurant
pnpm build:site
pnpm smoke:site
pnpm test:browser
pnpm pack:dry-run
```

## Runtime guarantees targeted by beta

- Signals clean up dependencies between effect runs.
- Root-owned effects and cleanup callbacks dispose deterministically.
- Server rendering suppresses browser effects.
- Server HTML escapes text and attributes.
- JSON script/state serialization escapes script-breaking characters.
- Hono page handling supports loaders, actions, redirects, 404s, route metadata, and headers.
- Document responses can opt into Web Streams with `createPages({ stream: true })`.
- `_404.tsx` and `_error.tsx` boundaries render for document requests.
- Static route analysis omits client entry scripts for non-interactive routes.
- Resumable refs are explicit, lazy-imported, and subject to `allowRef()` policy.

## Application production checklist

- Add real static hosting for `dist/client` assets in the deployment target.
- Add CSP and security headers using Hono middleware; use `docs/SECURITY-MODEL.md` for resumable-ref CSP policy.
- Add form spam/rate-limit protection for public forms.
- Add structured data, sitemap, and robots handling for marketing/business sites.
- Add logging and request IDs in Hono middleware.
- Validate action input with the app's chosen schema library.
- Keep secrets in runtime environment variables, never route modules shipped to the client.
- Register production resumable refs from the client entry, or verify that refs point to importable built client chunks with narrow `allowRef()` and trusted `script-src`.

## Known beta constraints

- Static intrinsic JSX uses cached DOM templates. Dynamic JSX still uses the runtime path, and broad compiler template coverage remains future work.
- `hydrate()` is marker-guided for focused roots, not a full app hydration framework.
- Resumable islands resume event behavior only. They do not serialize closures, class instances, promises, Maps/Sets, or arbitrary reactive graphs.
- Client navigation enhancement is intentionally minimal; native browser navigation remains the baseline.
- Static-route analysis is conservative source scanning, not a full compiler graph.
