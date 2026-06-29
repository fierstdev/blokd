# create-blokd

`create-blokd` scaffolds Blokd projects.

## Usage

```sh
pnpm create blokd@beta my-app
npm create blokd@beta my-app
yarn create blokd my-app
bun create blokd my-app
```

Then:

```sh
cd my-app
pnpm install
pnpm dev
```

## Options

```txt
--template <name>       Template to use. Default: minimal
--install               Install dependencies after creating the project
--no-install            Do not install dependencies
--pm <name>             Package manager: pnpm, npm, yarn, bun
-h, --help              Show help
```

## Templates

### minimal

Balanced starter with routes, layouts, error pages, explicit resumability, native forms, and static pages.

```sh
pnpm create blokd@beta my-app --template minimal
```

### forms

Native form actions and server-rendered validation without a required client runtime.

```sh
pnpm create blokd@beta my-app --template forms
```

### dashboard

Route-local islands plus static dashboard pages.

```sh
pnpm create blokd@beta my-app --template dashboard
```

### marketing

Static marketing pages with zero client budgets.

```sh
pnpm create blokd@beta my-app --template marketing
```

## Generated Commands

```sh
pnpm dev
pnpm build
pnpm typecheck
```

The templates pin `blokd` to `0.4.0-beta.0` so generated apps match this documentation snapshot.

## Project Name Rules

Project names may contain letters, numbers, dots, dashes, and underscores. The generated package name is lowercased and sanitized.
