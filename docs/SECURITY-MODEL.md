# Security Model

Blokd intentionally exposes Web APIs rather than wrapping them in a proprietary abstraction. Application security remains the responsibility of the app, with framework-level guardrails for common pitfalls.

## Framework guardrails

- SSR escapes text and attributes by default.
- `innerHTML` and `outerHTML` assignment are blocked by default in SSR and DOM creation.
- JSON embedded in script tags is escaped with `safeJsonScript()`.
- `redirect()` rejects invalid statuses and CR/LF injection in `Location`.
- `httpError()` only accepts 4xx/5xx statuses.
- Resumable dynamic imports reject `javascript:`, `data:`, and `blob:` module schemes.
- `startResumability()` supports `allowRef()` so applications can enforce a production import allowlist.

## Application responsibilities

- Validate and sanitize all user input in `action()` and API routes.
- Add CSRF or spam protection to public mutation endpoints.
- Add rate limiting to public forms and APIs.
- Use secure cookies and appropriate `SameSite` settings.
- Configure CSP and security headers through Hono middleware.
- Keep dependencies patched and publish with provenance when possible.
- Do not expose secrets through loader data or serialized island state.

## CSP for resumable islands

Blokd supports two production resumability modes with different CSP implications.

### Registered refs

Recommended for most production apps. The HTML still contains stable ids such as `/src/resumables/counter.ts#increment`, but the handler function is registered from a trusted client bundle:

```ts
import { registerResumable, startResumability } from 'blokd/client';
import { increment } from './resumables/counter';

registerResumable('/src/resumables/counter.ts#increment', increment);
startResumability({
  allowRef: ref => ref.startsWith('/src/resumables/')
});
```

In this mode the browser does not dynamically import the ref URL when the handler is already registered. A strict page CSP can allow only same-origin module scripts and styles:

```txt
default-src 'self';
base-uri 'none';
object-src 'none';
frame-ancestors 'none';
script-src 'self';
style-src 'self';
img-src 'self' data:;
connect-src 'self';
form-action 'self';
```

Do not add `unsafe-inline` for Blokd. The framework emits module script tags, `data-blokd-*` attributes, and JSON script data; it does not require inline event handlers.

### Importable handler chunks

Use this only when refs intentionally point at built, importable browser chunks. Keep `allowRef()` as narrow as the public asset URL shape:

```ts
startResumability({
  allowRef: ref => ref.startsWith('/assets/resumables/') && ref.endsWith('#increment')
});
```

The CSP must allow same-origin module script loading for those chunks:

```txt
script-src 'self';
```

Do not allow remote script origins just to make resumable imports work. If handlers need code from a third-party origin, bundle it into your client build or add that origin only after the same review you would apply to any other production script dependency.

## Recommended Hono middleware pattern

```ts
app.use('*', secureHeaders());
app.use('/reservations', rateLimit());
app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
});
```

Blokd should not own security middleware. Hono should remain the HTTP and middleware layer.
