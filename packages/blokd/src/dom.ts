import { cleanup, effect, root } from './core.js';
import { dynamic, type Renderable } from './jsx-runtime.js';

export { render, hydrate, dynamic } from './jsx-runtime.js';

export type ShowProps<T> = {
  when: T | false | null | undefined;
  fallback?: Renderable;
  children?: Renderable | ((value: NonNullable<T>) => Renderable);
};

export function Show<T>(props: ShowProps<T>): Renderable {
  const resolve = () => {
    const when = props.when;
    if (when) return typeof props.children === 'function'
      ? (props.children as (value: NonNullable<T>) => Renderable)(when as NonNullable<T>)
      : props.children;
    return props.fallback ?? null;
  };
  if (typeof document === 'undefined') return resolve();
  return dynamic(resolve);
}

export type ForProps<T> = {
  each: readonly T[] | null | undefined;
  by?: (item: T, index: number) => string | number;
  fallback?: Renderable;
  children: (item: T, index: () => number) => Renderable;
};

export function For<T>(props: ForProps<T>): Renderable {
  if (typeof document === 'undefined') {
    const items = props.each ?? [];
    if (items.length === 0) return props.fallback ?? null;
    return items.map((item, index) => props.children(item, () => index));
  }

  if (!props.by) {
    return dynamic(() => {
      const items = props.each ?? [];
      if (items.length === 0) return props.fallback ?? null;
      return items.map((item, index) => props.children(item, () => index));
    });
  }

  const start = document.createComment('bd-for');
  const end = document.createComment('/bd-for');
  const fragment = document.createDocumentFragment();
  fragment.append(start, end);

  type Row = { key: string | number; nodes: Node[]; dispose: () => void; item: T; index: () => number; setIndex: (value: number) => void };
  const rows = new Map<string | number, Row>();

  const normalizeNodes = (value: Renderable): Node[] => {
    const host = document.createDocumentFragment();
    // Dynamic child creation is delegated through the JSX runtime by appending into a disposable root.
    root(dispose => {
      rowsDisposers.push(dispose);
      const append = (v: Renderable): void => {
        if (v === null || v === undefined || v === false || v === true) return;
        if (Array.isArray(v)) { for (const n of v) append(n); return; }
        if (v instanceof Node) { host.appendChild(v); return; }
        host.appendChild(document.createTextNode(String(v)));
      };
      append(value);
    });
    return Array.from(host.childNodes);
  };

  let rowsDisposers: Array<() => void> = [];

  const clear = () => {
    for (const row of rows.values()) row.dispose();
    rows.clear();
    let node = start.nextSibling;
    while (node && node !== end) {
      const next = node.nextSibling;
      node.parentNode?.removeChild(node);
      node = next;
    }
  };

  effect(() => {
    const items = props.each ?? [];
    if (items.length === 0) {
      clear();
      if (props.fallback !== undefined) {
        const fallbackNodes = normalizeNodes(props.fallback);
        for (const node of fallbackNodes) end.parentNode?.insertBefore(node, end);
      }
      return;
    }

    const nextKeys = new Set<string | number>();
    const orderedRows: Row[] = [];

    items.forEach((item, index) => {
      const key = props.by!(item, index);
      nextKeys.add(key);
      let row = rows.get(key);
      if (!row || row.item !== item) {
        row?.dispose();
        for (const node of row?.nodes ?? []) node.parentNode?.removeChild(node);
        let currentIndex = index;
        let disposeRow: () => void = () => {};
        const nodes = root(dispose => {
          disposeRow = dispose;
          const rendered = props.children(item, () => currentIndex);
          const host = document.createDocumentFragment();
          const append = (v: Renderable): void => {
            if (v === null || v === undefined || v === false || v === true) return;
            if (Array.isArray(v)) { for (const child of v) append(child); return; }
            if (v instanceof Node) { host.appendChild(v); return; }
            host.appendChild(document.createTextNode(String(v)));
          };
          append(rendered);
          return Array.from(host.childNodes);
        });
        row = { key, item, nodes, dispose: disposeRow, index: () => currentIndex, setIndex: value => { currentIndex = value; } };
        rows.set(key, row);
      } else {
        row.setIndex(index);
      }
      orderedRows.push(row);
    });

    for (const [key, row] of Array.from(rows.entries())) {
      if (!nextKeys.has(key)) {
        row.dispose();
        for (const node of row.nodes) node.parentNode?.removeChild(node);
        rows.delete(key);
      }
    }

    for (const row of orderedRows) {
      for (const node of row.nodes) end.parentNode?.insertBefore(node, end);
    }
  });

  cleanup(clear);
  return fragment;
}
