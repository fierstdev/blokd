# Runtime-Aware Components And App Primitives

## Runtime-Aware Components

Blokd exposes a small component metadata layer for separating server, browser, and universal components.

```tsx
import { clientComponent, serverComponent } from "blokd";

export const ServerOnly = serverComponent(() => {
  return <p>Rendered only on the server</p>;
});

export const BrowserOnly = clientComponent(
  () => <button onClick={() => alert("Hi")}>Open</button>,
  { fallback: <button disabled>Open</button> }
);
```

`serverComponent()` throws if rendered in the browser.

`clientComponent()` renders the real component in the browser and a fallback on the server.

`defineComponent()` attaches explicit runtime metadata:

```ts
import { defineComponent } from "blokd";

export const Universal = defineComponent(
  () => <p>Everywhere</p>,
  { runtime: "universal" }
);
```

Inspect runtime metadata:

```ts
import { componentRuntime } from "blokd";

componentRuntime(Universal); // "universal"
```

## Runtime Checks

```ts
import { isBrowserRuntime, isServerRuntime } from "blokd";

if (isBrowserRuntime()) {
  console.log(window.location.href);
}

if (isServerRuntime()) {
  console.log("server");
}
```

## Route Definition Helpers

Route helpers preserve route signatures and make public APIs easier to document:

```ts
import {
  defineAction,
  defineHeaders,
  defineLoader,
  defineMeta,
  defineRoute
} from "blokd";

export default defineRoute({
  loader: defineLoader(() => ({ ok: true })),
  meta: defineMeta(() => ({ title: "Route" })),
  headers: defineHeaders(() => ({ "cache-control": "no-store" })),
  default() {
    return <main>Route</main>;
  }
});
```

Named exports are the common route style. `defineRoute()` is useful when you want one object-shaped route module for tooling or tests.

## Form Primitives

```ts
import { formString, formStrings, readForm } from "blokd";

const form = await readForm(request);
const email = formString(form, "email", { required: true });
const tags = formStrings(form, "tags");
```

`FormData` can be passed directly to `formString()` and `formStrings()`.
