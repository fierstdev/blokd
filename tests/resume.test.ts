import { describe, expect, it } from 'vitest';
import { Island, isResumableHandler, parseState, registerResumable, resumable, serializeState } from '../packages/blokd/src/resume.js';
import { renderToString } from '../packages/blokd/src/server.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';

describe('resumable islands', () => {
  it('creates resumable handler refs', () => {
    const handler = resumable('/src/counter.ts#increment');
    expect(isResumableHandler(handler)).toBe(true);
    expect(handler.ref).toBe('/src/counter.ts#increment');
  });

  it('serializes state safely', () => {
    const serialized = serializeState({ text: '</script><script>alert(1)</script>' });
    expect(serialized).not.toContain('</script>');
    expect(parseState(serialized)).toEqual({ text: '</script><script>alert(1)</script>' });
  });

  it('renders island and resumable event metadata on the server', () => {
    const output = renderToString(() => jsx(Island as any, {
      name: 'counter',
      state: { count: 0 },
      children: jsx('button', {
        onClick: resumable('/src/counter.ts#increment'),
        children: 'Increment'
      })
    }));
    expect(output).toContain('data-blokd-island="counter"');
    expect(output).toContain('data-blokd-state="{&quot;count&quot;:0}"');
    expect(output).toContain('data-blokd-onclick="/src/counter.ts#increment"');
  });

  it('registers handlers for app-controlled refs', () => {
    registerResumable('local#noop', () => undefined);
    const handler = resumable('local#noop');
    expect(handler.ref).toBe('local#noop');
  });
});
