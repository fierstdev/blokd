# Compiler-Assisted Islands

Compiler-assisted islands are the high-level DX layer for local interactive widgets.

```tsx
import { island, signal } from "blokd";

export const Counter = island(() => {
  const [count, setCount] = signal(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
});
```

Use the island like any component:

```tsx
import { Counter } from "./_components";

export default function Page() {
  return <Counter />;
}
```

## Stable Inferred Names

In `0.4.0-beta.0`, the Vite transform rewrites exported island constants with a stable name option. This means:

```tsx
export const Counter = island(() => <button />);
```

is treated like:

```tsx
export const Counter = island(() => <button />, { name: "Counter" });
```

This is important for production builds because function names can be minified. The exported constant remains the stable public island name.

You can still provide an explicit name:

```tsx
export const SaveButton = island(() => <button />, { name: "AccountSaveButton" });
```

## How Events Work

When the island renders on the server, Blokd captures signal state and transforms event handlers into resumable refs:

```txt
blokd:island:Counter#click0
```

On the browser, `startIslands()` registers the island and delegates matching events. When a handler runs, Blokd rerenders the island and replaces the island root with the new HTML.

## Props

Props must be JSON-serializable if they need to survive across rerenders.

```tsx
export const Greeting = island((props: { initialName: string }) => {
  const [name, setName] = signal(props.initialName);
  return <button onClick={() => setName("Grace")}>Hello {name()}</button>;
});

<Greeting initialName="Ada" />
```

## Client Registration

The Vite plugin discovers exported islands reachable from routes. There are two registration paths:

- global `virtual:blokd/islands`, injected into the configured client entry
- route-local generated entries such as `virtual:blokd/islands/blokd-route-index`

Most apps only need:

```ts
import { startResumability } from "blokd/client";

startResumability({
  allowRef: ref => ref.startsWith("blokd:island:")
});
```

Generated route-local entries call `startIslands()` for the islands needed by that route.

## Good Fits

Compiler-assisted islands shine for:

- counters
- menus
- accordions
- tabs
- filters
- small dashboards
- optimistic form affordances
- route-local controls

## Current Boundaries

Compiler-assisted islands are not a full app hydration system. Keep island state JSON-serializable, keep browser-only side effects inside event handlers or browser guards, and avoid relying on closure state outside Blokd signals.

The compiler optimizes static intrinsic JSX templates, but it intentionally falls back to runtime JSX for dynamic or unsafe shapes.
