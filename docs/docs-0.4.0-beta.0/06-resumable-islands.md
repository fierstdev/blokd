# Resumable Islands

Explicit resumable islands are the low-level browser behavior layer. They are useful when you want stable handler refs, separately authored handler modules, and very little client setup.

## Route Usage

```tsx
import { Island, on } from "blokd";

export default function Page() {
  return (
    <Island name="counter" state={{ count: 0 }}>
      <button onClick={on("/src/resumables/counter.ts#increment")}>
        Count: 0
      </button>
    </Island>
  );
}
```

SSR renders:

```html
<div data-blokd-island="counter" data-blokd-state="{...}">
  <button data-blokd-onclick="/src/resumables/counter.ts#increment">Count: 0</button>
</div>
```

## Handler Module

```ts
import { defineAction } from "blokd/resume";

type CounterState = {
  count: number;
};

export const increment = defineAction<CounterState>(({ state, el }) => {
  state.count += 1;
  el.text(`Count: ${state.count}`);
});
```

## Client Entry

```ts
import { registerResumable, startResumability } from "blokd/client";
import { increment } from "./resumables/counter";

registerResumable("/src/resumables/counter.ts#increment", increment);

startResumability({
  allowRef: ref => ref.startsWith("/src/resumables/")
});
```

If a ref is not registered, Blokd can dynamically import `module#export` refs after safety checks and `allowRef` approval.

## State

`Island` state must be JSON-serializable. It is escaped before being placed in `data-blokd-state`.

Handlers receive mutable `state`. Use `setState()` from the lower-level context when replacing the state object:

```ts
import { registerResumable } from "blokd/client";

registerResumable("/src/resumables/toggle.ts#toggle", (event, ctx) => {
  ctx.setState({ open: !ctx.state.open });
});
```

## Element Handle

`defineAction()` adds `el`, a small DOM helper around the event element:

```ts
el.attr("aria-pressed", true);
el.text("Saved");
el.addClass("is-active");
el.removeClass("is-loading");
el.toggleClass("open");
el.find("[data-label]");
el.all("li");
```

## Events

By default `startResumability()` listens for:

```txt
click, input, change, submit
```

Configure more events:

```ts
startResumability({
  events: ["click", "keydown"],
  allowRef: ref => ref.startsWith("/src/resumables/"),
  onError(error, ctx) {
    console.error(ctx.ref, error);
  }
});
```

## Security Contract

Always use `allowRef` in production. Blokd rejects `javascript:`, `data:`, `blob:`, and cross-origin HTTP imports, but `allowRef` is the application-level policy that limits which source modules can run.
