import { transformAsync, type PluginObj } from '@babel/core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

export type BlokdVitePlugin = {
  name: string;
  enforce?: 'pre' | 'post';
  config?: (config: any, env: any) => any;
  configResolved?: (config: any) => void | Promise<void>;
  configureServer?: (server: BlokdViteDevServer) => void | Promise<void>;
  resolveId?: (
    id: string,
    importer?: string,
    options?: any
  ) => string | null | undefined | Promise<string | null | undefined>;
  load?: (
    id: string,
    options?: any
  ) => string | null | undefined | Promise<string | null | undefined>;
  transform?: (
    code: string,
    id: string,
    options?: any
  ) =>
    | string
    | null
    | undefined
    | {
        code: string;
        map?: any;
      }
    | Promise<
        | string
        | null
        | undefined
        | {
            code: string;
            map?: any;
          }
      >;
};

export type BlokdViteDevServer = {
  moduleGraph: {
    getModuleById(id: string): any;
    invalidateModule(mod: any): void;
  };
  watcher: {
    add(path: string): void;
    on(event: 'add' | 'unlink', listener: (file: string) => void): void;
  };
  ws: {
    send(payload: { type: string; [key: string]: unknown }): void;
  };
};

export type BlokdPluginOptions = {
  routesDir?: string;
  extensions?: string[];
  /**
   * Browser client entry emitted by createPages when a matched route needs client behavior.
   * This is not injected by the Vite plugin directly; app server code should pass the same
   * value to createPages({ entryClient }).
   *
   * Default: "/src/entry-client.ts"
   */
  clientEntry?: string;
  /** Throw when two files map to the same URL path. Enabled by default. */
  strictRoutes?: boolean;
  /** Infer whether a route needs the client entry. Enabled by default. */
  analyzeClient?: boolean;
  /**
   * Per-route client runtime budgets, for example { "/": "3kb", "/about": "0kb" }.
   * Route-level `export const budget = { client: "0kb" }` takes precedence.
   */
  budgets?: Record<string, string>;
  /** Client build output directory used for byte budget checks. Default: "dist/client". */
  clientOutDir?: string;
  /**
   * Emit deterministic route-local client entries for compiler-assisted island routes.
   * Enabled by default. The client build should use stable entry file names such as
   * assets/[name].js for these URLs to match the server manifest.
   */
  routeClientEntries?: boolean;
  /** Public URL prefix for generated route-local client entries. Default: "/assets/". */
  routeClientEntryBase?: string;
};

export type RouteRuntimeCategory = 'none' | 'islands' | 'client';

export type RouteRuntimeInfo = {
  id: string;
  path: string;
  file: string;
  hasClient: boolean;
  runtime: RouteRuntimeCategory;
  islands: string[];
  refs: string[];
  declaredRuntime: string | null;
  clientBudget: string | null;
  clientEntry: string | null;
};

export type RouteBudgetResult = {
  route: RouteRuntimeInfo;
  budget: string;
  limit: number;
  actual: number;
};

const VIRTUAL_ROUTES = 'virtual:blokd/routes';
const RESOLVED_VIRTUAL_ROUTES = '\0' + VIRTUAL_ROUTES;
const VIRTUAL_ISLANDS = 'virtual:blokd/islands';
const RESOLVED_VIRTUAL_ISLANDS = '\0' + VIRTUAL_ISLANDS;
const VIRTUAL_ROUTE_ISLANDS_PREFIX = 'virtual:blokd/islands/';
const RESOLVED_VIRTUAL_ROUTE_ISLANDS_PREFIX = '\0' + VIRTUAL_ROUTE_ISLANDS_PREFIX;

export function slash(path: string): string {
  return path.replaceAll('\\', '/');
}

export function walkRoutes(dir: string, extensions: string[], files: string[] = []): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkRoutes(full, extensions, files);
    else if (extensions.includes(extname(entry))) files.push(full);
  }
  return files;
}

export function segmentToPath(segment: string): string {
  if (segment === 'index') return '';
  if (/^\(.+\)$/.test(segment)) return '';
  const rest = segment.match(/^\[\.\.\.(.+)\]$/);
  if (rest) return `:${rest[1]}*`;
  const dyn = segment.match(/^\[(.+)\]$/);
  if (dyn) return `:${dyn[1]}`;
  return segment;
}

export function fileToRoutePath(routesDir: string, file: string): string {
  const rel = slash(relative(routesDir, file));
  const noExt = rel.slice(0, -extname(rel).length);
  const segments = noExt.split('/').filter(Boolean).map(segmentToPath).filter(Boolean);
  return '/' + segments.join('/');
}

export function assertNoDuplicateRoutes(routesDir: string, files: string[]): void {
  const seen = new Map<string, string>();
  for (const file of files) {
    const route = fileToRoutePath(routesDir, file);
    const previous = seen.get(route);
    if (previous) throw new Error(`Duplicate Blokd route path ${route}: ${previous} and ${file}`);
    seen.set(route, file);
  }
}

function findSpecialFile(currentDir: string, name: '_layout' | '_error' | '_404', extensions: string[]): string | null {
  for (const ext of extensions) {
    const candidate = join(currentDir, `${name}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function findLayout(currentDir: string, extensions: string[]): string | null {
  return findSpecialFile(currentDir, '_layout', extensions);
}

export function layoutFilesFor(routesDir: string, file: string, extensions: string[]): string[] {
  const layouts: string[] = [];
  let current = dirname(file);
  while (current.startsWith(routesDir)) {
    const layout = findLayout(current, extensions);
    if (layout) layouts.push(layout);
    if (current === routesDir) break;
    current = dirname(current);
  }
  return layouts.reverse();
}

export function nearestSpecialFile(routesDir: string, file: string, name: '_error' | '_404', extensions: string[]): string | null {
  let current = dirname(file);
  while (current.startsWith(routesDir)) {
    const found = findSpecialFile(current, name, extensions);
    if (found) return found;
    if (current === routesDir) break;
    current = dirname(current);
  }
  return null;
}

function isPrivateRouteFile(file: string): boolean {
  const parts = slash(file).split('/');
  return parts.some(part => part.startsWith('_'));
}

function importPath(root: string, file: string): string {
  return '/' + slash(relative(root, file));
}

const clientMarkers = [
  /\bon[A-Z][A-Za-z0-9_]*\s*=/,
  /\bon[a-z][A-Za-z0-9_]*\s*=/,
  /\bsignal\s*\(/,
  /\bmemo\s*\(/,
  /\beffect\s*\(/,
  /\bcleanup\s*\(/,
  /\bIsland\b/,
  /\bresumable\s*\(/,
  /\bon\s*\(/,
  /\bisland\s*\(/,
  /\bclientComponent\s*\(/,
  /\bstartResumability\s*\(/
];

type ClientAnalysis = {
  hasClient: boolean;
  islands: Set<string>;
  refs: Set<string>;
  hasIslands: boolean;
  hasNonIslandClient: boolean;
};

type IslandExport = {
  file: string;
  name: string;
};

type IslandExportScan = {
  exports: IslandExport[];
  visited: Set<string>;
};

function createClientAnalysis(): ClientAnalysis {
  return {
    hasClient: false,
    islands: new Set(),
    refs: new Set(),
    hasIslands: false,
    hasNonIslandClient: false
  };
}

function mergeClientAnalysis(target: ClientAnalysis, source: ClientAnalysis): void {
  target.hasClient ||= source.hasClient;
  target.hasIslands ||= source.hasIslands;
  target.hasNonIslandClient ||= source.hasNonIslandClient;
  for (const island of source.islands) target.islands.add(island);
  for (const ref of source.refs) target.refs.add(ref);
}

function analyzeClientFile(file: string, extensions: string[], visited = new Set<string>()): ClientAnalysis {
  const analysis = createClientAnalysis();
  const normalized = resolve(file);
  if (visited.has(normalized) || !existsSync(normalized)) return analysis;
  visited.add(normalized);
  let source = '';
  try { source = readFileSync(normalized, 'utf8'); }
  catch { return analysis; }

  if (importsBlokdClient(source)) {
    analysis.hasClient = true;
    analysis.hasNonIslandClient = true;
  }

  const markerSource = stripCommentsAndStrings(source);
  if (clientMarkers.some(marker => marker.test(markerSource))) {
    analysis.hasClient = true;
    collectClientMetadata(source, markerSource, analysis);
  }

  const dir = dirname(normalized);
  const imports = source.matchAll(/(?:import|export)\s+(?:[^'"]*from\s+)?['"](\.\.?\/[^'"]+)['"]/g);
  for (const match of imports) {
    const target = resolveImport(dir, match[1]!, extensions);
    if (target) mergeClientAnalysis(analysis, analyzeClientFile(target, extensions, visited));
  }
  return analysis;
}

function fileNeedsClient(file: string, extensions: string[], visited = new Set<string>()): boolean {
  return analyzeClientFile(file, extensions, visited).hasClient;
}

function collectClientMetadata(source: string, markerSource: string, analysis: ClientAnalysis): void {
  if (/\bIsland\b/.test(markerSource)) {
    analysis.hasIslands = true;
    for (const match of source.matchAll(/<Island\b[^>]*\bname\s*=\s*(?:"([^"]+)"|'([^']+)'|\{\s*["']([^"']+)["']\s*\})/g)) {
      analysis.islands.add(match[1] ?? match[2] ?? match[3] ?? 'unknown');
    }
    for (const match of source.matchAll(/\bIsland\s*\(\s*\{[^}]*\bname\s*:\s*["']([^"']+)["']/g)) {
      analysis.islands.add(match[1]!);
    }
  }

  for (const match of source.matchAll(/\b(?:resumable|on)\s*\(\s*["']([^"']+)["']/g)) {
    analysis.refs.add(match[1]!);
  }

  const hasNonIslandMarker = [
    /\bon[A-Za-z0-9_]*\s*=\s*\{\s*(?!(?:on|resumable)\s*\()/,
    /\bsignal\s*\(/,
    /\bmemo\s*\(/,
    /\beffect\s*\(/,
    /\bcleanup\s*\(/,
    /\bclientComponent\s*\(/,
    /\bstartResumability\s*\(/
  ].some(marker => marker.test(markerSource));
  if (hasNonIslandMarker) analysis.hasNonIslandClient = true;
}

function importsBlokdClient(source: string): boolean {
  return /^\s*import\s+[^'"]*from\s+['"]blokd\/client['"]/m.test(source)
    || /^\s*import\s+['"]blokd\/client['"]/m.test(source)
    || /^\s*export\s+[^'"]*from\s+['"]blokd\/client['"]/m.test(source);
}

function isIslandFile(file: string): boolean {
  return /(^|[\\/])islands?[\\/]/.test(file) || /(^|[\\/]).+\.island\.[cm]?[jt]sx?$/.test(file);
}

function assertIslandFileSafe(file: string, source: string): void {
  if (!isIslandFile(file) || !/\bisland\s*\(/.test(stripCommentsAndStrings(source))) return;
  const blocked = source.match(/^\s*import\s+[^'"]*from\s+['"](node:[^'"]+|fs|node:fs|path|node:path|blokd\/server|blokd\/hono)['"]/m);
  if (blocked) throw new Error(`Blokd island file ${file} imports server-only module "${blocked[1]}". Move server-only code outside island files.`);
}

function stripCommentsAndStrings(source: string): string {
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const char = source[i]!;
    const next = source[i + 1];

    if (char === '/' && next === '/') {
      out += '  ';
      i += 2;
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i++;
      }
      if (source[i] === '\n') out += '\n';
      continue;
    }

    if (char === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < source.length) {
        out += '  ';
        i++;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      out += ' ';
      i++;
      while (i < source.length) {
        const current = source[i]!;
        out += current === '\n' ? '\n' : ' ';
        if (current === '\\') {
          i++;
          if (i < source.length) out += source[i] === '\n' ? '\n' : ' ';
        } else if (current === quote) {
          break;
        }
        i++;
      }
      continue;
    }

    out += char;
  }
  return out;
}

function resolveImport(dir: string, specifier: string, extensions: string[]): string | null {
  const base = resolve(dir, specifier);
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const ext of extensions) {
    if (existsSync(base + ext)) return base + ext;
    const index = join(base, `index${ext}`);
    if (existsSync(index)) return index;
  }
  return null;
}

export function findIslandExports(root: string, routesDir: string, extensions = ['.tsx', '.jsx', '.ts', '.js']): IslandExport[] {
  const exports = new Map<string, IslandExport>();
  const routeFiles = walkRoutes(routesDir, extensions).filter(file => !isPrivateRouteFile(file));
  for (const file of routeFiles) {
    for (const item of findIslandExportsForFiles(root, [file, ...layoutFilesFor(routesDir, file, extensions)], extensions).exports) {
      exports.set(`${item.file}:${item.name}`, item);
    }
  }
  return sortIslandExports(root, Array.from(exports.values()));
}

function findIslandExportsForFiles(root: string, files: string[], extensions: string[]): IslandExportScan {
  const exports = new Map<string, IslandExport>();
  const visited = new Set<string>();

  const visit = (file: string): void => {
    const normalized = resolve(file);
    if (visited.has(normalized) || !existsSync(normalized)) return;
    visited.add(normalized);
    let source = '';
    try { source = readFileSync(normalized, 'utf8'); }
    catch { return; }

    if (isIslandFile(normalized) && /\bisland\s*\(/.test(stripCommentsAndStrings(source))) {
      for (const name of exportedIslandNames(source)) {
        exports.set(`${normalized}:${name}`, { file: normalized, name });
      }
    }

    const dir = dirname(normalized);
    const imports = source.matchAll(/(?:import|export)\s+(?:[^'"]*from\s+)?['"](\.\.?\/[^'"]+)['"]/g);
    for (const match of imports) {
      const target = resolveImport(dir, match[1]!, extensions);
      if (target) visit(target);
    }
  };

  for (const file of files) visit(file);
  return { exports: sortIslandExports(root, Array.from(exports.values())), visited };
}

function sortIslandExports(root: string, items: IslandExport[]): IslandExport[] {
  return items
    .sort((a, b) => importPath(root, a.file).localeCompare(importPath(root, b.file)) || a.name.localeCompare(b.name));
}

function exportedIslandNames(source: string): string[] {
  const names = new Set<string>();
  for (const match of source.matchAll(/\bexport\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*island\s*\(/g)) {
    names.add(match[1]!);
  }
  return Array.from(names);
}

export function makeIslandRegistryCode(root: string, routesDir: string, extensions = ['.tsx', '.jsx', '.ts', '.js']): string {
  return makeIslandRegistryCodeFromExports(root, findIslandExports(root, routesDir, extensions));
}

function makeIslandRegistryCodeFromExports(root: string, islands: IslandExport[]): string {
  if (islands.length === 0) return 'export const islands = [];\n';

  const imports = islands.map((item, index) => `import { ${item.name} as island${index} } from ${JSON.stringify(importPath(root, item.file))};`);
  const list = islands.map((_, index) => `island${index}`).join(', ');
  return [
    `import { startIslands } from "blokd/client";`,
    ...imports,
    `export const islands = [${list}];`,
    `export const dispose = startIslands(islands);`
  ].join('\n') + '\n';
}

function routeClientEntryName(routeId: string): string {
  const safe = routeId
    .replaceAll('\\', '/')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'index';
  return `blokd-route-${safe}`;
}

function routeClientEntryPath(routeId: string, base = '/assets/'): string {
  return `${base.endsWith('/') ? base : `${base}/`}${routeClientEntryName(routeId)}.js`;
}

function routeIslandExports(root: string, routesDir: string, file: string, extensions: string[]): IslandExport[] {
  return findIslandExportsForFiles(root, [file, ...layoutFilesFor(routesDir, file, extensions)], extensions).exports;
}

function makeRouteIslandRegistryCode(root: string, routesDir: string, routeName: string, extensions: string[]): string {
  const route = analyzeRoutes(root, routesDir, extensions).find(item => routeClientEntryName(item.id) === routeName);
  if (!route) return 'export const islands = [];\n';
  return makeIslandRegistryCodeFromExports(root, routeIslandExports(root, routesDir, route.file, extensions));
}

function routeClientInputs(root: string, routesDir: string, extensions: string[]): Record<string, string> {
  const inputs: Record<string, string> = {};
  for (const route of analyzeRoutes(root, routesDir, extensions)) {
    if (routeIslandExports(root, routesDir, route.file, extensions).length > 0) {
      inputs[routeClientEntryName(route.id)] = `${VIRTUAL_ROUTE_ISLANDS_PREFIX}${routeClientEntryName(route.id)}`;
    }
  }
  return inputs;
}

function mergeRollupInputs(existing: unknown, generated: Record<string, string>): Record<string, string> {
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) return { ...(existing as Record<string, string>), ...generated };
  if (typeof existing === 'string') return { client: existing, ...generated };
  if (Array.isArray(existing)) {
    const out: Record<string, string> = {};
    existing.forEach((value, index) => { if (typeof value === 'string') out[`input${index}`] = value; });
    return { ...out, ...generated };
  }
  return generated;
}

export function makeManifestCode(root: string, routesDir: string, extensions = ['.tsx', '.jsx', '.ts', '.js'], strictRoutes = true, analyzeClient = true): string {
  const routes = analyzeRoutes(root, routesDir, extensions, strictRoutes, analyzeClient);
  return makeManifestCodeFromRoutes(root, routesDir, routes, extensions);
}

function makeManifestCodeFromRoutes(root: string, routesDir: string, routes: RouteRuntimeInfo[], extensions: string[]): string {
  const entries = routes.map(route => {
    const layoutsForRoute = layoutFilesFor(routesDir, route.file, extensions);
    const layouts = layoutsForRoute
      .map(layout => `() => import(${JSON.stringify(importPath(root, layout))})`)
      .join(', ');
    const error = nearestSpecialFile(routesDir, route.file, '_error', extensions);
    const notFound = nearestSpecialFile(routesDir, route.file, '_404', extensions);
    const fields = [
      `id: ${JSON.stringify(route.id)}`,
      `path: ${JSON.stringify(route.path)}`,
      `hasClient: ${route.hasClient}`,
      `runtime: ${JSON.stringify(route.runtime)}`,
      `islands: ${JSON.stringify(route.islands)}`,
      `resumables: ${JSON.stringify(route.refs)}`,
      route.clientEntry ? `clientEntry: ${JSON.stringify(route.clientEntry)}` : '',
      `layouts: [${layouts}]`,
      error ? `error: () => import(${JSON.stringify(importPath(root, error))})` : '',
      notFound ? `notFound: () => import(${JSON.stringify(importPath(root, notFound))})` : '',
      `module: () => import(${JSON.stringify(importPath(root, route.file))})`
    ].filter(Boolean).join(', ');
    return `  { ${fields} }`;
  });

  return `const routes = [\n${entries.join(',\n')}\n];\nexport default routes;\n`;
}

export function analyzeRoutes(
  root: string,
  routesDir: string,
  extensions = ['.tsx', '.jsx', '.ts', '.js'],
  strictRoutes = true,
  analyzeClient = true,
  routeClientEntries = false,
  routeClientEntryBase = '/assets/'
): RouteRuntimeInfo[] {
  const files = walkRoutes(routesDir, extensions)
    .filter(file => !isPrivateRouteFile(file))
    .sort((a, b) => fileToRoutePath(routesDir, a).localeCompare(fileToRoutePath(routesDir, b)));

  if (strictRoutes) assertNoDuplicateRoutes(routesDir, files);

  return files.map(file => {
    const id = slash(relative(routesDir, file)).replace(new RegExp(`${extname(file)}$`), '');
    const path = fileToRoutePath(routesDir, file);
    const layoutsForRoute = layoutFilesFor(routesDir, file, extensions);
    const analysis = createClientAnalysis();
    if (analyzeClient) {
      for (const candidate of [file, ...layoutsForRoute]) {
        mergeClientAnalysis(analysis, analyzeClientFile(candidate, extensions));
      }
    } else {
      analysis.hasClient = true;
      analysis.hasNonIslandClient = true;
    }
    const declaredRuntime = readDeclaredRuntime(file);
    const clientBudget = readDeclaredClientBudget(file);
    const islandExports = routeIslandExports(root, routesDir, file, extensions);
    const clientEntry = islandExports.length > 0 && analyzeClient && routeClientEntries
      ? routeClientEntryPath(id, routeClientEntryBase)
      : null;
    if (declaredRuntime === 'none' && analysis.hasClient) {
      throw new Error(`Blokd route ${path} declares runtime = "none" but includes client runtime markers in ${file}.`);
    }
    const runtime: RouteRuntimeCategory = !analysis.hasClient
      ? 'none'
      : analysis.hasNonIslandClient
        ? 'client'
        : 'islands';
    return {
      id,
      path,
      file,
      hasClient: analysis.hasClient,
      runtime,
      islands: Array.from(analysis.islands).sort(),
      refs: Array.from(analysis.refs).sort(),
      declaredRuntime,
      clientBudget,
      clientEntry
    };
  });
}

function readDeclaredRuntime(file: string): string | null {
  let source = '';
  try { source = readFileSync(file, 'utf8'); }
  catch { return null; }
  const match = source.match(/\bexport\s+const\s+runtime\s*=\s*["']([^"']+)["']/);
  return match?.[1] ?? null;
}

function readDeclaredClientBudget(file: string): string | null {
  let source = '';
  try { source = readFileSync(file, 'utf8'); }
  catch { return null; }
  const match = source.match(/\bexport\s+const\s+budget\s*=\s*\{[\s\S]*?\bclient\s*:\s*["']([^"']+)["'][\s\S]*?\}/);
  return match?.[1] ?? null;
}

export function parseByteSize(value: string): number {
  const match = value.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|kib|mb|mib)?$/);
  if (!match) throw new Error(`Invalid Blokd budget size "${value}". Use bytes, kb, or mb, for example "0kb" or "30kb".`);
  const amount = Number(match[1]);
  const unit = match[2] ?? 'b';
  const multiplier = unit === 'b' ? 1 : unit === 'kb' || unit === 'kib' ? 1024 : 1024 * 1024;
  return Math.round(amount * multiplier);
}

export function measureClientOutputBytes(clientOutDir: string): number | null {
  if (!existsSync(clientOutDir)) return null;
  let total = 0;
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (/\.(js|mjs|css)$/.test(entry)) total += stat.size;
    }
  };
  walk(clientOutDir);
  return total;
}

export function validateRouteBudgets(
  routes: RouteRuntimeInfo[],
  budgets: Record<string, string> = {},
  measuredClientBytes: number | null = null
): RouteBudgetResult[] {
  const failures: RouteBudgetResult[] = [];
  for (const route of routes) {
    const budget = route.clientBudget ?? budgets[route.path];
    if (!budget) continue;
    const limit = parseByteSize(budget);
    const actual = route.hasClient ? measuredClientBytes ?? 1 : 0;
    if (actual > limit) failures.push({ route, budget, limit, actual });
  }
  if (failures.length > 0) {
    const lines = [
      'Blokd route client budget exceeded',
      ...failures.map(item => `${item.route.path}: client ${formatBytes(item.actual)} exceeds budget ${item.budget} (${formatBytes(item.limit)})`)
    ];
    throw new Error(lines.join('\n'));
  }
  return failures;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}mb`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${bytes}b`;
}

export function createRouteRuntimeReport(routes: RouteRuntimeInfo[]): string {
  const rows = routes.map(route => ({
    route: route.path,
    client: route.hasClient ? 'yes' : 'no',
    runtime: route.runtime,
    islands: route.islands.length > 0 ? route.islands.join(',') : '-'
  }));
  const widths = {
    route: Math.max('Route'.length, ...rows.map(row => row.route.length)),
    client: Math.max('Client'.length, ...rows.map(row => row.client.length)),
    runtime: Math.max('Runtime'.length, ...rows.map(row => row.runtime.length)),
    islands: Math.max('Islands'.length, ...rows.map(row => row.islands.length))
  };
  const pad = (value: string, width: number) => value.padEnd(width);
  return [
    'Blokd route runtime report',
    `${pad('Route', widths.route)}  ${pad('Client', widths.client)}  ${pad('Runtime', widths.runtime)}  ${pad('Islands', widths.islands)}`.trimEnd(),
    ...rows.map(row => `${pad(row.route, widths.route)}  ${pad(row.client, widths.client)}  ${pad(row.runtime, widths.runtime)}  ${pad(row.islands, widths.islands)}`.trimEnd())
  ].join('\n');
}

function jsxTransformPlugin(api: any): PluginObj {
  const t = api.types;
  return {
    visitor: {
      JSXElement(path: any, state: any) {
        state.used = true;
        const templateHtml = staticTemplateHtml(path.node, t);
        if (templateHtml !== null) {
          state.usedTemplate = true;
          path.replaceWith(t.callExpression(t.identifier('_bd_template'), [t.stringLiteral(templateHtml)]));
        } else {
          path.replaceWith(buildElement(path.node, t));
        }
      },
      JSXFragment(path: any, state: any) {
        state.used = true;
        path.replaceWith(buildFragment(path.node, t));
      },
      Program: {
        exit(path: any, state: any) {
          if (!state.used) return;
          path.unshiftContainer('body', t.importDeclaration([
            t.importSpecifier(t.identifier('_bd_jsx'), t.identifier('jsx')),
            t.importSpecifier(t.identifier('_bd_jsxs'), t.identifier('jsxs')),
            t.importSpecifier(t.identifier('_bd_Fragment'), t.identifier('Fragment')),
            t.importSpecifier(t.identifier('_bd_lazy'), t.identifier('lazy')),
            ...(state.usedTemplate ? [t.importSpecifier(t.identifier('_bd_template'), t.identifier('template'))] : [])
          ], t.stringLiteral('blokd/jsx-runtime')));
        }
      }
    }
  };
}

function islandNameTransformPlugin(api: any): PluginObj {
  const t = api.types;
  return {
    visitor: {
      Program(path: any, state: any) {
        const islandImports = new Set<string>();
        for (const statement of path.get('body')) {
          if (!statement.isImportDeclaration()) continue;
          const source = statement.node.source.value;
          if (source !== 'blokd' && source !== 'blokd/island') continue;
          for (const specifier of statement.node.specifiers) {
            if (!t.isImportSpecifier(specifier)) continue;
            const imported = specifier.imported;
            if ((t.isIdentifier(imported) && imported.name === 'island') || (t.isStringLiteral(imported) && imported.value === 'island')) {
              islandImports.add(specifier.local.name);
            }
          }
        }
        state.blokdIslandImports = islandImports;
      },
      VariableDeclarator(path: any, state: any) {
        const id = path.node.id;
        if (!t.isIdentifier(id)) return;
        if (!isExportedConstDeclarator(path)) return;
        const call = path.node.init;
        if (!t.isCallExpression(call)) return;
        if (!t.isIdentifier(call.callee)) return;
        if (!state.blokdIslandImports?.has(call.callee.name)) return;
        addIslandNameOption(call, id.name, t);
      }
    }
  };
}

function isExportedConstDeclarator(path: any): boolean {
  const declaration = path.parentPath;
  if (!declaration?.isVariableDeclaration?.({ kind: 'const' })) return false;
  return declaration.parentPath?.isExportNamedDeclaration?.() === true;
}

function addIslandNameOption(call: any, name: string, t: any): void {
  const options = call.arguments[1];
  if (options === undefined) {
    call.arguments.push(t.objectExpression([t.objectProperty(t.identifier('name'), t.stringLiteral(name))]));
    return;
  }
  if (!t.isObjectExpression(options)) return;
  const hasName = options.properties.some((property: any) => {
    if (!t.isObjectProperty(property)) return false;
    const key = property.key;
    return (t.isIdentifier(key) && key.name === 'name') || (t.isStringLiteral(key) && key.value === 'name');
  });
  if (!hasName) options.properties.push(t.objectProperty(t.identifier('name'), t.stringLiteral(name)));
}

function buildElement(node: any, t: any): any {
  const children = buildChildren(node.children, t);
  const props = buildProps(node.openingElement.attributes, children, t);
  return t.callExpression(t.identifier('_bd_jsx'), [jsxNameToExpr(node.openingElement.name, t), props]);
}

function staticTemplateHtml(node: any, t: any): string | null {
  if (!t.isJSXIdentifier(node.openingElement.name)) return null;
  const tag = node.openingElement.name.name;
  if (!/^[a-z][\w.-]*$/.test(tag)) return null;
  let attrs = '';
  for (const attr of node.openingElement.attributes) {
    if (t.isJSXSpreadAttribute(attr)) return null;
    const name = attrName(attr.name, t);
    if (isEventOrRef(name) || name === 'innerHTML' || name === 'outerHTML') return null;
    if (!attr.value) {
      attrs += ` ${escapeTemplateHtml(name)}`;
      continue;
    }
    if (t.isStringLiteral(attr.value)) {
      attrs += ` ${escapeTemplateHtml(name)}="${escapeTemplateHtml(attr.value.value)}"`;
      continue;
    }
    if (t.isJSXExpressionContainer(attr.value)) return null;
    return null;
  }
  if (node.openingElement.selfClosing || voidTemplateElements.has(tag)) return `<${tag}${attrs}>`;
  let children = '';
  for (const child of node.children) {
    if (t.isJSXText(child)) {
      const text = normalizeJsxText(child.value);
      if (text) children += escapeTemplateHtml(text);
      continue;
    }
    if (t.isJSXElement(child)) {
      const childHtml = staticTemplateHtml(child, t);
      if (childHtml === null) return null;
      children += childHtml;
      continue;
    }
    if (t.isJSXFragment(child)) return null;
    if (t.isJSXExpressionContainer(child)) {
      if (t.isJSXEmptyExpression(child.expression)) continue;
      return null;
    }
    return null;
  }
  return `<${tag}${attrs}>${children}</${tag}>`;
}

const voidTemplateElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function escapeTemplateHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildFragment(node: any, t: any): any {
  const children = buildChildren(node.children, t);
  return t.callExpression(t.identifier('_bd_jsx'), [t.identifier('_bd_Fragment'), buildProps([], children, t)]);
}

function jsxNameToExpr(name: any, t: any): any {
  if (t.isJSXIdentifier(name)) {
    const value = name.name;
    return /^[a-z]/.test(value) || value.includes('-') ? t.stringLiteral(value) : t.identifier(value);
  }
  if (t.isJSXMemberExpression(name)) return t.memberExpression(jsxNameToExpr(name.object, t), jsxNameToExpr(name.property, t));
  if (t.isJSXNamespacedName(name)) return t.stringLiteral(`${name.namespace.name}:${name.name.name}`);
  return t.stringLiteral('unknown');
}

function attrName(name: any, t: any): string {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXNamespacedName(name)) return `${name.namespace.name}:${name.name.name}`;
  return 'unknown';
}

function isEventOrRef(name: string): boolean {
  return /^on[A-Z]/.test(name) || /^on[a-z]/.test(name) || name === 'ref';
}

function wrapLazy(expr: any, t: any): any {
  return t.callExpression(t.identifier('_bd_lazy'), [t.arrowFunctionExpression([], expr)]);
}

function buildProps(attrs: any[], children: any | null, t: any): any {
  const props: any[] = [];
  for (const attr of attrs) {
    if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
      continue;
    }
    const name = attrName(attr.name, t);
    let value: any;
    if (!attr.value) value = t.booleanLiteral(true);
    else if (t.isStringLiteral(attr.value)) value = attr.value;
    else if (t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression;
      if (t.isJSXEmptyExpression(expr)) value = t.booleanLiteral(true);
      else if (isEventOrRef(name) || t.isFunctionExpression(expr) || t.isArrowFunctionExpression(expr)) value = expr;
      else value = wrapLazy(expr, t);
    } else value = t.stringLiteral('');
    props.push(t.objectProperty(t.stringLiteral(name), value));
  }
  if (children) props.push(t.objectProperty(t.identifier('children'), children));
  return t.objectExpression(props);
}

function buildChildren(children: any[], t: any): any | null {
  const out: any[] = [];
  for (const child of children) {
    const expr = childToExpr(child, t);
    if (expr) out.push(expr);
  }
  if (out.length === 0) return null;
  if (out.length === 1) return out[0];
  return t.arrayExpression(out);
}

function childToExpr(child: any, t: any): any | null {
  if (t.isJSXText(child)) {
    const text = normalizeJsxText(child.value);
    return text ? t.stringLiteral(text) : null;
  }
  if (t.isJSXExpressionContainer(child)) {
    const expr = child.expression;
    if (t.isJSXEmptyExpression(expr)) return null;
    if (t.isFunctionExpression(expr) || t.isArrowFunctionExpression(expr)) return expr;
    return wrapLazy(expr, t);
  }
  if (t.isJSXSpreadChild(child)) return child.expression;
  if (t.isJSXElement(child)) return buildElement(child, t);
  if (t.isJSXFragment(child)) return buildFragment(child, t);
  return null;
}

function normalizeJsxText(text: string): string {
  const lines = text.replace(/\t/g, ' ').split(/\r?\n/);
  const normalized = lines.map((line, index) => {
    let next = line.replace(/\s+/g, ' ');
    if (index === 0) next = next.replace(/^\s+/, '');
    if (index === lines.length - 1) next = next.replace(/\s+$/, '');
    return next;
  }).filter(Boolean).join(' ');
  return normalized;
}

export function blokd(options: BlokdPluginOptions = {}): BlokdVitePlugin {
  let root = process.cwd();
  let routesDir = resolve(root, options.routesDir ?? 'src/routes');
  let command: 'build' | 'serve' = 'serve';
  let clientOutDir = resolve(root, options.clientOutDir ?? 'dist/client');
  const extensions = options.extensions ?? ['.tsx', '.jsx', '.ts', '.js'];

  function invalidateRoutes(server: BlokdViteDevServer): void {
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
    if (mod) server.moduleGraph.invalidateModule(mod);
    server.ws.send({ type: 'full-reload' });
  }

  return {
    name: 'blokd',
    enforce: 'pre',
    config(config: any) {
      if (config.build?.ssr || options.routeClientEntries === false) return null;
      const configRoot = resolve(config.root ?? process.cwd());
      const configRoutesDir = resolve(configRoot, options.routesDir ?? 'src/routes');
      const inputs = routeClientInputs(configRoot, configRoutesDir, extensions);
      if (Object.keys(inputs).length === 0) return null;
      return {
        build: {
          rollupOptions: {
            input: mergeRollupInputs(config.build?.rollupOptions?.input, inputs)
          }
        }
      };
    },
    configResolved(config: any) {
      root = config.root;
      command = config.command === 'build' ? 'build' : 'serve';
      routesDir = resolve(root, options.routesDir ?? 'src/routes');
      clientOutDir = resolve(root, options.clientOutDir ?? 'dist/client');
    },
    configureServer(server: BlokdViteDevServer) {
      server.watcher.add(routesDir);
      server.watcher.on('add', (file: string) => { if (file.startsWith(routesDir)) invalidateRoutes(server); });
      server.watcher.on('unlink', (file: string) => { if (file.startsWith(routesDir)) invalidateRoutes(server); });
    },
    resolveId(id: string) {
      if (id === VIRTUAL_ROUTES) return RESOLVED_VIRTUAL_ROUTES;
      if (id === VIRTUAL_ISLANDS) return RESOLVED_VIRTUAL_ISLANDS;
      if (id.startsWith(VIRTUAL_ROUTE_ISLANDS_PREFIX)) return '\0' + id;
      return null;
    },
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_ROUTES) {
        const routes = analyzeRoutes(
          root,
          routesDir,
          extensions,
          options.strictRoutes ?? true,
          options.analyzeClient ?? true,
          options.routeClientEntries !== false,
          options.routeClientEntryBase ?? '/assets/'
        );
        if (command === 'build') {
          console.info(createRouteRuntimeReport(routes));
          validateRouteBudgets(routes, options.budgets, measureClientOutputBytes(clientOutDir));
        }
        return makeManifestCodeFromRoutes(root, routesDir, routes, extensions);
      }
      if (id === RESOLVED_VIRTUAL_ISLANDS) return makeIslandRegistryCode(root, routesDir, extensions);
      if (id.startsWith(RESOLVED_VIRTUAL_ROUTE_ISLANDS_PREFIX)) {
        return makeRouteIslandRegistryCode(root, routesDir, id.slice(RESOLVED_VIRTUAL_ROUTE_ISLANDS_PREFIX.length), extensions);
      }
      return null;
    },
    async transform(code: string, id: string) {
      assertIslandFileSafe(id, code);
      const normalizedClientEntry = resolve(root, options.clientEntry?.replace(/^\//, '') ?? 'src/entry-client.ts');
      let injectedIslands = false;
      if (resolve(id) === normalizedClientEntry && !code.includes(VIRTUAL_ISLANDS)) {
        code = `${code}\nimport ${JSON.stringify(VIRTUAL_ISLANDS)};\n`;
        injectedIslands = true;
      }
      if (!/\.[cm]?[jt]sx$/.test(id) || (!code.includes('<') && !/\bisland\s*\(/.test(code))) return injectedIslands ? { code, map: null } : null;
      const result = await transformAsync(code, {
        filename: id,
        sourceMaps: true,
        babelrc: false,
        configFile: false,
        parserOpts: { sourceType: 'module', plugins: ['typescript', 'jsx', 'importMeta', 'topLevelAwait'] },
        generatorOpts: { jsescOption: { minimal: true } },
        plugins: [islandNameTransformPlugin, jsxTransformPlugin]
      });
      if (!result?.code) return null;
      return { code: result.code, map: result.map as any };
    }
  };
}

export default blokd;
