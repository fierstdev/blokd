#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageRoot = resolve(__dirname, "..");
const templatesRoot = join(packageRoot, "templates");

const args = process.argv.slice(2);

const help = `
create-blokd

Usage:
  npm create blokd@beta my-app
  pnpm create blokd my-app
  yarn create blokd my-app

Options:
  --template <name>       Template to use. Default: minimal
  --install               Install dependencies after creating the project
  --no-install            Do not install dependencies
  --pm <name>             Package manager: pnpm, npm, yarn, bun
  -h, --help              Show help

Examples:
  pnpm create blokd my-app
  pnpm create blokd my-app --template minimal
  pnpm create blokd my-app --install
`;

function main() {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(help.trim());
    process.exit(0);
  }

  const parsed = parseArgs(args);

  if (!parsed.name) {
    console.error("Missing project name.");
    console.error("");
    console.error("Usage:");
    console.error("  pnpm create blokd my-app");
    process.exit(1);
  }

  const templateName = parsed.template ?? "minimal";
  const templateDir = join(templatesRoot, templateName);

  if (!existsSync(templateDir)) {
    console.error(`Unknown template: ${templateName}`);
    console.error("");
    console.error("Available templates:");
    for (const name of listTemplates()) {
      console.error(`  - ${name}`);
    }
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), parsed.name);

  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    console.error(`Target directory is not empty: ${targetDir}`);
    process.exit(1);
  }

  mkdirSync(targetDir, { recursive: true });
  copyDirectory(templateDir, targetDir);

  updatePackageName(join(targetDir, "package.json"), parsed.name);

  console.log("");
  console.log(`Created ${parsed.name} with the ${templateName} template.`);
  console.log("");

  const packageManager = parsed.pm || detectPackageManager();

  if (parsed.install) {
    console.log(`Installing dependencies with ${packageManager}...`);
    const result = spawnSync(packageManager, ["install"], {
      cwd: targetDir,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    if (result.status !== 0) {
      console.error("");
      console.error("Dependency installation failed.");
      console.error(`Run manually: cd ${parsed.name} && ${packageManager} install`);
      process.exit(result.status ?? 1);
    }

    console.log("");
    console.log("Done.");
    console.log("");
    console.log(`Next steps:`);
    console.log(`  cd ${parsed.name}`);
    console.log(`  ${packageManager} dev`);
    return;
  }

  console.log("Next steps:");
  console.log(`  cd ${parsed.name}`);
  console.log(`  ${packageManager} install`);
  console.log(`  ${packageManager} dev`);
}

function parseArgs(argv) {
  const parsed = {
    name: "",
    template: "minimal",
    install: false,
    pm: undefined
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--template") {
      parsed.template = argv[++i];
      continue;
    }

    if (arg.startsWith("--template=")) {
      parsed.template = arg.slice("--template=".length);
      continue;
    }

    if (arg === "--install") {
      parsed.install = true;
      continue;
    }

    if (arg === "--no-install") {
      parsed.install = false;
      continue;
    }

    if (arg === "--pm") {
      parsed.pm = argv[++i];
      continue;
    }

    if (arg.startsWith("--pm=")) {
      parsed.pm = arg.slice("--pm=".length);
      continue;
    }

    if (!arg.startsWith("-") && !parsed.name) {
      parsed.name = arg;
      continue;
    }
  }

  if (!parsed.name) parsed.name = "my-blokd-app";

  validateProjectName(parsed.name);

  if (parsed.pm && !["pnpm", "npm", "yarn", "bun"].includes(parsed.pm)) {
    console.error(`Unsupported package manager: ${parsed.pm}`);
    process.exit(1);
  }

  return parsed;
}

function validateProjectName(name) {
  if (name === "." || name === "./") return;

  const base = name.split(/[\\/]/).filter(Boolean).pop() ?? name;

  if (!/^[a-zA-Z0-9._-]+$/.test(base)) {
    console.error(`Invalid project name: ${name}`);
    console.error("Use letters, numbers, dots, dashes, or underscores.");
    process.exit(1);
  }
}

function detectPackageManager() {
  const ua = process.env.npm_config_user_agent ?? "";

  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  if (ua.startsWith("npm")) return "npm";

  return "pnpm";
}

function listTemplates() {
  if (!existsSync(templatesRoot)) return [];
  return readdirSync(templatesRoot).filter(name => {
    const full = join(templatesRoot, name);
    return statSync(full).isDirectory();
  });
}

function copyDirectory(from, to) {
  mkdirSync(to, { recursive: true });

  for (const entry of readdirSync(from)) {
    const source = join(from, entry);
    const target = join(to, entry);

    const stat = statSync(source);

    if (stat.isDirectory()) {
      copyDirectory(source, target);
      continue;
    }

    const content = readFileSync(source);
    writeFileSync(target, content);
  }
}

function updatePackageName(packageJsonPath, projectName) {
  if (!existsSync(packageJsonPath)) return;

  const json = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const baseName = projectName.split(/[\\/]/).filter(Boolean).pop() ?? projectName;

  json.name = sanitizePackageName(baseName);

  writeFileSync(packageJsonPath, `${JSON.stringify(json, null, 2)}\n`);
}

function sanitizePackageName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^[._-]+/, "")
    .replace(/[._-]+$/, "") || "my-blokd-app";
}

main();