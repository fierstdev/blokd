# Rendering, Metadata, Headers, And Errors

## Server Rendering

Blokd renders JSX to strings or full `Response` objects.

```ts
import { renderToString, renderDocument } from "blokd/server";

const body = renderToString(<h1>Hello</h1>);

const response = renderDocument({
  body: <main>{body}</main>,
  meta: { title: "Hello" },
  data: { route: "index" }
});
```

`renderDocumentToStream()` returns a document response with a `ReadableStream` body.

```ts
import { renderDocumentToStream } from "blokd/server";

return renderDocumentToStream({
  body: <App />,
  meta: { title: "Streamed" }
});
```

Hono apps can opt in through `createPages({ stream: true })`.

## Metadata

Routes and layouts can export `meta`.

```ts
import { defineMeta } from "blokd";

export const meta = defineMeta(({ data }) => ({
  title: data.post.title,
  description: data.post.summary,
  htmlAttrs: { lang: "en" },
  bodyAttrs: { class: "docs" },
  meta: [{ name: "robots", content: "index,follow" }],
  links: [{ rel: "canonical", href: "https://example.com/docs" }]
}));
```

Metadata from layouts and routes is merged. Later title and description values replace earlier values. Meta, link, and script arrays are appended.

## Headers

Routes and layouts can export `headers`.

```ts
import { defineHeaders } from "blokd";

export const headers = defineHeaders(() => ({
  "cache-control": "public, max-age=60"
}));
```

Multiple `Set-Cookie` values are preserved when headers are merged:

```ts
export const headers = defineHeaders(() => [
  ["set-cookie", "a=1; Path=/; HttpOnly"],
  ["set-cookie", "b=2; Path=/; HttpOnly"]
]);
```

## Redirects And HTTP Errors

```ts
import { httpError, notFound, redirect } from "blokd/server";

redirect("/login", 303);
notFound();
httpError(422, "Invalid form submission");
```

`redirect()` only accepts `301`, `302`, `303`, `307`, and `308`, and rejects CR/LF in the location.

`httpError()` accepts `4xx` and `5xx` statuses.

## Error Boundaries

Use `_error.tsx` for route segment errors.

```tsx
export default function ErrorBoundary({ error, status }) {
  return (
    <main>
      <h1>{status}</h1>
      <pre>{error instanceof Error ? error.message : String(error)}</pre>
    </main>
  );
}
```

Use `_404.tsx` for not-found pages.

```tsx
export default function NotFound() {
  return <main>Not found</main>;
}
```

In production, Blokd limits serialized error details. During development, it exposes stack information to help debugging.
