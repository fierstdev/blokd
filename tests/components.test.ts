import { describe, expect, it } from 'vitest';
import {
  clientComponent,
  componentRuntime,
  defineComponent,
  isServerRuntime,
  serverComponent
} from '../packages/blokd/src/components.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';
import { renderToString } from '../packages/blokd/src/server.js';

describe('runtime-aware components', () => {
  it('attaches runtime metadata to universal components', () => {
    const Card = defineComponent((props: { title: string }) => jsx('section', { children: props.title }));
    expect(componentRuntime(Card)).toBe('universal');
    expect(renderToString(() => jsx(Card, { title: 'Hello' }))).toBe('<section>Hello</section>');
  });

  it('renders server components on the server runtime', () => {
    const Secret = serverComponent(() => jsx('p', { children: 'server only' }));
    expect(isServerRuntime()).toBe(true);
    expect(componentRuntime(Secret)).toBe('server');
    expect(renderToString(() => jsx(Secret, {}))).toBe('<p>server only</p>');
  });

  it('renders client component fallback during SSR', () => {
    const Picker = clientComponent(
      (props: { value: string }) => jsx('button', { children: props.value }),
      { fallback: props => jsx('span', { 'data-client-placeholder': true, children: props.value }) }
    );
    expect(componentRuntime(Picker)).toBe('browser');
    expect(renderToString(() => jsx(Picker, { value: 'Choose' }))).toBe('<span data-client-placeholder>Choose</span>');
  });
});
