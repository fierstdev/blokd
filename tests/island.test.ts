import { describe, expect, it } from 'vitest';
import { signal, island, startIslands } from '../packages/blokd/src/index.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';
import { __compileIslandForTest, __islandRefsForTest } from '../packages/blokd/src/island.js';
import { renderToString } from '../packages/blokd/src/server.js';

describe('compiler-assisted islands v1', () => {
  function Counter() {
    const [count, setCount] = signal(0);
    return jsx('button', {
      type: 'button',
      onClick: () => setCount(c => c + 1),
      children: `Count: ${count()}`
    });
  }

  it('island() renders SSR HTML with generated resumable metadata', () => {
    const CounterIsland = island(Counter);
    const html = renderToString(() => jsx(CounterIsland, {}));

    expect(html).toContain('data-blokd-island="Counter"');
    expect(html).toContain('data-blokd-state="{&quot;s0&quot;:0}"');
    expect(html).toContain('data-blokd-onclick="blokd:island:Counter#click0"');
    expect(html).toContain('Count: 0');
  });

  it('serializes signal initial values', () => {
    const compiled = __compileIslandForTest('Counter', Counter, {});
    expect(compiled.state).toEqual({ s0: 0 });
  });

  it('supports stable island names for minified client builds', () => {
    const CounterIsland = island(Counter, { name: 'StableCounter' });
    const html = renderToString(() => jsx(CounterIsland, {}));

    expect(CounterIsland.__blokdIslandName).toBe('StableCounter');
    expect(html).toContain('data-blokd-island="StableCounter"');
    expect(html).toContain('data-blokd-onclick="blokd:island:StableCounter#click0"');
  });

  it('generated click handler updates signal state', async () => {
    const compiled = __compileIslandForTest('Counter', Counter, {});
    await compiled.run(0);
    await compiled.run(0);
    expect(compiled.state).toEqual({ s0: 2 });
  });

  it('text binding updates when re-rendered from serialized state', async () => {
    const compiled = __compileIslandForTest('Counter', Counter, {});
    await compiled.run(0);
    const updated = __compileIslandForTest('Counter', Counter, {}, compiled.state);
    expect(updated.html).toContain('Count: 1');
  });

  it('serializes JSON props so registered islands can re-render from SSR state', () => {
    function LabelCounter(props: { label: string }) {
      const [count, setCount] = signal(0);
      return jsx('button', {
        type: 'button',
        onClick: () => setCount(c => c + 1),
        children: `${props.label}: ${count()}`
      });
    }

    const compiled = __compileIslandForTest('LabelCounter', LabelCounter, { label: 'Guests' });
    expect(compiled.state.$props).toEqual({ label: 'Guests' });
    expect(compiled.html).toContain('Guests: 0');
  });

  it('generates registerable refs for multiple event types', () => {
    function Editor() {
      const [text, setText] = signal('');
      return jsx('input', {
        value: text(),
        onInput: event => setText((event.target as HTMLInputElement).value),
        onChange: event => setText((event.target as HTMLInputElement).value.trim())
      });
    }

    const EditorIsland = island(Editor);
    expect(__islandRefsForTest(EditorIsland)).toEqual([
      'blokd:island:Editor#input0',
      'blokd:island:Editor#change1'
    ]);
  });

  it('starts compiler-assisted islands without requiring manual ref strings', () => {
    const CounterIsland = island(Counter);
    const dispose = startIslands(CounterIsland);
    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('starts prop-bearing islands from tuple registrations', () => {
    function Label(props: { text: string }) {
      return jsx('button', { onClick: () => undefined, children: props.text });
    }

    const LabelIsland = island(Label);
    const dispose = startIslands([LabelIsland, { text: 'Save' }]);
    expect(typeof dispose).toBe('function');
    dispose();
  });
});
