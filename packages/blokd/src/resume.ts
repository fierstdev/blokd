import { jsx, type Renderable } from './jsx-runtime.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ResumableRef = `${string}#${string}` | string;

export type ResumableContext<
  TState extends Record<string, unknown> = Record<string, unknown>
> = {
  element: Element;
  island: Element | null;
  state: TState;
};

export type ResumableHandler<
  TState extends Record<string, unknown> = Record<string, unknown>
> = (
  event: Event,
  ctx: ResumableContext<TState>
) => unknown | Promise<unknown>;

export type ElementHandle = {
  attr(name: string): string | null;
  attr(name: string, value: string | number | boolean | null): void;
  text(value: string | number | boolean): void;
  addClass(name: string): void;
  removeClass(name: string): void;
  toggleClass(name: string, force?: boolean): void;
  find(selector: string): Element | null;
  all(selector: string): Element[];
};

export type ActionContext<
  TState extends Record<string, unknown> = Record<string, unknown>
> = ResumableContext<TState> & {
  event: Event;
  el: ElementHandle;
};

export type ActionHandler<
  TState extends Record<string, unknown> = Record<string, unknown>
> = (ctx: ActionContext<TState>) => unknown | Promise<unknown>;

export type ResumeContext<
  TState extends Record<string, unknown> = Record<string, unknown>
> = ResumableContext<TState> & {
  event: Event;
  ref: string;
  setState(next: TState | ((previous: TState) => TState)): void;
};

export type ResumableEventHandler<
  TState extends Record<string, unknown> = Record<string, unknown>
> = ResumableHandler<TState>;

export type ResumableBinding<TState extends Record<string, unknown> = Record<string, unknown>> = {
  readonly __blokdResumable: true;
  readonly ref: string;
  readonly handler?: ResumableHandler<TState>;
};

export type IslandProps<TState extends JsonValue = JsonValue> = {
  name: string;
  state?: TState;
  id?: string;
  as?: string;
  children?: Renderable;
};

export type StartResumabilityOptions = {
  root?: Document | Element;
  events?: readonly string[];
  /**
   * Production safety valve. Return false to reject a data-blokd-on* ref before dynamic import.
   */
  allowRef?: (ref: string) => boolean;
  onError?: (error: unknown, ctx: Omit<ResumeContext, 'state' | 'setState'>) => void;
};

const registry = new Map<string, ResumableHandler>();
const inflight = new Map<string, Promise<ResumableHandler>>();
const islandStates = new WeakMap<Element, Record<string, unknown>>();
const DEFAULT_EVENTS = ['click', 'input', 'change', 'submit'] as const;
type RootTarget = Document | Element;
type ListenerRecord = { listener: EventListener; count: number };
type RootResumabilityState = {
  options: StartResumabilityOptions;
  listeners: Map<string, ListenerRecord>;
};
const rootStates = new WeakMap<RootTarget, RootResumabilityState>();

type ExtractRecord<T> = T extends Record<string, unknown> ? T : Record<string, unknown>;

export function resumable<TState = Record<string, unknown>>(
  ref: ResumableRef,
  handler?: ResumableHandler<ExtractRecord<TState>>
): ResumableBinding<ExtractRecord<TState>> {
  const normalized = String(ref);
  assertValidRef(normalized);
  if (handler) {
    registry.set(normalized, handler as unknown as ResumableHandler);
    return { __blokdResumable: true, ref: normalized, handler };
  }
  return { __blokdResumable: true, ref: normalized };
}

export function on(ref: ResumableRef): ResumableBinding {
  return resumable(ref);
}

export function defineAction<TState extends Record<string, unknown> = Record<string, unknown>>(
  handler: ActionHandler<TState>
): ResumableHandler<TState> {
  return (event, ctx) => handler({
    ...ctx,
    event,
    el: createElementHandle(ctx.element)
  });
}

export function isResumableHandler(value: unknown): value is ResumableBinding {
  return !!value && typeof value === 'object' && (value as ResumableBinding).__blokdResumable === true;
}

export function registerResumable<TState extends Record<string, unknown> = Record<string, unknown>>(
  ref: ResumableRef,
  handler: ResumableHandler<TState>
): void {
  const normalized = String(ref);
  assertValidRef(normalized);
  registry.set(normalized, handler as unknown as ResumableHandler);
}

export function unregisterResumable(ref: ResumableRef): void {
  registry.delete(String(ref));
  inflight.delete(String(ref));
}

export function Island<TState extends JsonValue = JsonValue>(props: IslandProps<TState>): Renderable {
  const tag = props.as ?? 'div';
  validateIslandTag(tag);
  const attrs: Record<string, unknown> = {
    'data-blokd-island': props.name,
    children: props.children
  };
  if (props.id) attrs.id = props.id;
  if (props.state !== undefined) attrs['data-blokd-state'] = serializeState(props.state);
  return jsx(tag, attrs);
}

export function eventAttributeName(eventName: string): string {
  if (!/^[a-z][a-z0-9_-]*$/i.test(eventName)) throw new Error(`Invalid event name: ${eventName}`);
  return `data-blokd-on${eventName.toLowerCase()}`;
}

export function serializeState(value: JsonValue): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) return 'null';
  return serialized
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

export function parseState<TState = JsonValue>(value: string | null): TState | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as TState;
  } catch {
    return null;
  }
}

export function startResumability(options: StartResumabilityOptions = {}): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const root = options.root ?? document;
  const events = Array.from(new Set(options.events ?? DEFAULT_EVENTS));
  let state = rootStates.get(root);
  if (!state) {
    state = { options, listeners: new Map() };
    rootStates.set(root, state);
  }
  state.options = options;

  for (const eventName of events) {
    eventAttributeName(eventName);
    let record = state.listeners.get(eventName);
    if (!record) {
      const listener: EventListener = event => {
        const latest = rootStates.get(root);
        if (latest) void dispatchResumableEvent(event, latest.options);
      };
      root.addEventListener(eventName, listener, true);
      record = { listener, count: 0 };
      state.listeners.set(eventName, record);
    }
    record.count++;
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    const current = rootStates.get(root);
    if (!current) return;
    for (const eventName of events) {
      const record = current.listeners.get(eventName);
      if (!record) continue;
      record.count--;
      if (record.count <= 0) {
        root.removeEventListener(eventName, record.listener, true);
        current.listeners.delete(eventName);
      }
    }
    if (current.listeners.size === 0) rootStates.delete(root);
  };
}

async function dispatchResumableEvent(event: Event, options: StartResumabilityOptions): Promise<void> {
  const match = findResumableElement(event.target, event.type);
  if (!match) return;

  const { element, ref } = match;
  const island = element.closest('[data-blokd-island]');
  const baseCtx = { event, element, island, ref };

  try {
    if (options.allowRef && !options.allowRef(ref)) throw new Error(`Blokd resumable ref rejected by allowRef(): ${ref}`);
    if (!isSafeDynamicRef(ref)) throw new Error(`Unsafe Blokd resumable ref: ${ref}`);
    const handler = await loadHandler(ref);
    const ctx = createResumeContext(baseCtx);
    await handler(event, ctx);
  } catch (error) {
    if (options.onError) options.onError(error, baseCtx);
    else console.error(error);
  }
}

function findResumableElement(start: EventTarget | null, eventName: string): { element: Element; ref: string } | null {
  if (!(start instanceof Element)) return null;
  const attr = eventAttributeName(eventName);
  const element = start.closest(`[${attr}]`);
  const ref = element?.getAttribute(attr);
  return element && ref ? { element, ref } : null;
}

function createResumeContext(base: Omit<ResumeContext, 'state' | 'setState'>): ResumeContext {
  const state = getIslandState(base.island);
  return {
    ...base,
    state,
    setState(next) {
      const value = typeof next === 'function' ? (next as (previous: Record<string, unknown>) => Record<string, unknown>)(state) : next;
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, value);
      if (base.island) base.island.setAttribute('data-blokd-state', serializeState(state as JsonValue));
    }
  } as ResumeContext;
}

function getIslandState(island: Element | null): Record<string, unknown> {
  if (!island) return {};
  const existing = islandStates.get(island);
  if (existing) return existing;

  let state: Record<string, unknown> = {};
  const parsed = parseState(island.getAttribute('data-blokd-state'));
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    state = parsed as Record<string, unknown>;
  }
  islandStates.set(island, state);
  return state;
}

function createElementHandle(element: Element): ElementHandle {
  return {
    attr: (function attr(name: string, value?: string | number | boolean | null): string | null | void {
      if (arguments.length === 1) return element.getAttribute(name);
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, String(value));
    }) as ElementHandle['attr'],
    text(value) {
      element.textContent = String(value);
    },
    addClass(name) {
      element.classList.add(name);
    },
    removeClass(name) {
      element.classList.remove(name);
    },
    toggleClass(name, force) {
      element.classList.toggle(name, force);
    },
    find(selector) {
      return element.querySelector(selector);
    },
    all(selector) {
      return Array.from(element.querySelectorAll(selector));
    }
  };
}

async function loadHandler(ref: string): Promise<ResumableHandler> {
  const registered = registry.get(ref);
  if (registered) return registered;
  const active = inflight.get(ref);
  if (active) return active;

  const promise = importHandler(ref);
  inflight.set(ref, promise);
  try {
    const handler = await promise;
    registry.set(ref, handler);
    return handler;
  } finally {
    inflight.delete(ref);
  }
}

async function importHandler(ref: string): Promise<ResumableHandler> {
  const { moduleId, exportName } = parseRef(ref);
  let mod: Record<string, unknown>;
  try {
    mod = await import(/* @vite-ignore */ moduleId) as Record<string, unknown>;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to import Blokd resumable handler "${ref}": ${detail}`);
  }
  const handler = mod[exportName];
  if (typeof handler !== 'function') {
    throw new Error(`Blokd resumable handler "${ref}" was not found. Missing export "${exportName}" in ${moduleId}.`);
  }
  return handler as ResumableHandler;
}

function parseRef(ref: string): { moduleId: string; exportName: string } {
  const index = ref.lastIndexOf('#');
  if (index <= 0 || index === ref.length - 1) {
    throw new Error(`Invalid Blokd resumable ref: ${ref}. Expected "module#export".`);
  }
  return { moduleId: ref.slice(0, index), exportName: ref.slice(index + 1) };
}

function assertValidRef(ref: string): void {
  parseRef(ref);
  if (!isSafeDynamicRef(ref)) throw new Error(`Unsafe Blokd resumable ref: ${ref}`);
}

function isSafeDynamicRef(ref: string): boolean {
  const { moduleId } = parseRef(ref);
  const lowered = moduleId.trim().toLowerCase();
  if (lowered.startsWith('javascript:') || lowered.startsWith('data:') || lowered.startsWith('blob:')) return false;
  if (/^https?:\/\//.test(lowered)) {
    if (typeof location === 'undefined') return false;
    try { return new URL(moduleId, location.href).origin === location.origin; }
    catch { return false; }
  }
  return true;
}

function validateIslandTag(tag: string): void {
  if (!/^[a-z][a-z0-9.-]*$/i.test(tag)) throw new Error(`Invalid Island tag: ${tag}`);
  if (tag.toLowerCase() === 'script') throw new Error('Island cannot render as <script>.');
}
