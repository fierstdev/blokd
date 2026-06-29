# JSX, Signals, And DOM Runtime

Blokd has its own JSX runtime and reactive primitives. It does not depend on React or a virtual DOM library.

## JSX

Configure TypeScript:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "blokd"
  }
}
```

Use JSX normally:

```tsx
export function Card(props: { title: string; children?: unknown }) {
  return (
    <section class="card">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}
```

Supported server-rendered props include normal attributes, `className`, `classList`, style objects, booleans, strings, numbers, and resumable event bindings. `innerHTML` and `outerHTML` are intentionally blocked during SSR.

## Signals

```tsx
import { effect, signal } from "blokd";

const [count, setCount] = signal(0);

effect(() => {
  console.log(count());
});

setCount(c => c + 1);
```

Signals can use a custom equality comparator:

```ts
const [value, setValue] = signal({ id: 1 }, {
  equals: (a, b) => a.id === b.id
});
```

Use `equals: false` to always notify subscribers.

## Computations

```ts
import { batch, cleanup, effect, memo, root, untrack } from "blokd";

const dispose = root(dispose => {
  const [first, setFirst] = signal("Ada");
  const [last, setLast] = signal("Lovelace");

  const fullName = memo(() => `${first()} ${last()}`);

  effect(() => {
    const id = setInterval(() => console.log(fullName()), 1000);
    cleanup(() => clearInterval(id));
  });

  batch(() => {
    setFirst("Grace");
    setLast("Hopper");
  });

  untrack(() => fullName());

  return dispose;
});
```

## DOM Rendering

```tsx
import { render, hydrate } from "blokd";

render(() => <App />, document.getElementById("app")!);

hydrate(() => <App />, document.getElementById("app")!);
```

`render()` clears and renders a root. `hydrate()` claims existing server-rendered nodes when possible and removes leftover nodes from the hydrated root.

## Dynamic Roots

`dynamic()` creates marker-delimited reactive content. During SSR, dynamic content is wrapped in `<!--bd-->` and `<!--/bd-->`. During hydration, Blokd claims the marker range and updates only that region.

```tsx
import { dynamic, signal } from "blokd";

const [name, setName] = signal("Ada");

export function Greeting() {
  return <p>Hello {dynamic(() => name())}</p>;
}
```

## Control Flow

```tsx
import { For, Show } from "blokd";

<Show when={user()} fallback={<a href="/login">Sign in</a>}>
  {user => <p>Hello {user.name}</p>}
</Show>

<For each={items()} by={item => item.id} fallback={<p>No items</p>}>
  {(item, index) => <p>{index() + 1}. {item.name}</p>}
</For>
```

`For` can key rows with `by` for DOM reuse.
