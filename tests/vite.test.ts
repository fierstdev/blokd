import { describe, expect, it } from 'vitest';
import { fileToRoutePath, segmentToPath } from '../packages/blokd/src/vite.js';

describe('vite route conventions', () => {
  it('converts route segments', () => {
    expect(segmentToPath('index')).toBe('');
    expect(segmentToPath('[slug]')).toBe(':slug');
    expect(segmentToPath('[...path]')).toBe(':path*');
    expect(segmentToPath('(marketing)')).toBe('');
  });

  it('converts files to route paths', () => {
    expect(fileToRoutePath('/app/src/routes', '/app/src/routes/index.tsx')).toBe('/');
    expect(fileToRoutePath('/app/src/routes', '/app/src/routes/posts/[slug].tsx')).toBe('/posts/:slug');
    expect(fileToRoutePath('/app/src/routes', '/app/src/routes/(docs)/[...path].tsx')).toBe('/:path*');
  });
});
