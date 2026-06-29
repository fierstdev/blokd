# API Reference

## `blokd`

### Reactivity

`signal<T>(initial, options?)`

Creates an accessor and setter.

```ts
const [value, setValue] = signal(0);
setValue(1);
setValue(previous => previous + 1);
```

`memo<T>(fn, options?)`

Creates a derived accessor.

`effect(fn)`

Runs immediately and reruns when tracked signals change. Returns a disposer.

`cleanup(fn)`

Registers cleanup in the current owner scope.

`batch(fn)`

Groups signal updates and flushes once.

`untrack(fn)`

Reads signals without subscribing the current computation.

`root(fn)`

Creates an owner scope. The callback receives a disposer.

`getOwner()`, `runWithOwner(owner, fn)`, `dispose(owner)`

Advanced owner-scope APIs.

### DOM

`render(fn, rootElement)`

Render into a root and return a disposer.

`hydrate(fn, rootElement)`

Claim existing SSR nodes and attach reactive behavior.

`dynamic(fn)`

Create marker-delimited dynamic content.

`Show(props)`

Conditional control flow.

`For(props)`

List control flow, optionally keyed with `by`.

### Compiler-Assisted Islands

`island(component, options?)`

Create an island component.

```ts
const Counter = island(() => <button />);
```

`registerIsland(component, props?)`

Register handlers for one island component.

`startIslands(registrations, options?)`

Register islands and start delegated resumability.

### Runtime-Aware Components

`defineComponent(component, options?)`

Attach runtime metadata.

`serverComponent(component)`

Create a component that cannot render in the browser.

`clientComponent(component, options?)`

Render a fallback on the server and the component in the browser.

`componentRuntime(component)`

Return `"server"`, `"browser"`, `"universal"`, or `null`.

`isBrowserRuntime()`, `isServerRuntime()`

Runtime checks.

### Route Helpers

`defineLoader(loader)`

Type helper for route loaders.

`defineAction(action)`

Type helper for route actions.

`defineMeta(meta)`

Type helper for route metadata.

`defineHeaders(headers)`

Type helper for route headers.

`defineRoute(route)`

Type helper for object-shaped route modules.

`readForm(request)`

Read form data into a record, preserving duplicate names as arrays.

`formString(form, name, options?)`

Read one string value.

`formStrings(form, name, options?)`

Read all string values.

### Explicit Resumability

`Island(props)`

Render an explicit island root.

`on(ref)`

Create an event binding for a handler ref.

`resumable(ref, handler?)`

Create an event binding and optionally register the handler immediately.

`registerResumable(ref, handler)`

Register a handler in the browser registry.

`unregisterResumable(ref)`

Remove a handler.

`startResumability(options?)`

Start delegated event handling.

`serializeState(value)`, `parseState(value)`

Serialize and parse island state.

`isResumableHandler(value)`

Check whether a value is a resumable binding.

## `blokd/server`

`renderToString(input)`

Render JSX or a render function to HTML.

`renderDocument(options)`

Return a full HTML `Response`.

`renderDocumentToStream(options)`

Return a full HTML `Response` with a `ReadableStream` body.

`renderHead(meta)`

Render document head tags from metadata.

`mergeMeta(...metas)`

Merge metadata descriptors.

`attrsToString(attrs)`

Render HTML attributes.

`json(data, init?)`

Create a JSON response.

`html(body, init?)`

Create an HTML response.

`escapeHtml(value)`

Escape text for HTML.

`safeJsonScript(data)`

Serialize JSON for script-tag embedding.

`redirect(location, status?)`

Throw a redirect response.

`notFound(message?)`

Throw a 404 response.

`httpError(status, message?, init?)`

Throw a 4xx or 5xx response.

`isHttpError(error)`

Check for Blokd HTTP errors.

`HttpError`, `Redirect`

Error classes used by the helpers.

## `blokd/hono`

`createPages(options)`

Create a Hono app from route entries.

```ts
createPages({
  routes,
  entryClient: "/src/entry-client.ts",
  dataQueryParam: "__blokd",
  stream: false,
  onError(error, ctx) {
    return new Response("Error", { status: 500 });
  }
});
```

`matchRoute(routes, pathname)`

Match a pathname against route entries.

## `blokd/vite`

`blokd(options?)`

Vite plugin.

Utility exports include route-path helpers, manifest generation, route analysis, byte parsing, route budget validation, output measurement, and route runtime report creation.

## `blokd/client`

The client entry re-exports browser-safe DOM, island, and resumability APIs. Typical usage:

```ts
import { startResumability } from "blokd/client";

startResumability({
  allowRef: ref => ref.startsWith("blokd:island:")
});
```

## `blokd/resume`

Use for explicit resumable handlers:

```ts
import { defineAction } from "blokd/resume";

export const save = defineAction(({ state, el }) => {
  state.saved = true;
  el.text("Saved");
});
```
