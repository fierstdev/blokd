import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const templates = ['minimal', 'forms', 'dashboard', 'marketing'] as const;
const blokdVersion = JSON.parse(readFileSync(join(root, 'packages/blokd/package.json'), 'utf8')).version;

describe('create-blokd templates', () => {
  it('ships supported templates with required project files', () => {
    for (const template of templates) {
      const dir = join(root, 'packages/create-blokd/templates', template);
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

      expect(pkg.scripts).toEqual({
        dev: 'node scripts/dev.mjs',
        build: 'vite build',
        typecheck: 'tsc --noEmit'
      });
      expect(pkg.dependencies.blokd).toBe(blokdVersion);
      expect(existsSync(join(dir, 'src/server.ts'))).toBe(true);
      expect(existsSync(join(dir, 'scripts/dev.mjs'))).toBe(true);
      expect(existsSync(join(dir, 'src/blokd-env.d.ts'))).toBe(true);
      expect(existsSync(join(dir, 'vite.config.ts'))).toBe(true);
      expect(existsSync(join(dir, 'tsconfig.json'))).toBe(true);
    }
  });

  it('keeps template-specific route examples available', () => {
    expect(existsSync(join(root, 'packages/create-blokd/templates/forms/src/routes/newsletter.tsx'))).toBe(true);
    expect(existsSync(join(root, 'packages/create-blokd/templates/dashboard/src/routes/reports.tsx'))).toBe(true);
    expect(existsSync(join(root, 'packages/create-blokd/templates/dashboard/src/resumables/status.ts'))).toBe(true);
    expect(existsSync(join(root, 'packages/create-blokd/templates/marketing/src/routes/pricing.tsx'))).toBe(true);
  });
});
