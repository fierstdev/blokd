# Minimal Starter

The minimal starter is the recommended base for new Blokd projects.

It includes:

- Hono server entry
- Blokd Vite plugin
- file-based routes
- root layout
- custom 404 page
- custom error page
- client entry for resumable islands
- one interactive signal example
- one resumable island example
- one static route

## Create a project

From the Blokd repository root:

~~~sh
cp -R templates/minimal my-blokd-app
cd my-blokd-app
pnpm install
pnpm dev
~~~

Then open the local URL printed by Vite.

## Install from npm

For a standalone app, use the public beta package:

~~~sh
pnpm add blokd@beta hono
pnpm add -D vite typescript @types/node
~~~

Blokd is currently in public beta. The first public versions are prereleases, so use the explicit beta tag in documentation and starter templates:

~~~sh
pnpm add blokd@beta
~~~

## Project structure

~~~txt
my-blokd-app/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    server.ts
    entry-client.ts
    resumables/
      demo.ts
    routes/
      _layout.tsx
      _404.tsx
      _error.tsx
      index.tsx
      about.tsx
~~~

## Files

### package.json

~~~json
{
  "name": "blokd-minimal-app",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "blokd": "beta",
    "hono": ">=4.5 <5"
  },
  "devDependencies": {
    "@types/node": ">=20 <23",
    "typescript": ">=5.5 <6",
    "vite": ">=5 <9"
  }
}
~~~

### tsconfig.json

~~~json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "blokd",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "strict": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
~~~

### vite.config.ts

~~~ts
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
~~~

### index.html

~~~html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Blokd App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <p>This file is used by Vite during development.</p>
  </body>
</html>
~~~

The actual application document is rendered by `src/routes/_layout.tsx`.

### src/server.ts

~~~ts
import { Hono } from "hono";
import { createPages } from "blokd/hono";
import routes from "virtual:blokd/routes";

const app = new Hono();

app.get("/api/health", c => {
  return c.json({ ok: true });
});

app.route(
  "/",
  createPages({
    routes,
    entryClient: "/src/entry-client.ts"
  })
);

export default app;
~~~

### src/entry-client.ts

~~~ts
import { startResumability } from "blokd/client";

startResumability();
~~~

### src/routes/_layout.tsx

~~~tsx
export default function Layout(props) {
  return (
    <html lang="en">
      <head>
        <title>{props.meta?.title ?? "Blokd App"}</title>
        <meta
          name="description"
          content={props.meta?.description ?? "A minimal Blokd application."}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            {" · "}
            <a href="/about">About</a>
          </nav>
        </header>

        <main>{props.children}</main>
      </body>
    </html>
  );
}
~~~

### src/routes/index.tsx

~~~tsx
import { signal, Island, resumable } from "blokd";

export const meta = () => ({
  title: "Blokd App",
  description: "A minimal Blokd application."
});

export default function Home() {
  const [count, setCount] = signal(0);

  return (
    <section>
      <h1>Blokd App</h1>

      <p>
        This page demonstrates Solid-familiar signals and a resumable island.
      </p>

      <button type="button" onClick={() => setCount(c => c + 1)}>
        Count: {count()}
      </button>

      <Island name="demo-island" state={{ message: "Hello from Blokd" }}>
        <button
          type="button"
          data-output
          onClick={resumable("/src/resumables/demo.ts#sayHello")}
        >
          Run resumable handler
        </button>
      </Island>
    </section>
  );
}
~~~

### src/resumables/demo.ts

~~~ts
export function sayHello(event: Event, ctx: any) {
  const button = event.currentTarget as HTMLButtonElement;
  button.textContent = ctx.state.message;
}
~~~

### src/routes/about.tsx

~~~tsx
export const meta = () => ({
  title: "About | Blokd App",
  description: "About this minimal Blokd application."
});

export default function About() {
  return (
    <section>
      <h1>About</h1>

      <p>
        This route has no event handlers or islands, so Blokd can treat it as a
        static/server-rendered route.
      </p>
    </section>
  );
}
~~~

### src/routes/_404.tsx

~~~tsx
export default function NotFound() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <a href="/">Return home</a>
      </p>
    </section>
  );
}
~~~

### src/routes/_error.tsx

~~~tsx
export default function ErrorPage(props) {
  return (
    <section>
      <h1>Something went wrong</h1>
      <p>
        {props.error?.message ??
          "The application encountered an unexpected error."}
      </p>
    </section>
  );
}
~~~

## Route behavior

The starter defines two routes:

~~~txt
src/routes/index.tsx  -> /
src/routes/about.tsx  -> /about
~~~

Special files are not public routes:

~~~txt
src/routes/_layout.tsx  -> root document layout
src/routes/_404.tsx     -> custom not found page
src/routes/_error.tsx   -> custom error page
~~~

## Client JavaScript behavior

Blokd uses static route analysis to decide whether a route needs the client entry.

The home route imports signals, an event handler, and a resumable island, so it needs client behavior.

The about route has no event handlers or islands, so it can be treated as a static/server-rendered route.

## Hono API routes

The starter includes one API route:

~~~ts
app.get("/api/health", c => {
  return c.json({ ok: true });
});
~~~

This should return:

~~~json
{
  "ok": true
}
~~~

Use normal Hono routes for APIs, webhooks, middleware, authentication, cookies, and headers.

## Typecheck

Run:

~~~sh
pnpm typecheck
~~~

## Build

Run:

~~~sh
pnpm build
~~~

## Development

Run:

~~~sh
pnpm dev
~~~

## Notes

This starter is intentionally minimal. It is designed as a clean base for:

- marketing sites
- documentation sites
- local business websites
- simple dashboards
- Hono-backed web apps
- form-driven applications
- progressively enhanced SSR apps

For larger projects, add conventions gradually:

~~~txt
src/components/
src/lib/
src/styles/
src/db/
src/routes/api/
~~~

Do not add a client router, global state library, or hydration framework by default. Blokd should stay HTML-first and only ship client JavaScript where a route actually needs it.
