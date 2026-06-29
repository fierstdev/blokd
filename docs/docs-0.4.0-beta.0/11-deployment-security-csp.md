# Deployment, Security, And CSP

## Deployment Model

Blokd uses Web APIs and Hono, so deployment is mostly a Hono adapter decision. Build the server bundle and client assets with Vite, then run the Hono app on your target runtime.

Common deployment targets include:

- Node.js servers
- Cloudflare Workers-style runtimes with Web API support
- platforms that can run Vite-built server bundles

Use adapter smoke tests for the targets you care about before relying on a deployment path.

## Security Defaults

Blokd escapes text and attributes during SSR.

`safeJsonScript()` escapes JSON embedded in HTML script tags.

`serializeState()` escapes island state embedded in `data-blokd-state`.

`redirect()` rejects CR/LF in locations and only allows redirect statuses.

`httpError()` only accepts `4xx` and `5xx` statuses.

SSR blocks `innerHTML` and `outerHTML`. If an app needs raw HTML, create an explicit sanitization boundary in app code.

## Resumable Ref Policy

Always configure `allowRef`:

```ts
startResumability({
  allowRef(ref) {
    return ref.startsWith("blokd:island:") || ref.startsWith("/src/resumables/");
  }
});
```

Blokd rejects dangerous dynamic import schemes and cross-origin HTTP imports, but your app must still decide which refs are valid.

## Content Security Policy

Blokd supports CSP-friendly resumability because event handlers are represented as data attributes and module refs, not inline JavaScript.

For strict CSP:

- allow your own module scripts
- avoid inline scripts except Blokd's JSON data script
- apply a nonce or hash policy if your deployment requires it
- prefer registered resumables and route-local island chunks over broad dynamic import policies

Example starting point:

```txt
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data:;
connect-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

If you embed the `__BLOKD_DATA__` script under a CSP that forbids all inline scripts, configure your server to permit that JSON script using your deployment's nonce or hash strategy.

## Cookies And Headers

When route metadata contributes headers, Blokd preserves multiple `Set-Cookie` headers by appending values rather than joining them into one invalid header.

```ts
export const headers = defineHeaders(() => [
  ["set-cookie", "session=abc; Path=/; HttpOnly; SameSite=Lax"],
  ["set-cookie", "theme=dark; Path=/; SameSite=Lax"]
]);
```
