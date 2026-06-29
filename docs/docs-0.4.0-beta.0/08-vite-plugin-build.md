# Vite Plugin And Build Behavior

Blokd's Vite plugin provides route discovery, route manifests, JSX transforms, compiler-assisted island registration, route runtime reporting, and client budget validation.

## Setup

```ts
import { defineConfig } from "vite";
import { blokd } from "blokd/vite";

export default defineConfig({
  plugins: [
    blokd({
      routesDir: "src/routes",
      clientEntry: "/src/entry-client.ts"
    })
  ]
});
```

## Options

```ts
type BlokdPluginOptions = {
  routesDir?: string;
  extensions?: string[];
  clientEntry?: string;
  strictRoutes?: boolean;
  analyzeClient?: boolean;
  budgets?: Record<string, string>;
  clientOutDir?: string;
  routeClientEntries?: boolean;
  routeClientEntryBase?: string;
};
```

Defaults:

```txt
routesDir: src/routes
extensions: .tsx, .jsx, .ts, .js
clientEntry: /src/entry-client.ts
strictRoutes: true
analyzeClient: true
clientOutDir: dist/client
routeClientEntries: true
routeClientEntryBase: /assets/
```

## Virtual Modules

`virtual:blokd/routes` exports the route manifest used by `createPages()`.

```ts
import routes from "virtual:blokd/routes";
```

`virtual:blokd/islands` registers discovered compiler-assisted islands.

```ts
import "virtual:blokd/islands";
```

The plugin injects `virtual:blokd/islands` into the configured client entry when necessary.

## Route Runtime Categories

The plugin analyzes each route and classifies it as:

```txt
none     no client behavior detected
islands  compiler-assisted or explicit island behavior detected
client   general client runtime behavior detected
```

Builds print a route runtime report.

## Static Route Declarations

Use `runtime = "none"` to assert that a route must not need browser code:

```ts
export const runtime = "none";
```

Use a zero client budget for the same intent:

```ts
export const budget = { client: "0kb" };
```

If the plugin detects client behavior for a route declared as static, the build fails.

## Budgets

Configure route budgets in `vite.config.ts`:

```ts
blokd({
  budgets: {
    "/": "1kb",
    "/contact": "0kb",
    "/dashboard": "8kb"
  }
});
```

Supported units include `b`, `kb`, `kib`, `mb`, and `mib`.

## JSX Compiler

The plugin transforms JSX before Vite's normal pipeline. It:

- converts JSX to Blokd runtime calls
- wraps dynamic expressions lazily
- emits static templates for safe intrinsic JSX
- injects stable names for exported `island()` constants

Static template optimization is intentionally conservative. If JSX includes dynamic children, event handlers, refs, component calls, or unsupported shapes, the compiler uses the normal runtime path.

## Route-Local Island Entries

When `routeClientEntries` is enabled, the plugin adds Rollup inputs for route-local island registries. The generated URL is based on the route id and `routeClientEntryBase`.

For predictable URLs, configure client output names with stable entry names such as:

```ts
build: {
  rollupOptions: {
    output: {
      entryFileNames: "assets/[name].js"
    }
  }
}
```
