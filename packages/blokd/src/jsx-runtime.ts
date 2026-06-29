import { cleanup, effect, getOwner, root } from './core.js';
import { eventAttributeName, isResumableHandler } from './resume.js';

export type Component<P = Record<string, unknown>> = (props: P) => Renderable;
export type Lazy<T = unknown> = { readonly __blokdLazy: true; readonly fn: () => T };
export type Props = Record<string, unknown> & { children?: unknown };

export type VElement = {
  kind: 'element';
  tag: string;
  props: Props;
  children: Renderable[];
};

export type VFragment = {
  kind: 'fragment';
  children: Renderable[];
};

export type Dynamic = {
  kind: 'dynamic';
  fn: () => unknown;
};

export type VTemplate = {
  kind: 'template';
  html: string;
};

export type Renderable =
  | Node
  | VElement
  | VFragment
  | Dynamic
  | VTemplate
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | Renderable[];

declare global {
  namespace JSX {
    type Element = Renderable;
    interface ElementChildrenAttribute { children: {}; }
    interface IntrinsicElements {
      [elemName: string]: Record<string, unknown>;
    }
  }
}

export const Fragment = Symbol.for('blokd.fragment');

export function lazy<T>(fn: () => T): Lazy<T> {
  return { __blokdLazy: true, fn };
}

export function isLazy(value: unknown): value is Lazy {
  return !!value && typeof value === 'object' && (value as Lazy).__blokdLazy === true;
}

let virtualJsxDepth = 0;

export function runWithVirtualJsx<T>(fn: () => T): T {
  virtualJsxDepth++;
  try {
    return fn();
  } finally {
    virtualJsxDepth--;
  }
}

function isBrowser(): boolean {
  return virtualJsxDepth === 0 && typeof document !== 'undefined' && typeof Node !== 'undefined';
}

type HydrationState = {
  current: Node | null;
};

let hydrationState: HydrationState | null = null;
const templateCache = new Map<string, HTMLTemplateElement>();

function isEventName(name: string): boolean {
  return /^on[A-Z]/.test(name) || /^on[a-z]/.test(name);
}

function normalizeEventName(name: string): string {
  return name.slice(2).toLowerCase();
}

function isRenderableObject(value: unknown): value is VElement | VFragment | Dynamic | VTemplate {
  return !!value && typeof value === 'object' && 'kind' in value;
}

function normalizeChildren(children: unknown): Renderable[] {
  if (children === undefined || children === null || children === false || children === true) return [];
  if (Array.isArray(children)) return children.flatMap(normalizeChildren) as Renderable[];
  return [children as Renderable];
}

function createComponentProps(raw: Props): Props {
  const out: Props = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isLazy(value)) {
      Object.defineProperty(out, key, {
        enumerable: true,
        configurable: true,
        get: () => value.fn()
      });
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function jsx(type: string | Component | typeof Fragment, props: Props | null): Renderable {
  const finalProps = props ?? {};
  if (type === Fragment) return createFragment(finalProps.children);
  if (typeof type === 'function') return type(createComponentProps(finalProps));
  if (isBrowser()) return createDomElement(type, finalProps);
  return createVNode(type, finalProps);
}

export const jsxs = jsx;
export const jsxDEV = jsx;

function createFragment(children: unknown): Renderable {
  const normalized = normalizeChildren(children);
  if (isBrowser()) {
    const fragment = document.createDocumentFragment();
    appendChildren(fragment, normalized);
    return fragment;
  }
  return { kind: 'fragment', children: normalized } satisfies VFragment;
}

function createVNode(tag: string, props: Props): VElement {
  const children = normalizeChildren(props.children);
  const elementProps: Props = { ...props };
  delete elementProps.children;
  return { kind: 'element', tag, props: elementProps, children };
}

function createDomElement(tag: string, props: Props): Element {
  const claimed = claimHydrationNode(node => node instanceof Element && node.localName.toLowerCase() === tag.toLowerCase());
  const element = claimed instanceof Element
    ? claimed
    : tag === 'svg'
      ? document.createElementNS('http://www.w3.org/2000/svg', tag)
      : document.createElement(tag);

  for (const [name, value] of Object.entries(props)) {
    if (name === 'children') continue;
    applyProp(element, name, value);
  }
  if (claimed && hydrationState) {
    const parentCursor = hydrationState.current;
    hydrationState.current = element.firstChild;
    appendChildren(element, normalizeChildren(props.children));
    removeRemainingHydrationNodes(element);
    hydrationState.current = parentCursor;
  } else {
    appendChildren(element, normalizeChildren(props.children));
  }
  return element;
}

function applyProp(element: Element, name: string, value: unknown): void {
  if (name === 'ref') {
    if (typeof value === 'function') (value as (node: Element) => void)(element);
    return;
  }
  if (name === 'className') name = 'class';
  if (name === 'classList' && value && typeof value === 'object') {
    bindClassList(element, value as Record<string, unknown>);
    return;
  }
  if (name === 'style' && value && typeof value === 'object' && !isLazy(value)) {
    bindStyle(element as HTMLElement, value as Record<string, unknown>);
    return;
  }
  if (isEventName(name)) {
    const eventName = normalizeEventName(name);
    if (isResumableHandler(value)) {
      element.setAttribute(eventAttributeName(eventName), value.ref);
      return;
    }
    if (typeof value !== 'function') return;
    element.addEventListener(eventName, value as EventListener);
    if (getOwner()) cleanup(() => element.removeEventListener(eventName, value as EventListener));
    return;
  }
  if (isLazy(value)) {
    effect(() => setDomProp(element, name, value.fn()));
    return;
  }
  setDomProp(element, name, value);
}

function bindClassList(element: Element, classList: Record<string, unknown>): void {
  for (const [className, active] of Object.entries(classList)) {
    if (isLazy(active)) effect(() => element.classList.toggle(className, Boolean(active.fn())));
    else element.classList.toggle(className, Boolean(active));
  }
}

function bindStyle(element: HTMLElement, styles: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(styles)) {
    const set = (next: unknown) => {
      if (next === null || next === undefined || next === false) element.style.removeProperty(name);
      else element.style.setProperty(name, String(next));
    };
    if (isLazy(value)) effect(() => set(value.fn()));
    else set(value);
  }
}

function setDomProp(element: Element, name: string, value: unknown): void {
  if (value === false || value === null || value === undefined) {
    element.removeAttribute(name);
    if (name in element) {
      try { (element as unknown as Record<string, unknown>)[name] = value === false ? false : ''; } catch {}
    }
    return;
  }

  if (value === true) {
    element.setAttribute(name, '');
    if (name in element) {
      try { (element as unknown as Record<string, unknown>)[name] = true; } catch {}
    }
    return;
  }

  if (name === 'innerHTML' || name === 'outerHTML') {
    throw new Error(`Blokd blocks direct ${name} assignment. Use text children or an explicit sanitization boundary.`);
  }

  if (name in element && !name.includes('-')) {
    try {
      (element as unknown as Record<string, unknown>)[name] = value;
      return;
    } catch {}
  }
  element.setAttribute(name, String(value));
}

function appendChildren(parent: Node, children: Renderable[]): void {
  for (const child of children) appendChild(parent, child);
}

function appendChild(parent: Node, child: Renderable): void {
  if (child === null || child === undefined || child === false || child === true) return;
  if (Array.isArray(child)) {
    for (const nested of child) appendChild(parent, nested);
    return;
  }
  if (isLazy(child)) {
    appendDynamic(parent, child.fn);
    return;
  }
  if (isRenderableObject(child) && child.kind === 'dynamic') {
    appendDynamic(parent, child.fn);
    return;
  }
  if (isRenderableObject(child) && child.kind === 'template') {
    appendChild(parent, createTemplateNode(child.html));
    return;
  }
  if (typeof Node !== 'undefined' && child instanceof Node) {
    if (hydrationState && child.parentNode === parent) return;
    parent.appendChild(child);
    return;
  }
  if (hydrationState) {
    const claimed = claimHydrationNode(node => node.nodeType === Node.TEXT_NODE);
    if (claimed) {
      claimed.textContent = String(child);
      return;
    }
  }
  parent.appendChild(document.createTextNode(String(child)));
}

function appendDynamic(parent: Node, fn: () => unknown): void {
  const claimed = claimHydrationMarkerRange();
  const start = claimed?.start ?? document.createComment('bd');
  const end = claimed?.end ?? document.createComment('/bd');
  if (!claimed) {
    parent.appendChild(start);
    parent.appendChild(end);
  }
  let disposers: Array<() => void> = [];

  const clear = () => {
    for (const dispose of disposers.splice(0)) dispose();
    let node = start.nextSibling;
    while (node && node !== end) {
      const next = node.nextSibling;
      node.parentNode?.removeChild(node);
      node = next;
    }
  };

  effect(() => {
    clear();
    const value = fn();
    const nodes = materialize(value as Renderable, disposers);
    for (const node of nodes) parent.insertBefore(node, end);
  });

  cleanup(clear);
}

function materialize(value: Renderable, disposers: Array<() => void>): Node[] {
  if (value === null || value === undefined || value === false || value === true) return [];
  if (Array.isArray(value)) return value.flatMap(item => materialize(item, disposers));
  if (isLazy(value)) return materialize(value.fn() as Renderable, disposers);
  if (isRenderableObject(value) && value.kind === 'dynamic') {
    const fragment = document.createDocumentFragment();
    root(dispose => {
      disposers.push(dispose);
      appendDynamic(fragment, value.fn);
    });
    return Array.from(fragment.childNodes);
  }
  if (isRenderableObject(value) && value.kind === 'template') return [createTemplateNode(value.html)];
  if (typeof Node !== 'undefined' && value instanceof Node) return [value];
  return [document.createTextNode(String(value))];
}

export function dynamic(fn: () => unknown): Dynamic | Node {
  if (!isBrowser()) return { kind: 'dynamic', fn };
  const fragment = document.createDocumentFragment();
  appendDynamic(fragment, fn);
  return fragment;
}

export function render(fn: () => Renderable, rootElement: Element | DocumentFragment): () => void {
  rootElement.textContent = '';
  return root(dispose => {
    appendChild(rootElement, fn());
    return dispose;
  });
}

export function hydrate(fn: () => Renderable, rootElement: Element | DocumentFragment): () => void {
  return root(dispose => {
    const previous = hydrationState;
    hydrationState = { current: rootElement.firstChild };
    try {
      appendChild(rootElement, fn());
      removeRemainingHydrationNodes(rootElement);
      return dispose;
    } finally {
      hydrationState = previous;
    }
  });
}

export function from(value: unknown): Renderable {
  return value as Renderable;
}

export function template(html: string): Renderable {
  if (!isBrowser()) return { kind: 'template', html } satisfies VTemplate;
  return createTemplateNode(html);
}

function createTemplateNode(html: string): Node {
  const claimed = claimHydrationNode(node => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE);
  if (claimed) return claimed;
  let tpl = templateCache.get(html);
  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = html;
    templateCache.set(html, tpl);
  }
  const fragment = tpl.content.cloneNode(true) as DocumentFragment;
  return fragment.childNodes.length === 1 ? fragment.firstChild! : fragment;
}

function claimHydrationNode(match: (node: Node) => boolean): Node | null {
  if (!hydrationState) return null;
  let node = skipHydrationWhitespace(hydrationState.current);
  if (!node || !match(node)) return null;
  hydrationState.current = node.nextSibling;
  return node;
}

function claimHydrationMarkerRange(): { start: Comment; end: Comment } | null {
  if (!hydrationState) return null;
  const start = skipHydrationWhitespace(hydrationState.current);
  if (!(start instanceof Comment) || start.data !== 'bd') return null;
  let node: Node | null = start.nextSibling;
  while (node) {
    if (node instanceof Comment && node.data === '/bd') {
      hydrationState.current = node.nextSibling;
      return { start, end: node };
    }
    node = node.nextSibling;
  }
  return null;
}

function removeRemainingHydrationNodes(parent: Node): void {
  if (!hydrationState) return;
  let node = skipHydrationWhitespace(hydrationState.current);
  while (node && node.parentNode === parent) {
    const next = node.nextSibling;
    parent.removeChild(node);
    node = next;
  }
}

function skipHydrationWhitespace(node: Node | null): Node | null {
  while (node && node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() === '') {
    const next = node.nextSibling;
    node.parentNode?.removeChild(node);
    node = next;
  }
  return node;
}
