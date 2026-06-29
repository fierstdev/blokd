import type { Component, Renderable } from './jsx-runtime.js';

export type RuntimeTarget = 'server' | 'browser' | 'universal';

export type RuntimeAwareComponent<P = Record<string, unknown>> = Component<P> & {
  readonly __blokdRuntime: RuntimeTarget;
};

export type ComponentOptions = {
  runtime?: RuntimeTarget;
};

export type ClientComponentOptions<P> = {
  fallback?: Renderable | ((props: P) => Renderable);
};

export function isBrowserRuntime(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

export function isServerRuntime(): boolean {
  return !isBrowserRuntime();
}

export function defineComponent<P = Record<string, unknown>>(
  component: Component<P>,
  options: ComponentOptions = {}
): RuntimeAwareComponent<P> {
  const runtime = options.runtime ?? 'universal';
  Object.defineProperty(component, '__blokdRuntime', {
    value: runtime,
    enumerable: false,
    configurable: true
  });
  return component as RuntimeAwareComponent<P>;
}

export function serverComponent<P = Record<string, unknown>>(component: Component<P>): RuntimeAwareComponent<P> {
  const wrapped = ((props: P) => {
    if (isBrowserRuntime()) throw new Error('Blokd serverComponent() cannot render in the browser runtime.');
    return component(props);
  }) as Component<P>;
  Object.defineProperty(wrapped, 'name', { value: component.name || 'ServerComponent', configurable: true });
  return defineComponent(wrapped, { runtime: 'server' });
}

export function clientComponent<P = Record<string, unknown>>(
  component: Component<P>,
  options: ClientComponentOptions<P> = {}
): RuntimeAwareComponent<P> {
  const wrapped = ((props: P) => {
    if (isBrowserRuntime()) return component(props);
    const fallback = options.fallback;
    return typeof fallback === 'function' ? (fallback as (props: P) => Renderable)(props) : fallback ?? null;
  }) as Component<P>;
  Object.defineProperty(wrapped, 'name', { value: component.name || 'ClientComponent', configurable: true });
  return defineComponent(wrapped, { runtime: 'browser' });
}

export function componentRuntime(component: unknown): RuntimeTarget | null {
  if (!component || typeof component !== 'function') return null;
  const runtime = (component as { __blokdRuntime?: unknown }).__blokdRuntime;
  return runtime === 'server' || runtime === 'browser' || runtime === 'universal' ? runtime : null;
}
