import { runWithEffectsDisabled } from './core.js';
import { isLazy, type Renderable, type VElement, type VFragment, type Dynamic, type VTemplate } from './jsx-runtime.js';
import { eventAttributeName, isResumableHandler } from './resume.js';

export type MetaDescriptor = {
  title?: string;
  description?: string;
  htmlAttrs?: Record<string, string | number | bigint | boolean | null | undefined>;
  bodyAttrs?: Record<string, string | number | bigint | boolean | null | undefined>;
  meta?: Array<Record<string, string | number | boolean>>;
  links?: Array<Record<string, string | number | boolean>>;
  scripts?: Array<Record<string, string | number | boolean>>;
};

export type ResponseLike = Response | Renderable | string | number | bigint | boolean | null | undefined;

export type RenderDocumentOptions = {
  body: Renderable | (() => Renderable);
  data?: unknown;
  meta?: MetaDescriptor;
  status?: number;
  headers?: HeadersInit;
  entryClient?: string;
};

export class HttpError extends Error {
  readonly response: Response;
  constructor(response: Response) {
    super(`${response.status} ${response.statusText}`.trim());
    this.name = 'HttpError';
    this.response = response;
  }
}

export class Redirect extends HttpError {
  constructor(location: string, status = 302) {
    validateRedirect(location, status);
    super(new Response(null, { status, headers: { location } }));
    this.name = 'Redirect';
  }
}

export function redirect(location: string, status = 302): never {
  throw new Redirect(location, status);
}

export function notFound(message = 'Not Found'): never {
  throw new HttpError(new Response(message, { status: 404, statusText: 'Not Found' }));
}

export function httpError(status: number, message?: string, init?: ResponseInit): never {
  if (!Number.isInteger(status) || status < 400 || status > 599) throw new Error(`httpError() requires a 4xx or 5xx status. Received ${status}.`);
  throw new HttpError(new Response(message ?? defaultStatusText(status), { ...init, status }));
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data) ?? 'null', { ...init, headers });
}

export function html(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(body, { ...init, headers });
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function safeJsonScript(data: unknown): string {
  return (JSON.stringify(data) ?? 'null')
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function renderToString(input: Renderable | (() => Renderable)): string {
  return runWithEffectsDisabled(() => renderValue(typeof input === 'function' ? (input as () => Renderable)() : input));
}

function renderValue(value: Renderable): string {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return escapeHtml(value);
  if (isLazy(value)) return renderDynamicValue(value.fn() as Renderable);
  if (typeof Node !== 'undefined' && value instanceof Node) return escapeHtml(value.textContent ?? '');
  if (typeof value === 'object' && value && 'kind' in value) {
    const kind = (value as { kind: string }).kind;
    if (kind === 'element') return renderElement(value as VElement);
    if (kind === 'fragment') return renderFragment(value as VFragment);
    if (kind === 'dynamic') return renderDynamicValue((value as Dynamic).fn() as Renderable);
    if (kind === 'template') return (value as VTemplate).html;
  }
  return escapeHtml(String(value));
}

function renderDynamicValue(value: Renderable): string {
  return `<!--bd-->${renderValue(value)}<!--/bd-->`;
}

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const rawTextElements = new Set(['script', 'style']);
const blockedAttrs = new Set(['innerHTML', 'outerHTML']);

function renderElement(element: VElement): string {
  const attrs = renderAttrs(element.props);
  if (voidElements.has(element.tag)) return `<${element.tag}${attrs}>`;
  const children = rawTextElements.has(element.tag)
    ? element.children.map(child => child == null ? '' : String(resolveOnce(child))).join('')
    : element.children.map(renderValue).join('');
  return `<${element.tag}${attrs}>${children}</${element.tag}>`;
}

function renderFragment(fragment: VFragment): string {
  return fragment.children.map(renderValue).join('');
}

function resolveOnce(value: Renderable): unknown {
  if (isLazy(value)) return value.fn();
  return value;
}

function renderAttrs(props: Record<string, unknown>): string {
  let out = '';
  const explicitClass = props.class ?? props.className;
  const classList = props.classList;
  const classListValue = classList && typeof classList === 'object'
    ? Object.entries(classList as Record<string, unknown>)
      .filter(([, v]) => Boolean(isLazy(v) ? v.fn() : v))
      .map(([k]) => k)
      .join(' ')
    : '';

  for (const [rawName, rawValue] of Object.entries(props)) {
    if (rawName === 'children' || rawName === 'ref' || rawName === 'classList') continue;
    if (blockedAttrs.has(rawName)) throw new Error(`Blokd blocks ${rawName} during SSR. Use text children or an explicit sanitization boundary.`);
    const eventMatch = /^on([A-Z].*|[a-z].*)$/.exec(rawName);
    if (eventMatch) {
      const value = isLazy(rawValue) ? rawValue.fn() : rawValue;
      if (isResumableHandler(value)) out += ` ${eventAttributeName(eventMatch[1]!.toLowerCase())}="${escapeHtml(value.ref)}"`;
      continue;
    }
    const name = rawName === 'className' ? 'class' : rawName;
    let value = isLazy(rawValue) ? rawValue.fn() : rawValue;
    if (name === 'class' && classListValue) value = [value, classListValue].filter(Boolean).join(' ');
    if (value === false || value === null || value === undefined) continue;
    if (value === true) {
      out += ` ${escapeHtml(name)}`;
      continue;
    }
    if (name === 'style' && value && typeof value === 'object') {
      const style = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== false)
        .map(([k, v]) => `${k}:${String(isLazy(v) ? v.fn() : v)}`)
        .join(';');
      if (style) out += ` style="${escapeHtml(style)}"`;
      continue;
    }
    out += ` ${escapeHtml(name)}="${escapeHtml(value)}"`;
  }

  if (classListValue && explicitClass === undefined) out += ` class="${escapeHtml(classListValue)}"`;
  return out;
}

export function renderDocument(options: RenderDocumentOptions): Response {
  const init = documentResponseInit(options);
  return html(renderDocumentChunks(options).join(''), init);
}

export function renderDocumentToStream(options: RenderDocumentOptions): Response {
  const init = documentResponseInit(options);
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'text/html; charset=utf-8');
  const encoder = new TextEncoder();
  const chunks = renderDocumentChunks(options);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    }
  });
  return new Response(body, { ...init, headers });
}

function documentResponseInit(options: RenderDocumentOptions): ResponseInit {
  const init: ResponseInit = { status: options.status ?? 200 };
  if (options.headers !== undefined) init.headers = options.headers;
  return init;
}

function renderDocumentChunks(options: RenderDocumentOptions): string[] {
  const meta = options.meta ?? {};
  const htmlAttrs = attrsToString(meta.htmlAttrs ?? { lang: 'en' });
  const bodyAttrs = attrsToString(meta.bodyAttrs ?? {});
  const data = options.data === undefined ? '' : `<script id="__BLOKD_DATA__" type="application/json">${safeJsonScript(options.data)}</script>`;
  const client = options.entryClient ? `<script type="module" src="${escapeHtml(options.entryClient)}"></script>` : '';
  return [
    `<!doctype html><html${htmlAttrs}><head>`,
    renderHead(meta),
    `</head><body${bodyAttrs}>`,
    renderToString(options.body),
    data,
    client,
    '</body></html>'
  ];
}

export function renderHead(meta: MetaDescriptor): string {
  const pieces: string[] = ['<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">'];
  if (meta.title) pieces.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (meta.description) pieces.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  for (const item of meta.meta ?? []) pieces.push(`<meta${attrsToString(item)}>`);
  for (const item of meta.links ?? []) pieces.push(`<link${attrsToString(item)}>`);
  for (const item of meta.scripts ?? []) pieces.push(`<script${attrsToString(item)}></script>`);
  return pieces.join('');
}

export function mergeMeta(...metas: Array<MetaDescriptor | null | undefined>): MetaDescriptor {
  const out: MetaDescriptor = { htmlAttrs: {}, bodyAttrs: {}, meta: [], links: [], scripts: [] };
  for (const meta of metas) {
    if (!meta) continue;
    if (meta.title !== undefined) out.title = meta.title;
    if (meta.description !== undefined) out.description = meta.description;
    out.htmlAttrs = { ...(out.htmlAttrs ?? {}), ...(meta.htmlAttrs ?? {}) };
    out.bodyAttrs = { ...(out.bodyAttrs ?? {}), ...(meta.bodyAttrs ?? {}) };
    out.meta = [...(out.meta ?? []), ...(meta.meta ?? [])];
    out.links = [...(out.links ?? []), ...(meta.links ?? [])];
    out.scripts = [...(out.scripts ?? []), ...(meta.scripts ?? [])];
  }
  return out;
}

export function attrsToString(attrs: Record<string, string | number | bigint | boolean | null | undefined>): string {
  let out = '';
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (value === true) out += ` ${escapeHtml(name)}`;
    else out += ` ${escapeHtml(name)}="${escapeHtml(value)}"`;
  }
  return out;
}

function validateRedirect(location: string, status: number): void {
  if (!/^(301|302|303|307|308)$/.test(String(status))) throw new Error(`redirect() status must be one of 301, 302, 303, 307, or 308. Received ${status}.`);
  if (/\r|\n/.test(location)) throw new Error('redirect() location must not contain CR or LF characters.');
}

function defaultStatusText(status: number): string {
  const map: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Content',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return map[status] ?? 'Error';
}
