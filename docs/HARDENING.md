# Blokd Production Hardening Notes

This document defines the production edge cases Blokd must handle before it is treated as reliable infrastructure.

## Hardened in this build

- SSR-safe `memo()` behavior when effects are disabled on the server.
- Signal subscriptions avoid duplicate dependency entries from repeated reads in the same computation.
- Reactive scheduler guards against cyclic updates and re-entrant flushing.
- `json(undefined)` returns valid JSON `null` instead of an invalid/empty JSON body.
- JSON serialized into script tags escapes script-breakout characters.
- `redirect()` validates status codes and rejects CR/LF header injection.
- `httpError()` only accepts 4xx/5xx status codes.
- SSR blocks direct `innerHTML`/`outerHTML` assignment by default.
- SSR merges `class` and `classList` instead of dropping one side.
- Hono page handler supports `HEAD` with response headers but no response body.
- Route params use safe decoding; malformed percent-encoding does not crash the router.
- Duplicate route paths are rejected at manifest generation and page-handler startup.
- Resumable refs reject `javascript:`, `data:`, and `blob:` module schemes.
- Resumability supports `allowRef()` as a production policy hook before dynamic import.
- Resumability deduplicates in-flight module imports for the same handler ref.
- Duplicate `startResumability()` calls for the same root/event share one delegated listener.
- `startResumability()` is a no-op on the server.

## Required release gates

A production release must pass:

```sh
pnpm install
pnpm build
pnpm test
node scripts/verify-package.mjs
node scripts/size-budget.mjs
pnpm build:restaurant
pnpm build:site
```

The generated package should then be smoke-tested in at least:

- Node + Hono.
- Bun or Deno with a Fetch-compatible server entry.
- Cloudflare Workers-style Fetch handler.
- Browser with JavaScript disabled.
- Browser with JavaScript enabled.

## Remaining hardening backlog

These are intentionally not hidden. They are the next items before a broad public 1.0 claim:

1. Compiler-grade DOM template generation.
2. Marker-based hydration rather than recreate-style hydration.
3. Compiler-grade static-route analysis instead of conservative source scanning.
4. First-class `Set-Cookie` multi-header tests in target runtimes.
5. CSP documentation for resumable dynamic imports and registered refs.
6. Streaming SSR.
7. Adapter smoke tests for edge runtimes.
8. Public benchmark suite versus Astro, SvelteKit, Remix, Qwik, SolidStart, and Next.
