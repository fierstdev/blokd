# Routing, Loaders, Actions, And Forms

Blokd routes are plain modules. A route can export a default component plus optional loader, action, metadata, headers, runtime, and budget declarations.

## Basic Route

```tsx
export default function About() {
  return (
    <main>
      <h1>About</h1>
      <p>Rendered on the server.</p>
    </main>
  );
}
```

## Dynamic Routes

`[slug].tsx` creates a path parameter.

```tsx
import { defineLoader, notFound } from "blokd";

export const loader = defineLoader(async ({ params }) => {
  const post = await getPost(params.slug);
  if (!post) notFound();
  return { post };
});

export default function Post({ data }) {
  return <article>{data.post.title}</article>;
}
```

Catch-all routes use `[...path].tsx` and receive a single slash-joined parameter.

## Loaders

Loaders run for layouts and the leaf route before rendering. Loader return values are merged into the route `data` object. Plain objects are merged by key. Non-object values are stored under a name derived from the route component.

```ts
import { defineLoader } from "blokd";

export const loader = defineLoader(async ({ request, params, ctx }) => {
  return {
    userAgent: request.headers.get("user-agent"),
    slug: params.slug,
    env: ctx.env
  };
});
```

## Actions

Actions run for `POST`, `PUT`, `PATCH`, and `DELETE`.

```tsx
import { defineAction, formString, readForm, redirect } from "blokd";

export const action = defineAction(async ({ request }) => {
  const form = await readForm(request);
  const email = formString(form, "email", { required: true });

  await subscribe(email);
  redirect("/thanks", 303);
});

export default function Contact() {
  return (
    <form method="post">
      <input name="email" type="email" required />
      <button>Subscribe</button>
    </form>
  );
}
```

If an action returns a plain object, Blokd renders the route again with that object as action data for HTML requests and returns JSON for data requests.

```ts
export const action = defineAction(async ({ request }) => {
  const form = await readForm(request);
  const name = formString(form, "name");
  if (!name) return { ok: false, errors: { name: "Name is required" } };
  return { ok: true };
});
```

## Form Helpers

`readForm(request)` returns a record that preserves duplicate field names as arrays.

`formString(form, name, options)` returns the first string field value. By default it trims whitespace. With `required: true`, it throws if the resulting value is empty.

`formStrings(form, name, options)` returns all string values for a field.

```ts
const form = await readForm(request);
const title = formString(form, "title", { required: true });
const tags = formStrings(form, "tags");
```

## Data Requests

`createPages()` treats a request as a data request when:

- the URL has the configured data query param, default `?__blokd`
- the `Accept` header prefers JSON and does not include `text/html`

For loader requests Blokd returns:

```json
{
  "data": {},
  "meta": {}
}
```

For action requests returning plain objects, Blokd returns that object as JSON.
