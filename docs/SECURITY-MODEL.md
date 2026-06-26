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
