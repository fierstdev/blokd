import { describe, expect, it } from 'vitest';
import { batch, cleanup, effect, memo, root, signal, untrack } from '../packages/blokd/src/core.js';

describe('reactivity core', () => {
  it('tracks signal dependencies and updates effects', () => {
    const [count, setCount] = signal(0);
    const seen: number[] = [];
    const dispose = effect(() => seen.push(count()));
    setCount(1);
    setCount(1);
    setCount(n => n + 1);
    dispose();
    setCount(3);
    expect(seen).toEqual([0, 1, 2]);
  });

  it('cleans dynamic dependencies between effect runs', () => {
    const [useA, setUseA] = signal(true);
    const [a, setA] = signal(1);
    const [b, setB] = signal(10);
    const seen: number[] = [];
    effect(() => seen.push(useA() ? a() : b()));
    setA(2);
    setUseA(false);
    setA(3);
    setB(11);
    expect(seen).toEqual([1, 2, 10, 11]);
  });

  it('batches synchronous updates', () => {
    const [a, setA] = signal(0);
    const [b, setB] = signal(0);
    const seen: number[] = [];
    effect(() => seen.push(a() + b()));
    batch(() => {
      setA(1);
      setB(2);
    });
    expect(seen).toEqual([0, 3]);
  });

  it('supports memo and untrack', () => {
    const [count, setCount] = signal(1);
    const doubled = memo(() => count() * 2);
    const seen: number[] = [];
    effect(() => seen.push(untrack(() => doubled())));
    setCount(2);
    expect(seen).toEqual([2]);
  });

  it('disposes root-owned effects and cleanups', () => {
    const [count, setCount] = signal(0);
    const seen: number[] = [];
    const cleaned: string[] = [];
    const dispose = root(dispose => {
      effect(() => seen.push(count()));
      cleanup(() => cleaned.push('root'));
      return dispose;
    });
    setCount(1);
    dispose();
    setCount(2);
    expect(seen).toEqual([0, 1]);
    expect(cleaned).toEqual(['root']);
  });
});
