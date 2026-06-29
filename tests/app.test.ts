import { describe, expect, it } from 'vitest';
import { defineAction, defineHeaders, defineLoader, defineMeta, defineRoute, formString, formStrings, readForm } from '../packages/blokd/src/app.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';

describe('app primitives', () => {
  it('keeps route helper functions as zero-runtime identity wrappers', async () => {
    const loader = defineLoader(() => ({ user: 'Ada' }));
    const action = defineAction(() => ({ ok: true }));
    const meta = defineMeta(({ data }) => ({ title: String(data.user) }));
    const headers = defineHeaders(() => ({ 'cache-control': 'no-store' }));
    const route = defineRoute({
      loader,
      action,
      meta,
      headers,
      default: ({ data }: any) => jsx('h1', { children: data.user })
    });

    expect(route.loader).toBe(loader);
    expect(route.action).toBe(action);
    expect(await route.loader?.({ request: new Request('http://x'), params: {}, ctx: {} as any })).toEqual({ user: 'Ada' });
    expect(await route.action?.({ request: new Request('http://x'), params: {}, ctx: {} as any })).toEqual({ ok: true });
    expect(await route.meta?.({ request: new Request('http://x'), params: {}, ctx: {} as any, data: { user: 'Ada' } })).toEqual({ title: 'Ada' });
    expect(await route.headers?.({ request: new Request('http://x'), params: {}, ctx: {} as any, data: {} })).toEqual({ 'cache-control': 'no-store' });
  });

  it('reads native form data into single and repeated fields', async () => {
    const body = new URLSearchParams();
    body.set('email', ' person@example.com ');
    body.append('tag', ' alpha ');
    body.append('tag', ' beta ');
    const request = new Request('http://x/contact', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    });

    const form = await readForm(request);
    expect(formString(form, 'email')).toBe('person@example.com');
    expect(formStrings(form, 'tag')).toEqual(['alpha', 'beta']);
    expect(() => formString(form, 'missing', { required: true })).toThrow(/Missing required form field "missing"/);
  });
});
