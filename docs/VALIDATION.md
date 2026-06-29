# Validation

This repository is designed for validation with pnpm after dependencies are installed.

## Full beta validation commands

```sh
corepack enable
pnpm install
pnpm check
pnpm build:restaurant
pnpm smoke:restaurant
pnpm build:site
pnpm smoke:site
pnpm smoke:adapters
pnpm test:browser
pnpm pack:dry-run
```

## What each command proves

- `pnpm check`: framework build, Vitest suite, package verification, and size budgets.
- `pnpm build:restaurant`: client and server Vite builds for the restaurant example.
- `pnpm smoke:restaurant`: verifies the built restaurant output exists and that browser bundles do not contain Node/Babel server/build code.
- `pnpm build:site`: client and Worker Vite builds for the `blokd.dev` Cloudflare Workers example.
- `pnpm smoke:site`: imports the built Worker, probes docs routes, verifies static routes omit client scripts, and serves compiled Tailwind/daisyUI CSS through the assets binding.
- `pnpm smoke:adapters`: probes built Node/Hono, standard Fetch-style, and Cloudflare Workers-style request handling without starting a server process.
- `pnpm test:browser`: Playwright integration test for resumable islands and static-route no-client-script behavior.
- `pnpm pack:dry-run`: builds, packs, installs into a fresh external app, verifies package exports, runs TypeScript, and runs Vite client/server builds.

## Required release validation

Run the full commands in a clean machine with real network access and installed dependencies:

```sh
pnpm install
pnpm check
pnpm build:restaurant
pnpm smoke:restaurant
pnpm build:site
pnpm smoke:site
pnpm smoke:adapters
pnpm test:browser
pnpm pack:dry-run
```

Record the exact command output in the release notes before publishing.
