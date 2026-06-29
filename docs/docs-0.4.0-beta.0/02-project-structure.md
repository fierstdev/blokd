# Project Structure

A typical Blokd app looks like this:

```txt
my-app/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    server.ts
    entry-client.ts
    resumables/
      counter.ts
    routes/
      _layout.tsx
      _404.tsx
      _error.tsx
      index.tsx
      about.tsx
      contact.tsx
      posts/
        [slug].tsx
```

## Required Files

`vite.config.ts` enables Blokd route discovery, JSX compilation, route runtime analysis, route-local island entries, and virtual modules.

`src/server.ts` creates the Hono app, imports `virtual:blokd/routes`, and calls `createPages()`.

`src/routes` contains file-based route modules. Files beginning with `_` are special route files or private support files.

`src/entry-client.ts` starts explicit resumability and can also be used for global client setup. The Vite plugin injects `virtual:blokd/islands` into this entry when needed.

## Route Files

Route files map to URL paths:

```txt
src/routes/index.tsx          -> /
src/routes/about.tsx          -> /about
src/routes/posts/[slug].tsx   -> /posts/:slug
src/routes/docs/[...path].tsx -> /docs/:path*
```

Special files:

```txt
_layout.tsx  wraps sibling and child routes
_error.tsx   renders errors for the nearest route segment
_404.tsx     renders not-found boundaries
```

Private files that begin with `_` and are not special route files do not become pages. They can hold route-local components, data helpers, or island exports.

## Client Entries

Blokd has two client entry modes:

- one global `entryClient`, usually `/src/entry-client.ts`
- generated route-local island entries, such as `/assets/blokd-route-index.js`

If a route contains no client behavior, no client script is emitted for that route. If a route imports compiler-assisted islands, the manifest can point at a generated route-local client entry.

## Recommended Conventions

- Keep server-only helpers out of island files.
- Put low-level explicit resumable handlers under `src/resumables`.
- Put compiler-assisted island components near the route that uses them.
- Use `defineLoader`, `defineAction`, `defineMeta`, and `defineHeaders` for typed route exports.
- Use `runtime = "none"` or `budget = { client: "0kb" }` on static routes that must stay client-free.
