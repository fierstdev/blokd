import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    __blokdResumeTest?: {
      register(ref: string, handler: (event: Event, ctx: any) => unknown): void;
      unregister(ref: string): void;
      start(options?: {
        root?: Document | Element;
        events?: readonly string[];
        allowRef?: (ref: string) => boolean;
        onError?: (error: unknown, ctx: any) => void;
      }): () => void;
    };
    __resumeCount?: number;
    __resumeErrors?: string[];
    __resumeDisposeA?: () => void;
    __resumeDisposeB?: () => void;
  }
}

async function loadResumeControls(page: Page) {
  await page.goto('/menu');
  await page.addScriptTag({ url: '/assets/resume-test-controls.js', type: 'module' });
  await page.waitForFunction(() => Boolean(window.__blokdResumeTest));
}

test('restaurant estimator resumes on input without full hydration', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await expect(page.locator('[data-blokd-island="private-dining-estimator"]')).toBeVisible();
  await expect(page.locator('[data-estimate-output]')).toContainText('12 guests');

  const input = page.locator('[data-blokd-oninput]').first();
  await input.evaluate((node: HTMLInputElement) => {
    node.value = '18';
    node.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
  });

  await expect(page.locator('[data-estimate-output]')).toContainText('18 guests');
  await expect(page.locator('[data-estimate-output]')).toContainText('$1350');
  expect(errors).toEqual([]);
});

test('island state is isolated across multiple islands', async ({ page }) => {
  await loadResumeControls(page);
  await page.setContent(`
    <div id="root">
      <div id="a" data-blokd-island="counter-a" data-blokd-state="{&quot;count&quot;:0}">
        <button data-blokd-onclick="test#increment">0</button>
      </div>
      <div id="b" data-blokd-island="counter-b" data-blokd-state="{&quot;count&quot;:10}">
        <button data-blokd-onclick="test#increment">10</button>
      </div>
    </div>
  `);
  await page.evaluate(() => {
    window.__resumeErrors = [];
    window.__blokdResumeTest!.register('test#increment', (_event, ctx) => {
      ctx.state.count = Number(ctx.state.count ?? 0) + 1;
      ctx.element.textContent = String(ctx.state.count);
    });
    window.__resumeDisposeA = window.__blokdResumeTest!.start({
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: () => true,
      onError(error) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  await page.locator('#a button').click();
  await expect(page.locator('#a button')).toHaveText('1');
  await expect(page.locator('#b button')).toHaveText('10');
  await expect.poll(() => page.evaluate(() => document.getElementById('b')!.getAttribute('data-blokd-state'))).toBe('{"count":10}');
  expect(await page.evaluate(() => window.__resumeErrors)).toEqual([]);
});

test('handler context uses the bound element and persistent nearest island state', async ({ page }) => {
  await loadResumeControls(page);
  await page.setContent(`
    <div id="root">
      <div id="outer" data-blokd-island="outer" data-blokd-state="{&quot;count&quot;:40}">
        <div id="inner" data-blokd-island="inner" data-blokd-state="{&quot;count&quot;:0}">
          <button id="bound" data-blokd-onclick="test#context">
            Count: <span id="label">0</span>
          </button>
        </div>
      </div>
    </div>
  `);
  await page.evaluate(() => {
    window.__resumeErrors = [];
    (window as any).__resumeContexts = [];
    window.__blokdResumeTest!.register('test#context', (event, ctx) => {
      (window as any).__resumeContexts.push({
        elementId: ctx.element.id,
        islandId: ctx.island?.id ?? null,
        currentTargetId: event.currentTarget instanceof Element ? event.currentTarget.id : null,
        stateCount: ctx.state.count
      });
      ctx.state.count = Number(ctx.state.count) + 1;
      ctx.element.textContent = `Count: ${ctx.state.count}`;
    });
    window.__resumeDisposeA = window.__blokdResumeTest!.start({
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: () => true,
      onError(error) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  await page.locator('#label').click();
  await expect(page.locator('#bound')).toHaveText('Count: 1');
  await page.locator('#bound').click();
  await expect(page.locator('#bound')).toHaveText('Count: 2');
  expect(await page.evaluate(() => (window as any).__resumeContexts)).toEqual([
    { elementId: 'bound', islandId: 'inner', currentTargetId: 'root', stateCount: 0 },
    { elementId: 'bound', islandId: 'inner', currentTargetId: 'root', stateCount: 1 }
  ]);
  expect(await page.evaluate(() => window.__resumeErrors)).toEqual([]);
});

test('handler outside an island receives null island and a fresh empty state object', async ({ page }) => {
  await loadResumeControls(page);
  await page.setContent('<div id="root"><button id="outside" data-blokd-onclick="test#outside">Run</button></div>');
  await page.evaluate(() => {
    window.__resumeErrors = [];
    (window as any).__outsideContexts = [];
    window.__blokdResumeTest!.register('test#outside', (_event, ctx) => {
      (window as any).__outsideContexts.push({
        island: ctx.island,
        keys: Object.keys(ctx.state)
      });
      ctx.state.count = Number(ctx.state.count ?? 0) + 1;
      ctx.element.textContent = String(ctx.state.count);
    });
    window.__resumeDisposeA = window.__blokdResumeTest!.start({
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: () => true,
      onError(error) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  await page.locator('#outside').click();
  await expect(page.locator('#outside')).toHaveText('1');
  await page.locator('#outside').click();
  await expect(page.locator('#outside')).toHaveText('1');
  expect(await page.evaluate(() => (window as any).__outsideContexts)).toEqual([
    { island: null, keys: [] },
    { island: null, keys: [] }
  ]);
  expect(await page.evaluate(() => window.__resumeErrors)).toEqual([]);
});

test('missing handler exports fail through onError without crashing the page', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await loadResumeControls(page);
  await page.setContent(`
    <div id="root">
      <button id="missing" data-blokd-onclick="/assets/resume-test-controls.js#missingExport">Broken</button>
      <p id="alive">alive</p>
    </div>
  `);
  await page.evaluate(() => {
    window.__resumeErrors = [];
    window.__resumeDisposeA = window.__blokdResumeTest!.start({
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: () => true,
      onError(error) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  await page.locator('#missing').click();
  await page.waitForFunction(() => window.__resumeErrors?.length === 1);
  await expect(page.locator('#alive')).toHaveText('alive');
  expect(await page.evaluate(() => window.__resumeErrors?.[0])).toContain('was not found');
  expect(await page.evaluate(() => window.__resumeErrors?.[0])).toContain('/assets/resume-test-controls.js#missingExport');
  expect(pageErrors).toEqual([]);
});

test('failed handler imports include the resumable ref and do not crash the page', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await loadResumeControls(page);
  await page.setContent('<div id="root"><button id="missing-module" data-blokd-onclick="/assets/not-found.js#missing">Broken</button></div>');
  await page.evaluate(() => {
    window.__resumeErrors = [];
    window.__resumeDisposeA = window.__blokdResumeTest!.start({
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: () => true,
      onError(error) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  await page.locator('#missing-module').click();
  await page.waitForFunction(() => window.__resumeErrors?.length === 1);
  expect(await page.evaluate(() => window.__resumeErrors?.[0])).toContain('Failed to import Blokd resumable handler "/assets/not-found.js#missing"');
  expect(pageErrors).toEqual([]);
});

test('allowRef can deny refs before handlers run', async ({ page }) => {
  await loadResumeControls(page);
  await page.setContent('<div id="root"><button id="blocked" data-blokd-onclick="test#blocked">Blocked</button></div>');
  await page.evaluate(() => {
    window.__resumeCount = 0;
    window.__resumeErrors = [];
    window.__blokdResumeTest!.register('test#blocked', () => {
      window.__resumeCount! += 1;
    });
    window.__resumeDisposeA = window.__blokdResumeTest!.start({
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: ref => ref !== 'test#blocked',
      onError(error) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    });
  });

  await page.locator('#blocked').click();
  await page.waitForFunction(() => window.__resumeErrors?.length === 1);
  expect(await page.evaluate(() => window.__resumeCount)).toBe(0);
  expect(await page.evaluate(() => window.__resumeErrors?.[0])).toContain('allowRef');
});

test('duplicate startResumability calls do not duplicate delegated handlers', async ({ page }) => {
  await loadResumeControls(page);
  await page.setContent('<div id="root"><button id="dupe" data-blokd-onclick="test#dupe">Run</button></div>');
  await page.evaluate(() => {
    window.__resumeCount = 0;
    window.__resumeErrors = [];
    window.__blokdResumeTest!.register('test#dupe', () => {
      window.__resumeCount! += 1;
    });
    const options = {
      root: document.getElementById('root')!,
      events: ['click'],
      allowRef: () => true,
      onError(error: unknown) {
        window.__resumeErrors!.push(error instanceof Error ? error.message : String(error));
      }
    };
    window.__resumeDisposeA = window.__blokdResumeTest!.start(options);
    window.__resumeDisposeB = window.__blokdResumeTest!.start(options);
  });

  await page.locator('#dupe').click();
  await expect.poll(() => page.evaluate(() => window.__resumeCount)).toBe(1);
  expect(await page.evaluate(() => window.__resumeErrors)).toEqual([]);

  await page.evaluate(() => {
    window.__resumeDisposeA?.();
    window.__resumeDisposeB?.();
  });
  await page.locator('#dupe').click();
  expect(await page.evaluate(() => window.__resumeCount)).toBe(1);
});

test('static menu route omits client entry script', async ({ page }) => {
  await page.goto('/menu');
  await expect(page.locator('h1')).toHaveText('Menu');
  const clientScripts = await page.locator('script[src="/assets/client.js"]').count();
  expect(clientScripts).toBe(0);
});

test('home route includes client entry because it has a resumable island', async ({ page }) => {
  await page.goto('/');
  const clientScripts = await page.locator('script[src="/assets/client.js"]').count();
  expect(clientScripts).toBe(1);
});

test('compiler-assisted island resumes through generated route-local entry', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/counter');
  await expect(page.locator('[data-blokd-island="Counter"]')).toBeVisible();
  await expect(page.locator('[data-counter-button]')).toHaveText(/Count:\s*0/);
  await expect(page.locator('script[src="/assets/blokd-route-counter.js"]')).toHaveCount(1);
  await expect(page.locator('script[src="/assets/client.js"]')).toHaveCount(0);

  await page.locator('[data-counter-button]').click();
  await expect(page.locator('[data-counter-button]')).toHaveText(/Count:\s*1/);
  await page.locator('[data-counter-button]').click();
  await expect(page.locator('[data-counter-button]')).toHaveText(/Count:\s*2/);
  expect(errors).toEqual([]);
});
