import { runWithSignalObserver, type SignalObserver } from './core.js';
import { jsx, runWithVirtualJsx, type Component, type Props, type Renderable, type VElement, type VFragment } from './jsx-runtime.js';
import {
  registerResumable,
  resumable,
  Island,
  startResumability,
  type JsonValue,
  type ResumableHandler,
  type StartResumabilityOptions
} from './resume.js';
import { renderToString } from './server.js';

export type IslandComponent<P = Record<string, unknown>> = Component<P> & {
  readonly __blokdIslandComponent: true;
  readonly __blokdIslandName: string;
  readonly __blokdIslandSource: Component<P>;
};

export type IslandOptions = {
  /**
   * Stable public island name used in generated resumable refs.
   * Use this when build tooling may minify function names.
   */
  name?: string;
};

export type IslandRegistration<P = Record<string, unknown>> =
  | IslandComponent<P>
  | readonly [IslandComponent<P>, P]
  | { component: IslandComponent<P>; props?: P };

type IslandState = Record<string, JsonValue>;

let nextIslandId = 0;

export function island<P = Record<string, unknown>>(component: Component<P>, options: IslandOptions = {}): IslandComponent<P> {
  const name = options.name ?? (component.name || `island-${++nextIslandId}`);
  assertIslandName(name);
  const wrapped = ((props: P) => renderIsland(name, component, props)) as IslandComponent<P>;
  Object.defineProperty(wrapped, 'name', { value: name, configurable: true });
  Object.defineProperty(wrapped, '__blokdIslandComponent', { value: true });
  Object.defineProperty(wrapped, '__blokdIslandName', { value: name });
  Object.defineProperty(wrapped, '__blokdIslandSource', { value: component });
  return wrapped;
}

export function __compileIslandForTest<P>(
  name: string,
  component: Component<P>,
  props: P,
  state?: IslandState
): { html: string; state: IslandState; run(eventIndex: number, event?: Event): Promise<IslandState> } {
  return runWithVirtualJsx(() => {
    const captured = createSignalCapture(state);
    storeJsonProps(captured.state, props);
    const rendered = runWithSignalObserver(captured.observer, () => component(props));
    const transformed = transformEvents(rendered, name, component, props);
    return {
      html: renderToString(jsx(Island as any, { name, state: captured.state, children: transformed })),
      state: captured.state,
      async run(eventIndex: number, event = new Event('click')) {
        const handler = createIslandHandler(name, component, props, eventIndex);
        await handler(event, { element: {} as Element, island: null, state: captured.state });
        return captured.state;
      }
    };
  });
}

export function __islandRefsForTest<P>(component: IslandComponent<P>, props = {} as P): string[] {
  const rendered = runWithVirtualJsx(() => runWithSignalObserver(createSignalCapture().observer, () => component.__blokdIslandSource(props)));
  return collectEventRefs(rendered).map(event => `blokd:island:${component.__blokdIslandName}#${event.name}${event.index}`);
}

export function registerIsland<P = Record<string, unknown>>(
  component: IslandComponent<P>,
  props = {} as P
): void {
  const rendered = runWithVirtualJsx(() => runWithSignalObserver(createSignalCapture().observer, () => component.__blokdIslandSource(props)));
  for (const event of collectEventRefs(rendered)) {
    registerResumable(`blokd:island:${component.__blokdIslandName}#${event.name}${event.index}`, createIslandHandler(component.__blokdIslandName, component.__blokdIslandSource, props, event.index));
  }
}

export function startIslands(
  islands: IslandRegistration | IslandRegistration[],
  options: StartResumabilityOptions = {}
): () => void {
  for (const item of Array.isArray(islands) && !isIslandRegistrationTuple(islands) ? islands : [islands]) {
    const registration = normalizeIslandRegistration(item as IslandRegistration);
    registerIsland(registration.component, registration.props);
  }
  return startResumability({
    ...options,
    allowRef(ref) {
      if (ref.startsWith('blokd:island:')) return options.allowRef ? options.allowRef(ref) !== false : true;
      return options.allowRef ? options.allowRef(ref) : true;
    }
  });
}

function isIslandRegistrationTuple(value: unknown): value is readonly [IslandComponent, unknown] {
  return Array.isArray(value) && value.length === 2 && isIslandComponent(value[0]);
}

function isIslandComponent(value: unknown): value is IslandComponent {
  return typeof value === 'function' && (value as IslandComponent).__blokdIslandComponent === true;
}

function normalizeIslandRegistration(registration: IslandRegistration): { component: IslandComponent; props: Record<string, unknown> } {
  if (isIslandComponent(registration)) return { component: registration, props: {} };
  if (isIslandRegistrationTuple(registration)) return { component: registration[0], props: registration[1] as Record<string, unknown> };
  return { component: registration.component, props: registration.props ?? {} };
}

function renderIsland<P>(name: string, component: Component<P>, props: P, existingState?: IslandState): Renderable {
  return runWithVirtualJsx(() => {
    const captured = createSignalCapture(existingState);
    const nextProps = propsFromState(existingState, props);
    storeJsonProps(captured.state, nextProps);
    const rendered = runWithSignalObserver(captured.observer, () => component(nextProps));
    const transformed = transformEvents(rendered, name, component, nextProps);
    return jsx(Island as any, {
      name,
      state: captured.state,
      children: transformed
    });
  });
}

function createSignalCapture(existingState?: IslandState): { state: IslandState; observer: SignalObserver } {
  const state: IslandState = {};
  let index = 0;
  return {
    state,
    observer: {
      next<T>(initial: T) {
        const key = `s${index++}` as const;
        const value = (existingState && key in existingState ? existingState[key] : initial) as T;
        if (isJsonValue(value)) state[key] = value;
        return {
          value,
          write(next) {
            if (isJsonValue(next)) state[key] = next;
          }
        };
      }
    }
  };
}

function transformEvents<P>(value: Renderable, islandName: string, component: Component<P>, props: P): Renderable {
  let eventIndex = 0;
  const visit = (node: Renderable): Renderable => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== 'object' || !('kind' in node)) return node;
    if (node.kind === 'fragment') {
      const fragment = node as VFragment;
      return { ...fragment, children: fragment.children.map(visit) };
    }
    if (node.kind !== 'element') return node;

    const element = node as VElement;
    const nextProps: Props = { ...element.props };
    for (const [key, handler] of Object.entries(element.props)) {
      if (!/^on[A-Z]/.test(key) && !/^on[a-z]/.test(key)) continue;
      if (typeof handler !== 'function') continue;
      const eventName = key.slice(2).toLowerCase();
      const ref = `blokd:island:${islandName}#${eventName}${eventIndex}`;
      nextProps[key] = resumable(ref, createIslandHandler(islandName, component, props, eventIndex));
      eventIndex++;
    }
    return { ...element, props: nextProps, children: element.children.map(visit) };
  };
  return visit(value);
}

function createIslandHandler<P>(
  islandName: string,
  component: Component<P>,
  props: P,
  handlerIndex: number
): ResumableHandler<IslandState> {
  return async (event, ctx) => {
    const captured = createSignalCapture(ctx.state);
    const nextProps = propsFromState(ctx.state, props);
    let result: unknown;
    runWithVirtualJsx(() => runWithSignalObserver(captured.observer, () => {
      const rendered = component(nextProps);
      const handler = findEventHandler(rendered, handlerIndex);
      if (!handler) throw new Error(`Blokd island "${islandName}" could not find generated event handler ${handlerIndex}.`);
      result = handler(event);
    }));
    await result;
    Object.assign(ctx.state, captured.state);
    if (typeof HTMLElement !== 'undefined' && ctx.island instanceof HTMLElement) {
      const rerendered = renderIsland(islandName, component, props, ctx.state);
      const html = renderToString(rerendered);
      const template = document.createElement('template');
      template.innerHTML = html;
      const nextIsland = template.content.firstElementChild;
      if (nextIsland) ctx.island.replaceWith(nextIsland);
    }
  };
}

function collectEventRefs(value: Renderable): Array<{ name: string; index: number }> {
  const events: Array<{ name: string; index: number }> = [];
  let index = 0;
  visitRenderable(value, element => {
    for (const [key, handler] of Object.entries(element.props)) {
      if (!/^on[A-Z]/.test(key) && !/^on[a-z]/.test(key)) continue;
      if (typeof handler !== 'function') continue;
      events.push({ name: key.slice(2).toLowerCase(), index });
      index++;
    }
  });
  return events;
}

function findEventHandler(value: Renderable, targetIndex: number): ((event: Event) => unknown) | null {
  let index = 0;
  let found: ((event: Event) => unknown) | null = null;
  const visit = (node: Renderable): void => {
    if (found) return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!node || typeof node !== 'object' || !('kind' in node)) return;
    if (node.kind === 'fragment') {
      for (const child of (node as VFragment).children) visit(child);
      return;
    }
    if (node.kind !== 'element') return;
    const element = node as VElement;
    for (const [key, handler] of Object.entries(element.props)) {
      if (!/^on[A-Z]/.test(key) && !/^on[a-z]/.test(key)) continue;
      if (typeof handler !== 'function') continue;
      if (index === targetIndex) {
        found = handler as (event: Event) => unknown;
        return;
      }
      index++;
    }
    for (const child of element.children) visit(child);
  };
  visit(value);
  return found;
}

function visitRenderable(value: Renderable, visitElement: (element: VElement) => void): void {
  if (Array.isArray(value)) {
    for (const child of value) visitRenderable(child, visitElement);
    return;
  }
  if (!value || typeof value !== 'object' || !('kind' in value)) return;
  if (value.kind === 'fragment') {
    for (const child of (value as VFragment).children) visitRenderable(child, visitElement);
    return;
  }
  if (value.kind !== 'element') return;
  const element = value as VElement;
  visitElement(element);
  for (const child of element.children) visitRenderable(child, visitElement);
}

function storeJsonProps<P>(state: IslandState, props: P): void {
  if (props && typeof props === 'object' && Object.keys(props as Record<string, unknown>).length > 0 && isJsonValue(props)) {
    state.$props = props;
  }
}

function propsFromState<P>(state: IslandState | undefined, fallback: P): P {
  const value = state?.$props;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as P : fallback;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

function assertIslandName(name: string): void {
  if (!/^[A-Za-z_$][\w$-]*$/.test(name)) {
    throw new Error(`Invalid Blokd island name "${name}". Use a stable identifier such as "Counter".`);
  }
}
