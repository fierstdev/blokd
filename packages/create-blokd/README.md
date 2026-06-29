# create-blokd

Create a new Blokd project from the command line.

Blokd is a tiny Hono-native meta-framework for HTML-first applications, with Solid-familiar signals, Web APIs, SSR, file-based routing, and resumable islands.

## Usage

Create a new project with pnpm:

~~~sh
pnpm create blokd my-app
~~~

Or use the explicit beta tag:

~~~sh
pnpm create blokd@beta my-app
~~~

With npm:

~~~sh
npm create blokd@beta my-app
~~~

With yarn:

~~~sh
yarn create blokd my-app
~~~

With bun:

~~~sh
bun create blokd my-app
~~~

Then start the app:

~~~sh
cd my-app
pnpm install
pnpm dev
~~~

Open the local URL printed by Vite.

## Options

~~~txt
Usage:
  npm create blokd@beta my-app
  pnpm create blokd my-app
  yarn create blokd my-app
  bun create blokd my-app

Options:
  --template <name>       Template to use. Default: minimal
  --install               Install dependencies after creating the project
  --no-install            Do not install dependencies
  --pm <name>             Package manager: pnpm, npm, yarn, bun
  -h, --help              Show help
~~~

## Examples

Create a minimal project:

~~~sh
pnpm create blokd my-app
~~~

Create a minimal project and install dependencies:

~~~sh
pnpm create blokd my-app --install
~~~

Create a project with an explicit template:

~~~sh
pnpm create blokd my-app --template minimal
~~~

Create a project and force npm as the package manager:

~~~sh
pnpm create blokd my-app --pm npm
~~~

Create a project without installing dependencies:

~~~sh
pnpm create blokd my-app --no-install
~~~

## Templates

### minimal

The default template is `minimal`.

It includes:

- Hono server entry
- Blokd Vite plugin
- file-based routes
- root layout
- custom 404 page
- custom error page
- client entry for resumable islands
- one resumable island example
- one static route

Project structure:

~~~txt
my-app/
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

## Generated project commands

Inside the generated project:

~~~sh
pnpm dev
~~~

Starts the development server.

~~~sh
pnpm build
~~~

Builds the project.

~~~sh
pnpm typecheck
~~~

Runs TypeScript without emitting files.

## Generated project dependencies

The generated minimal starter includes:

~~~json
{
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

`blokd` is installed from the beta dist-tag because Blokd is currently in public beta.

`hono` is included as an application dependency because Blokd apps use Hono directly for APIs, middleware, routing, cookies, headers, and deployment-specific server behavior.

`vite`, `typescript`, and `@types/node` are development dependencies because the starter uses Vite and TypeScript.

## Beta status

Blokd is currently in public beta.

The beta is intended for:

- experimentation
- early adopters
- small websites
- documentation sites
- local business websites
- simple dashboards
- Hono-backed SSR applications
- form-driven applications
- progressively enhanced web apps

The beta is not yet intended for:

- large production migrations
- highly regulated applications
- applications requiring long-term API stability
- complex full-app client routing
- deep ecosystem integrations

APIs may change before a stable `1.0.0` release.

## What Blokd is optimized for

Blokd is optimized for HTML-first applications.

That means:

- server-rendered pages by default
- Web APIs instead of framework-specific request abstractions
- Hono for server composition
- file-based routing for pages
- native forms for mutations
- small client JavaScript payloads
- resumable islands for focused interactivity
- no React dependency
- no virtual DOM dependency

## What Blokd is not

Blokd is not a full replacement for every app framework.

It is not:

- a React framework
- a full Qwik-compatible resumability system
- a full client-side app router
- a batteries-included CMS framework
- a mature ecosystem equivalent to Next.js, Astro, Remix, or SvelteKit

The goal is a small, explicit, Web Platform-oriented framework.

## Minimal starter walkthrough

Available templates:

~~~txt
minimal    Balanced starter with islands, native forms, and static routes
forms      Native form actions with no client runtime
dashboard  Route-local islands plus static dashboard pages
marketing  Static marketing pages with zero client budgets
~~~

The generated app has three public pages:

~~~txt
src/routes/index.tsx  -> /
src/routes/about.tsx  -> /about
src/routes/contact.tsx -> /contact
~~~

It also has three special route files:

~~~txt
src/routes/_layout.tsx  -> root document layout
src/routes/_404.tsx     -> custom not found page
src/routes/_error.tsx   -> custom error page
~~~

The root page demonstrates:

- `signal`
- `Island`
- `resumable`

The about page demonstrates a static server-rendered page with no client interactivity.
The contact page demonstrates a native POST form action that re-renders success or validation UI without client JavaScript.

## Hono server entry

The generated app uses Hono as the server foundation:

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

Use Hono directly for:

- API routes
- middleware
- authentication
- sessions
- cookies
- headers
- webhooks
- deployment adapters

## Vite config

The generated app uses the Blokd Vite plugin:

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

The Vite plugin is responsible for:

- route manifest generation
- JSX transform
- static route analysis
- virtual route module support

## Resumable islands

The starter includes a minimal resumable island:

~~~tsx
<Island name="demo-island" state={{ text: "Hello from Blokd" }}>
  <button
    type="button"
    data-output
    onClick={on("/src/resumables/demo.ts#show")}
  >
    Run resumable handler
  </button>
</Island>
~~~

The corresponding handler is:

~~~ts
import { defineAction } from "blokd/resume";

type MessageState = {
  text: string;
};

export const show = defineAction<MessageState>(({ state, el }) => {
  el.text(state.text);
});
~~~

Blokd resumability is island-scoped. It is not full application graph serialization.

## Static route behavior

Blokd can analyze routes to determine whether they need the client entry.

A route with event handlers, signals, effects, `Island`, `on`, or `resumable` needs client behavior.

A route without client markers can be server-rendered without framework client JavaScript.

This keeps simple pages small by default.

Static starter routes also declare:

~~~ts
export const budget = {
  client: "0kb"
};
~~~

This fails the build if client behavior is accidentally added to those routes.

## Package manager behavior

`create-blokd` detects the package manager from the current npm user agent when possible.

Fallback package manager:

~~~txt
pnpm
~~~

You can override this with:

~~~sh
pnpm create blokd my-app --pm npm
pnpm create blokd my-app --pm pnpm
pnpm create blokd my-app --pm yarn
pnpm create blokd my-app --pm bun
~~~

## Installing automatically

By default, the CLI creates the project and prints next steps.

To install dependencies immediately:

~~~sh
pnpm create blokd my-app --install
~~~

To explicitly skip installation:

~~~sh
pnpm create blokd my-app --no-install
~~~

## Directory safety

`create-blokd` refuses to write into a non-empty target directory.

This prevents accidentally overwriting an existing project.

Valid project names may contain:

- letters
- numbers
- dots
- dashes
- underscores

## Publishing

This package is published as:

~~~txt
create-blokd
~~~

The command:

~~~sh
npm create blokd
~~~

resolves to the `create-blokd` package.

For beta releases, publish with:

~~~sh
npm publish --tag beta
~~~

Do not publish beta releases without the beta dist-tag.

## Related packages

Main framework package:

~~~sh
pnpm add blokd@beta hono
~~~

Create package:

~~~sh
pnpm create blokd@beta my-app
~~~

## License

MIT
