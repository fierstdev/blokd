# Getting Started

## Create A Project

```sh
pnpm create blokd@beta my-app
cd my-app
pnpm install
pnpm dev
```

The default template creates a Vite app with a Hono server, file routes, a root layout, custom error pages, and a resumable island example.

## Manual Setup

Install dependencies:

```sh
pnpm add blokd hono
pnpm add -D vite typescript @types/node
```

Configure TypeScript for Blokd JSX:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "blokd",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "strict": true
  }
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { blokd } from "blokd/vite";

export default defineConfig({
  plugins: [blokd()]
});
```

Create a server entry:

```ts
import { serve } from "@hono/node-server";
import { createPages } from "blokd/hono";
import routes from "virtual:blokd/routes";

const app = createPages({
  routes,
  entryClient: "/src/entry-client.ts"
});

serve(app);
```

Create `src/entry-client.ts`:

```ts
import { startResumability } from "blokd/client";

startResumability({
  allowRef: ref => ref.startsWith("blokd:island:") || ref.startsWith("/src/resumables/")
});
```

Create `src/routes/index.tsx`:

```tsx
import { defineMeta } from "blokd";

export const meta = defineMeta(() => ({
  title: "Home",
  description: "A Blokd page"
}));

export default function Page() {
  return (
    <main>
      <h1>Hello from Blokd</h1>
      <p>This page is server-rendered HTML.</p>
    </main>
  );
}
```

Run the dev server:

```sh
pnpm dev
```

## First Interactive Island

Create `src/routes/_components.tsx`:

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

Use it in a route:

```tsx
import { Counter } from "./_components";

export default function Page() {
  return (
    <main>
      <h1>Counter</h1>
      <Counter />
    </main>
  );
}
```

The Vite plugin infers the stable island name `Counter`, registers the island in the route-local client entry, and only emits client JavaScript for routes that need it.
