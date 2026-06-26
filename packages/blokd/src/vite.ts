import { transformAsync, type PluginObj } from '@babel/core';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';

export type BlokdPluginOptions = {
  routesDir?: string;
  extensions?: string[];
  /** Throw when two files map to the same URL path. Enabled by default. */
  strictRoutes?: boolean;
  /** Infer whether a route needs the client entry. Enabled by default. */
  analyzeClient?: boolean;
};

const VIRTUAL_ROUTES = 'virtual:blokd/routes';
const RESOLVED_VIRTUAL_ROUTES = '\0' + VIRTUAL_ROUTES;

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
  const base = file.split(/[\\/]/).pop() ?? '';
  return base.startsWith('_layout.') || base.startsWith('_error.') || base.startsWith('_404.');
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
  /\bIsland\s*[({<]/,
  /\bresumable\s*\(/,
  /\bstartResumability\s*\(/
];

function fileNeedsClient(file: string, extensions: string[], visited = new Set<string>()): boolean {
  const normalized = resolve(file);
  if (visited.has(normalized) || !existsSync(normalized)) return false;
  visited.add(normalized);
  let source = '';
  try { source = readFileSync(normalized, 'utf8'); }
  catch { return false; }
  if (importsBlokdClient(source)) return true;
  const markerSource = stripCommentsAndStrings(source);
  if (clientMarkers.some(marker => marker.test(markerSource))) return true;

  const dir = dirname(normalized);
  const imports = source.matchAll(/(?:import|export)\s+(?:[^'"]*from\s+)?['"](\.\.?\/[^'"]+)['"]/g);
  for (const match of imports) {
    const target = resolveImport(dir, match[1]!, extensions);
    if (target && fileNeedsClient(target, extensions, visited)) return true;
  }
  return false;
}

function importsBlokdClient(source: string): boolean {
  return /^\s*import\s+[^'"]*from\s+['"]blokd\/client['"]/m.test(source)
    || /^\s*import\s+['"]blokd\/client['"]/m.test(source)
    || /^\s*export\s+[^'"]*from\s+['"]blokd\/client['"]/m.test(source);
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

export function makeManifestCode(root: string, routesDir: string, extensions = ['.tsx', '.jsx', '.ts', '.js'], strictRoutes = true, analyzeClient = true): string {
  const files = walkRoutes(routesDir, extensions)
    .filter(file => !isPrivateRouteFile(file))
    .sort((a, b) => fileToRoutePath(routesDir, a).localeCompare(fileToRoutePath(routesDir, b)));

  if (strictRoutes) assertNoDuplicateRoutes(routesDir, files);

  const entries = files.map(file => {
    const id = slash(relative(routesDir, file)).replace(new RegExp(`${extname(file)}$`), '');
    const path = fileToRoutePath(routesDir, file);
    const layoutsForRoute = layoutFilesFor(routesDir, file, extensions);
    const layouts = layoutsForRoute
      .map(layout => `() => import(${JSON.stringify(importPath(root, layout))})`)
      .join(', ');
    const error = nearestSpecialFile(routesDir, file, '_error', extensions);
    const notFound = nearestSpecialFile(routesDir, file, '_404', extensions);
    const hasClient = analyzeClient
      ? [file, ...layoutsForRoute].some(candidate => fileNeedsClient(candidate, extensions))
      : true;
    const fields = [
      `id: ${JSON.stringify(id)}`,
      `path: ${JSON.stringify(path)}`,
      `hasClient: ${hasClient}`,
      `layouts: [${layouts}]`,
      error ? `error: () => import(${JSON.stringify(importPath(root, error))})` : '',
      notFound ? `notFound: () => import(${JSON.stringify(importPath(root, notFound))})` : '',
      `module: () => import(${JSON.stringify(importPath(root, file))})`
    ].filter(Boolean).join(', ');
    return `  { ${fields} }`;
  });

  return `const routes = [\n${entries.join(',\n')}\n];\nexport default routes;\n`;
}

function jsxTransformPlugin(api: any): PluginObj {
  const t = api.types;
  return {
    visitor: {
      JSXElement(path: any, state: any) {
        state.used = true;
        path.replaceWith(buildElement(path.node, t));
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
            t.importSpecifier(t.identifier('_bd_lazy'), t.identifier('lazy'))
          ], t.stringLiteral('blokd/jsx-runtime')));
        }
      }
    }
  };
}

function buildElement(node: any, t: any): any {
  const children = buildChildren(node.children, t);
  const props = buildProps(node.openingElement.attributes, children, t);
  return t.callExpression(t.identifier('_bd_jsx'), [jsxNameToExpr(node.openingElement.name, t), props]);
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

export function blokd(options: BlokdPluginOptions = {}): Plugin {
  let root = process.cwd();
  let routesDir = resolve(root, options.routesDir ?? 'src/routes');
  const extensions = options.extensions ?? ['.tsx', '.jsx', '.ts', '.js'];

  function invalidateRoutes(server: ViteDevServer): void {
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ROUTES);
    if (mod) server.moduleGraph.invalidateModule(mod);
    server.ws.send({ type: 'full-reload' });
  }

  return {
    name: 'blokd',
    enforce: 'pre',
    configResolved(config: any) {
      root = config.root;
      routesDir = resolve(root, options.routesDir ?? 'src/routes');
    },
    configureServer(server: ViteDevServer) {
      server.watcher.add(routesDir);
      server.watcher.on('add', (file: string) => { if (file.startsWith(routesDir)) invalidateRoutes(server); });
      server.watcher.on('unlink', (file: string) => { if (file.startsWith(routesDir)) invalidateRoutes(server); });
    },
    resolveId(id: string) {
      if (id === VIRTUAL_ROUTES) return RESOLVED_VIRTUAL_ROUTES;
      return null;
    },
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_ROUTES) return makeManifestCode(root, routesDir, extensions, options.strictRoutes ?? true, options.analyzeClient ?? true);
      return null;
    },
    async transform(code: string, id: string) {
      if (!/\.[cm]?[jt]sx$/.test(id) || !code.includes('<')) return null;
      const result = await transformAsync(code, {
        filename: id,
        sourceMaps: true,
        babelrc: false,
        configFile: false,
        parserOpts: { sourceType: 'module', plugins: ['typescript', 'jsx', 'importMeta', 'topLevelAwait'] },
        generatorOpts: { jsescOption: { minimal: true } },
        plugins: [jsxTransformPlugin]
      });
      if (!result?.code) return null;
      return { code: result.code, map: result.map as any };
    }
  };
}

export default blokd;
