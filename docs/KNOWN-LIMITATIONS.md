# Known Limitations

## JSX runtime

The Vite transform emits cached DOM templates for static intrinsic JSX. Dynamic JSX, components, spreads, events, and refs still use the small runtime path. Broader compiler template coverage remains future work.

## Hydration

`hydrate()` claims existing SSR nodes and uses `<!--bd-->` markers for dynamic regions. It is intended for focused interactive roots, not a full app hydration framework.

## Static-route analysis

The Vite plugin performs conservative source scanning to decide whether a route needs the client entry. It follows static relative imports and looks for obvious client markers such as event attributes, `signal`, `effect`, `Island`, and `resumable`.

False positives are acceptable in beta because they add the client script. False negatives are bugs and should be reported.

## Resumable refs

Refs such as `/src/resumables/private-dining.ts#updateGuests` are stable identifiers, not a guarantee that `/src` files are served in production. For the beta, production apps should register handlers from the client entry:

```ts
import { registerResumable, startResumability } from 'blokd/client';
import { updateGuests } from './resumables/private-dining';

registerResumable('/src/resumables/private-dining.ts#updateGuests', updateGuests);
startResumability({ allowRef: ref => ref.startsWith('/src/resumables/') });
```

Raw dynamic imports are still supported for dev setups that serve source files or for apps that intentionally expose importable handler chunks.

Registered refs are the recommended CSP-friendly production mode. If refs intentionally point to importable browser chunks, keep `allowRef()` narrow and keep `script-src` limited to trusted script origins.

## Browser support

Blokd targets modern browsers with ES modules, `fetch`, `Request`, `Response`, `FormData`, and standard DOM APIs.

## Server runtimes

The server contract is Web-standard `Request`/`Response` through Hono. Node deployment works through Hono's Node server. Edge deployment should use Hono's runtime-specific adapters and must be tested per target.
