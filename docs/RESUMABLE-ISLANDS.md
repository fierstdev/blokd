# Resumable Islands

Blokd includes a deliberately small, Qwik-inspired resumability layer.

It is not full application resumability. Blokd does not serialize arbitrary closures, promises, class instances, or the whole reactive graph. Instead, it resumes isolated event behavior on demand.

## Why this exists

For business sites and content-heavy applications, most pages should be HTML and CSS. Some pages need small behavior: menu filters, booking estimators, accordions, embedded calculators, or form enhancements. Blokd lets these behaviors load only after interaction.

## API

```tsx
import { Island, on } from 'blokd';

export function Counter() {
  return (
    <Island name="counter" state={{ count: 0 }}>
      <button onClick={on('/src/resumables/counter.ts#increment')}>0</button>
    </Island>
  );
}
```

The server emits:

```html
<div data-blokd-island="counter" data-blokd-state="{&quot;count&quot;:0}">
  <button data-blokd-onclick="/src/resumables/counter.ts#increment">0</button>
</div>
```

Client entry:

```ts
import { registerResumable, startResumability } from 'blokd/client';
import { increment } from './resumables/counter';

registerResumable('/src/resumables/counter.ts#increment', increment);
startResumability({
  allowRef: ref => ref.startsWith('/src/resumables/')
});
```

Handler module:

```ts
import { defineAction } from 'blokd/resume';

type CounterState = {
  count: number;
};

export const increment = defineAction<CounterState>(({ state, el }) => {
  state.count += 1;
  el.text(String(state.count));
});
```

`defineAction()` receives the same island state as the low-level handler plus a small element handle for common DOM updates. `ctx.element` in the low-level API, and `el` in the action API, point to the element that declared the resumable event attribute, even when the event started on a nested child. `ctx.island` is the nearest island root. `ctx.state` is parsed from `data-blokd-state` once per island element and then reused as a mutable object for the lifetime of the page.

## Compiler-assisted islands v1

Blokd also includes an early `island()` authoring layer for dedicated island files. This is the higher-level DX for cases where you do not want to write `Island`, `on()`, handler modules, or manual ref strings by hand.

```tsx
// src/islands/Counter.tsx
import { island, signal } from 'blokd';

export const Counter = island(() => {
  const [count, setCount] = signal(0);
  return (
    <button type="button" onClick={() => setCount(c => c + 1)}>
      Count: {count()}
    </button>
  );
});
```

Use the island like a normal component from a route:

```tsx
import { Counter } from '../islands/Counter';

export default function Page() {
  return <Counter />;
}
```

When the Blokd Vite plugin is configured with `clientEntry`, it injects a generated `virtual:blokd/islands` module into that client entry. The generated module imports route-reachable island exports and calls `startIslands()` for you.

For production client builds, the Vite plugin also adds deterministic route-local island inputs such as `virtual:blokd/islands/blokd-route-index` and writes matching `clientEntry` values into the route manifest. A route that imports a compiler-assisted island can therefore load `/assets/blokd-route-index.js` instead of the shared fallback client entry.

The Vite transform gives exported island declarations a stable public name before production minification:

```tsx
export const Counter = island(() => {
  const [count, setCount] = signal(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count()}</button>;
});
```

For custom client build setups, import the generated module directly:

```ts
// src/entry-client.ts
import 'virtual:blokd/islands';
```

Manual registration is still available for custom setups or prop-bearing islands:

```ts
import { startIslands } from 'blokd/client';
import { Counter } from './islands/Counter';

startIslands(Counter);
startIslands([Counter, { label: 'Guests' }]);
```

V1 scope is intentionally small: simple `signal()` state, JSON-serializable props, simple event handlers, SSR HTML, serialized island state, generated resumable event refs, and text updates by re-rendering the island boundary. Dedicated island files under `src/islands/` or `*.island.tsx` must not import server-only modules such as `node:fs`, `blokd/server`, or `blokd/hono`.

## Supported state

State must be JSON-compatible:

- string
- number
- boolean
- null
- arrays
- plain objects

Unsupported in V1:

- functions
- class instances
- DOM nodes
- cyclic objects
- Maps/Sets
- promises
- Request/Response/Hono context values

## Client entry options

`virtual:blokd/islands` is generated from route-reachable dedicated island files. It imports exported `island()` components, calls `startIslands()`, and registers generated refs like `blokd:island:Counter#click0`. Route-local modules use the same registration code but only include islands reachable from one route.

Route-local entry URLs are deterministic and assume stable client entry file names such as `assets/[name].js`. If a client build uses hashed entry names, keep using the shared `entryClient` fallback until manifest-to-client-asset mapping is added. Lower-level `registerResumable()` and `startResumability()` remain available for explicit `Island`/`on()` handlers and custom allowlists.

## CSP and production refs

Prefer registered refs for production. Registering handlers from the client entry means interaction dispatch does not need to dynamically import the ref URL when the handler is already present:

```ts
registerResumable('/src/resumables/counter.ts#increment', increment);
startResumability({
  allowRef: ref => ref.startsWith('/src/resumables/')
});
```

A normal same-origin module-script CSP is enough for this mode:

```txt
script-src 'self';
object-src 'none';
base-uri 'none';
```

Only use raw dynamic imports when refs intentionally point to built browser chunks, such as `/assets/resumables/counter.js#increment`. In that mode, keep `allowRef()` scoped to the exact public chunk path shape and keep `script-src` limited to trusted script origins.

## Design constraints

- `resumable()` is explicit so the compiler/runtime does not guess at closure serialization.
- The `module#export` string is a stable handler id. In production beta apps, register ids from the client entry unless those module ids are known to be importable in the built app.
- The event delegator is tiny and lives in `blokd/client`.
- Static routes can omit the client entry entirely.
