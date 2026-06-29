export type Accessor<T> = () => T;
export type Setter<T> = {
  (value: T): T;
  (updater: (previous: T) => T): T;
};

export type SignalOptions<T> = {
  /**
   * Custom equality comparator. Set to false to always notify subscribers.
   */
  equals?: false | ((previous: T, next: T) => boolean);
};

type Source = Set<Computation>;
type CleanupFn = () => void;

type Owner = {
  owner: Owner | null;
  owned: Set<Computation | Owner>;
  cleanups: CleanupFn[];
  disposed: boolean;
};

type Computation = Owner & {
  fn: () => void;
  deps: Source[];
  running: boolean;
  stale: boolean;
};

let currentObserver: Computation | null = null;
let currentOwner: Owner | null = null;
let batchDepth = 0;
let effectsEnabled = true;
let flushing = false;
const queue = new Set<Computation>();

export type SignalObserver = {
  next<T>(initial: T): {
    value: T;
    write?(value: T): void;
  };
};

let currentSignalObserver: SignalObserver | null = null;

function createOwner(parent: Owner | null): Owner {
  const owner: Owner = { owner: parent, owned: new Set(), cleanups: [], disposed: false };
  parent?.owned.add(owner);
  return owner;
}

function removeFromParent(owner: Owner): void {
  owner.owner?.owned.delete(owner);
}

function cleanupDeps(comp: Computation): void {
  for (const source of comp.deps) source.delete(comp);
  comp.deps.length = 0;
}

function runCleanups(owner: Owner): void {
  const cleanups = owner.cleanups.splice(0);
  for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]!();
}

function disposeOwner(owner: Owner): void {
  if (owner.disposed) return;
  owner.disposed = true;
  for (const child of Array.from(owner.owned)) disposeOwner(child);
  owner.owned.clear();
  if ('deps' in owner) cleanupDeps(owner as Computation);
  runCleanups(owner);
  queue.delete(owner as Computation);
  removeFromParent(owner);
}

function createComputation(fn: () => void, parent: Owner | null): Computation {
  const comp: Computation = {
    owner: parent,
    owned: new Set(),
    cleanups: [],
    disposed: false,
    fn,
    deps: [],
    running: false,
    stale: false
  };
  parent?.owned.add(comp);
  return comp;
}

function runComputation(comp: Computation): void {
  if (comp.disposed || comp.running) return;
  comp.stale = false;
  cleanupDeps(comp);
  runCleanups(comp);
  for (const child of Array.from(comp.owned)) disposeOwner(child);
  comp.owned.clear();

  const previousObserver = currentObserver;
  const previousOwner = currentOwner;
  currentObserver = comp;
  currentOwner = comp;
  comp.running = true;
  try {
    comp.fn();
  } finally {
    comp.running = false;
    currentObserver = previousObserver;
    currentOwner = previousOwner;
  }
}

function schedule(comp: Computation): void {
  if (comp.disposed) return;
  comp.stale = true;
  queue.add(comp);
  if (batchDepth === 0) flush();
}

function flush(): void {
  if (batchDepth > 0 || flushing) return;
  flushing = true;
  try {
    let guard = 0;
    while (queue.size > 0) {
      if (++guard > 100000) throw new Error('Reactive update limit exceeded. Check for cyclic effects.');
      const pending = Array.from(queue);
      queue.clear();
      for (const comp of pending) runComputation(comp);
    }
  } finally {
    flushing = false;
  }
}

function shouldNotify<T>(previous: T, next: T, options?: SignalOptions<T>): boolean {
  if (options?.equals === false) return true;
  const equals = options?.equals ?? Object.is;
  return !equals(previous, next);
}

export function signal<T>(initial: T, options?: SignalOptions<T>): [Accessor<T>, Setter<T>] {
  const observed = currentSignalObserver?.next(initial);
  let value = observed ? observed.value : initial;
  const subscribers: Source = new Set();

  const read: Accessor<T> = () => {
    if (currentObserver && !subscribers.has(currentObserver)) {
      subscribers.add(currentObserver);
      currentObserver.deps.push(subscribers);
    }
    return value;
  };

  const write: Setter<T> = ((next: T | ((previous: T) => T)) => {
    const nextValue = typeof next === 'function' ? (next as (previous: T) => T)(value) : next;
    if (!shouldNotify(value, nextValue, options)) return value;
    value = nextValue;
    observed?.write?.(value);
    for (const comp of Array.from(subscribers)) schedule(comp);
    return value;
  }) as Setter<T>;

  return [read, write];
}

export function effect(fn: () => void): () => void {
  if (!effectsEnabled) return () => undefined;
  const comp = createComputation(fn, currentOwner);
  runComputation(comp);
  return () => disposeOwner(comp);
}

export function cleanup(fn: CleanupFn): void {
  if (!currentOwner) throw new Error('cleanup() must be called inside root(), effect(), render(), hydrate(), or a component render scope.');
  currentOwner.cleanups.push(fn);
}

export function memo<T>(fn: () => T, options?: SignalOptions<T>): Accessor<T> {
  if (!effectsEnabled) return () => fn();
  const [value, setValue] = signal<T>(undefined as T, options);
  effect(() => setValue(fn()));
  return value;
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    flush();
  }
}

export function untrack<T>(fn: () => T): T {
  const previous = currentObserver;
  currentObserver = null;
  try {
    return fn();
  } finally {
    currentObserver = previous;
  }
}

export function root<T>(fn: (dispose: () => void) => T): T {
  const owner = createOwner(currentOwner);
  const previousOwner = currentOwner;
  currentOwner = owner;
  try {
    return fn(() => disposeOwner(owner));
  } finally {
    currentOwner = previousOwner;
  }
}

export function getOwner(): unknown {
  return currentOwner;
}

export function runWithOwner<T>(owner: unknown, fn: () => T): T {
  const previousOwner = currentOwner;
  currentOwner = owner as Owner | null;
  try {
    return fn();
  } finally {
    currentOwner = previousOwner;
  }
}

export function runWithEffectsDisabled<T>(fn: () => T): T {
  const previous = effectsEnabled;
  effectsEnabled = false;
  try {
    return fn();
  } finally {
    effectsEnabled = previous;
  }
}

export function runWithSignalObserver<T>(observer: SignalObserver | null, fn: () => T): T {
  const previous = currentSignalObserver;
  currentSignalObserver = observer;
  try {
    return fn();
  } finally {
    currentSignalObserver = previous;
  }
}

export function dispose(owner: unknown): void {
  if (owner && typeof owner === 'object' && 'owned' in owner) disposeOwner(owner as Owner);
}
