import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { memo, runWithEffectsDisabled, signal } from '../packages/blokd/src/core.js';
import { createPages, matchRoute, type RouteEntry } from '../packages/blokd/src/hono.js';
import { jsx } from '../packages/blokd/src/jsx-runtime.js';
import { httpError, json, redirect, renderToString, safeJsonScript } from '../packages/blokd/src/server.js';
import { assertNoDuplicateRoutes } from '../packages/blokd/src/vite.js';
import { resumable } from '../packages/blokd/src/resume.js';

describe('production hardening', () => {
  it('computes memos during SSR with effects disabled', () => {
    const [count] = signal(2);
    const value = runWithEffectsDisabled(() => {
      const doubled = memo(() => count() * 2);
      return doubled();
    });
    expect(value).toBe(4);
  });

  it('does not duplicate dependencies when a signal is read more than once in an effect', () => {
    const [count, setCount] = signal(0);
    const seen: number[] = [];
    memo(() => count() + count());
    const dispose = (() => {
      const [local, setLocal] = signal(0);
      setLocal(count());
      return () => local();
    })();
    setCount(1);
    seen.push(dispose());
    expect(seen).toEqual([0]);
  });

  it('serializes undefined JSON as null and escapes script-breakout payloads', async () => {
    expect(await json(undefined).text()).toBe('null');
    expect(safeJsonScript({ x: '</script><script>alert(1)</script>' })).not.toContain('</script>');
    expect(safeJsonScript({ x: '\u2028\u2029<' })).toContain('\\u2028\\u2029\\u003c');
  });

  it('rejects unsafe redirect status codes and header injection', () => {
    expect(() => redirect('/ok', 303)).toThrow();
    try { redirect('/ok', 303); } catch (error) { expect((error as any).response.status).toBe(303); }
    expect(() => redirect('/bad\r\nX-Test: yes')).toThrow();
    expect(() => httpError(302)).toThrow();
  });

  it('blocks direct innerHTML on server render', () => {
    expect(() => renderToString(() => jsx('div', { innerHTML: '<img>' }))).toThrow(/innerHTML/);
  });

  it('keeps class and classList classes during SSR', () => {
    const out = renderToString(() => jsx('div', { class: 'card', classList: { active: true, hidden: false } }));
    expect(out).toContain('class="card active"');
  });

  it('handles malformed encoded route params as no match instead of crashing', () => {
    const routes = [{ id: 'post', path: '/posts/:slug', module: async () => ({}) }] satisfies RouteEntry[];
    expect(matchRoute(routes, '/posts/%E0%A4%A')).toBe(null);
  });

  it('rejects duplicate generated routes', () => {
    expect(() => assertNoDuplicateRoutes('/app/src/routes', [
      '/app/src/routes/posts.tsx',
      '/app/src/routes/posts/index.tsx'
    ])).toThrow(/Duplicate Blokd route/);
  });

  it('handles HEAD without a response body', async () => {
    const routes: RouteEntry[] = [{ id: 'index', path: '/', module: async () => ({ default: () => jsx('h1', { children: 'Hello' }) }) }];
    const app = new Hono();
    app.route('/', createPages({ routes }));
    const res = await app.request('http://x/', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  it('rejects dangerous resumable refs', () => {
    expect(() => resumable('javascript:alert(1)#run')).toThrow(/Unsafe/);
    expect(() => resumable('data:text/javascript,alert(1)#run')).toThrow(/Unsafe/);
    expect(() => resumable('blob:https://example.com/id#run')).toThrow(/Unsafe/);
  });
});
