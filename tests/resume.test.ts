import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  Island,
  defineAction,
  isResumableHandler,
  on,
  parseState,
  registerResumable,
  resumable,
  serializeState,
  type ElementHandle,
  type ResumableHandler
} from '../packages/blokd/src/resume.js';
import { renderToString } from '../packages/blokd/src/server.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';

class FakeClassList {
  readonly values = new Set<string>();

  add(name: string) {
    this.values.add(name);
  }

  remove(name: string) {
    this.values.delete(name);
  }

  toggle(name: string, force?: boolean) {
    const active = force ?? !this.values.has(name);
    if (active) this.values.add(name);
    else this.values.delete(name);
    return active;
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>();
  readonly classList = new FakeClassList();
  readonly matches = new Map<string, Element[]>();
  textContent = '';

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  querySelector(selector: string) {
    return this.matches.get(selector)?.[0] ?? null;
  }

  querySelectorAll(selector: string) {
    return this.matches.get(selector) ?? [];
  }
}

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

  it('on emits the same marker as resumable', () => {
    expect(on('/src/counter.ts#increment')).toEqual(resumable('/src/counter.ts#increment'));
  });

  it('defineAction wraps action handlers with event and element handle', async () => {
    const element = new FakeElement() as unknown as Element;
    const event = new Event('click');
    const action = defineAction<{ count: number }>(({ event: receivedEvent, state, el }) => {
      expect(receivedEvent).toBe(event);
      state.count += 1;
      el.text(`Count: ${state.count}`);
    });

    await action(event, { element, island: null, state: { count: 0 } });

    expect((element as unknown as FakeElement).textContent).toBe('Count: 1');
  });

  it('element handle attr gets, sets, and removes attributes', async () => {
    const element = new FakeElement() as unknown as Element;
    const action = defineAction(({ el }) => {
      expect(el.attr('aria-expanded')).toBe(null);
      el.attr('aria-expanded', true);
      expect(el.attr('aria-expanded')).toBe('true');
      el.attr('data-count', 2);
      expect(el.attr('data-count')).toBe('2');
      el.attr('aria-expanded', null);
      expect(el.attr('aria-expanded')).toBe(null);
    });

    await action(new Event('click'), { element, island: null, state: {} });
  });

  it('element handle class helpers update the bound element', async () => {
    const fake = new FakeElement();
    const action = defineAction(({ el }) => {
      el.addClass('active');
      el.toggleClass('expanded', true);
      el.toggleClass('hidden', false);
      el.removeClass('active');
    });

    await action(new Event('click'), { element: fake as unknown as Element, island: null, state: {} });

    expect(fake.classList.values.has('active')).toBe(false);
    expect(fake.classList.values.has('expanded')).toBe(true);
    expect(fake.classList.values.has('hidden')).toBe(false);
  });

  it('element handle find and all query from the bound element', async () => {
    const fake = new FakeElement();
    const first = new FakeElement() as unknown as Element;
    const second = new FakeElement() as unknown as Element;
    fake.matches.set('[data-item]', [first, second]);

    const action = defineAction(({ el }) => {
      expect(el.find('[data-item]')).toBe(first);
      expect(el.all('[data-item]')).toEqual([first, second]);
    });

    await action(new Event('click'), { element: fake as unknown as Element, island: null, state: {} });
  });

  it('defineAction preserves state typing', () => {
    const action = defineAction<{ count: number }>(({ state, el, event }) => {
      expectTypeOf(state.count).toEqualTypeOf<number>();
      expectTypeOf(el).toMatchTypeOf<ElementHandle>();
      expectTypeOf(event).toEqualTypeOf<Event>();
    });

    expectTypeOf(action).toMatchTypeOf<ResumableHandler<{ count: number }>>();
  });
});
