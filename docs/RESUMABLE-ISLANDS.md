# Resumable Islands

Blokd includes a deliberately small, Qwik-inspired resumability layer.

It is not full application resumability. Blokd does not serialize arbitrary closures, promises, class instances, or the whole reactive graph. Instead, it resumes isolated event behavior on demand.

## Why this exists

For business sites and content-heavy applications, most pages should be HTML and CSS. Some pages need small behavior: menu filters, booking estimators, accordions, embedded calculators, or form enhancements. Blokd lets these behaviors load only after interaction.

## API

```tsx
import { Island, resumable } from 'blokd';

export function Counter() {
  return (
    <Island name="counter" state={{ count: 0 }}>
      <button onClick={resumable('/src/resumables/counter.ts#increment')}>0</button>
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
import type { ResumeContext } from 'blokd/resume';

export function increment(event: Event, ctx: ResumeContext<{ count: number }>) {
  const previous = ctx.state ?? { count: 0 };
  const next = { count: previous.count + 1 };
  ctx.setState(next);
  ctx.element.textContent = String(next.count);
}
```

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

## Design constraints

- `resumable()` is explicit so the compiler/runtime does not guess at closure serialization.
- The `module#export` string is a stable handler id. In production beta apps, register ids from the client entry unless those module ids are known to be importable in the built app.
- The event delegator is tiny and lives in `blokd/client`.
- Static routes can omit the client entry entirely.
